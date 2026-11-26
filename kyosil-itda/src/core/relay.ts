// The "server" of the demo: a relay that only ever stores what a real server would see.
// Here it lives in localStorage and syncs tabs over BroadcastChannel, so the whole
// product runs from a static URL. A production relay would expose the same three
// collections over HTTPS (and WebRTC for same-school peers).

import type { Ciphertext, PublicIdentity, WrappedKey } from "./crypto";

export type RoomKind = "chat" | "workflow" | "practicum";

/** Everything here is visible to the relay operator, by design and on screen. */
export interface RoomRecord {
  roomId: string;
  name: string;
  kind: RoomKind;
  members: string[];
  epoch: number;
  /** epoch -> member -> wrapped room key */
  keys: Record<string, Record<string, WrappedKey>>;
  createdBy: string;
  createdAt: number;
  /** auto-deletion date for sensitive workspaces (ms epoch) */
  expiresAt?: number;
}

export interface Envelope extends Ciphertext {
  id: string;
  roomId: string;
  epoch: number;
  sender: string;
  at: number;
  sig: string; // ECDSA signature by sender's device
}

export interface RelayState {
  version: 1;
  directory: Record<string, PublicIdentity>;
  rooms: RoomRecord[];
  envelopes: Envelope[];
}

const KEY = "kyosil:relay:v1";
const empty = (): RelayState => ({ version: 1, directory: {}, rooms: [], envelopes: [] });

let memory: RelayState | null = null; // fallback when storage is unavailable

function load(): RelayState {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const v = JSON.parse(raw) as RelayState;
      if (v?.version === 1) return v;
    }
  } catch {
    /* storage blocked: stay in memory */
  }
  return memory ?? empty();
}

function save(s: RelayState) {
  memory = s;
  try {
    localStorage.setItem(KEY, JSON.stringify(s));
  } catch {
    /* quota or privacy mode: keep in memory */
  }
  channel?.postMessage({ type: "changed" });
  for (const fn of listeners) fn();
}

const channel: BroadcastChannel | null = typeof BroadcastChannel !== "undefined" ? new BroadcastChannel("kyosil-relay") : null;
const listeners = new Set<() => void>();
channel?.addEventListener("message", () => {
  memory = null;
  for (const fn of listeners) fn();
});
if (typeof window !== "undefined")
  window.addEventListener("storage", (e) => {
    if (e.key === KEY) for (const fn of listeners) fn();
  });

export const relay = {
  snapshot: load,
  subscribe(fn: () => void) {
    listeners.add(fn);
    return () => listeners.delete(fn);
  },
  publishKey(personId: string, jwk: PublicIdentity) {
    const s = load();
    s.directory[personId] = jwk;
    save(s);
  },
  upsertRoom(room: RoomRecord) {
    const s = load();
    s.rooms = [...s.rooms.filter((r) => r.roomId !== room.roomId), room];
    save(s);
  },
  append(env: Envelope) {
    const s = load();
    if (!s.envelopes.some((e) => e.id === env.id)) s.envelopes.push(env);
    save(s);
  },
  appendMany(envs: Envelope[]) {
    const s = load();
    const seen = new Set(s.envelopes.map((e) => e.id));
    for (const e of envs) if (!seen.has(e.id)) s.envelopes.push(e);
    save(s);
  },
  /** Drop expired workspaces and their ciphertext (retention policy). */
  sweep(now = Date.now()) {
    const s = load();
    const dead = new Set(s.rooms.filter((r) => r.expiresAt && r.expiresAt < now).map((r) => r.roomId));
    if (!dead.size) return 0;
    s.rooms = s.rooms.filter((r) => !dead.has(r.roomId));
    s.envelopes = s.envelopes.filter((e) => !dead.has(e.roomId));
    save(s);
    return dead.size;
  },
  reset() {
    memory = null;
    try {
      localStorage.removeItem(KEY);
    } catch {
      /* ignore */
    }
    save(empty());
  },
};
