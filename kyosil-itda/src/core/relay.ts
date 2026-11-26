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

// One storage key per record (envelope, room, public key). Writers never read-modify-write
// a shared blob, so concurrent tabs cannot overwrite each other's appends.
// (v1 kept everything in one key and lost writes under concurrency; see docs/REVIEW.md D1.)
const PREFIX = "kyosil:v2:";
const K = { dir: `${PREFIX}d:`, room: `${PREFIX}r:`, env: `${PREFIX}e:` };
const memory = new Map<string, string>(); // fallback when storage is unavailable

function store(): Storage | null {
  try {
    const s = globalThis.localStorage;
    if (!s) return null;
    s.getItem(PREFIX); // throws when blocked
    return s;
  } catch {
    return null;
  }
}

function put(key: string, value: unknown) {
  const raw = JSON.stringify(value);
  memory.set(key, raw);
  try {
    store()?.setItem(key, raw);
  } catch {
    /* quota or privacy mode: keep in memory */
  }
}

function remove(key: string) {
  memory.delete(key);
  try {
    store()?.removeItem(key);
  } catch {
    /* ignore */
  }
}

function entries(): [string, string][] {
  const s = store();
  if (!s) return [...memory.entries()].filter(([k]) => k.startsWith(PREFIX));
  const out: [string, string][] = [];
  for (let i = 0; i < s.length; i++) {
    const k = s.key(i);
    if (k?.startsWith(PREFIX)) out.push([k, s.getItem(k) ?? "null"]);
  }
  return out;
}

function load(): RelayState {
  const state: RelayState = { version: 1, directory: {}, rooms: [], envelopes: [] };
  for (const [k, raw] of entries()) {
    try {
      const v = JSON.parse(raw);
      if (!v) continue;
      if (k.startsWith(K.dir)) state.directory[k.slice(K.dir.length)] = v;
      else if (k.startsWith(K.room)) state.rooms.push(v);
      else if (k.startsWith(K.env)) state.envelopes.push(v);
    } catch {
      /* skip corrupt record */
    }
  }
  state.rooms.sort((a, b) => a.createdAt - b.createdAt || a.roomId.localeCompare(b.roomId));
  state.envelopes.sort((a, b) => a.at - b.at || a.id.localeCompare(b.id));
  return state;
}

function changed() {
  channel?.postMessage({ type: "changed" });
  for (const fn of listeners) fn();
}

const channel: BroadcastChannel | null = typeof BroadcastChannel !== "undefined" ? new BroadcastChannel("kyosil-relay") : null;
const listeners = new Set<() => void>();
channel?.addEventListener("message", () => {
  for (const fn of listeners) fn();
});
if (typeof window !== "undefined")
  window.addEventListener("storage", (e) => {
    if (e.key === null || e.key.startsWith(PREFIX)) for (const fn of listeners) fn();
  });

export const relay = {
  snapshot: load,
  subscribe(fn: () => void): () => void {
    listeners.add(fn);
    return () => {
      listeners.delete(fn);
    };
  },
  publishKey(personId: string, jwk: PublicIdentity) {
    put(K.dir + personId, jwk);
    changed();
  },
  upsertRoom(room: RoomRecord) {
    put(K.room + room.roomId, room);
    changed();
  },
  append(env: Envelope) {
    put(K.env + env.id, env);
    changed();
  },
  appendMany(envs: Envelope[]) {
    for (const e of envs) put(K.env + e.id, e);
    changed();
  },
  /** Demo only: put an attacker-crafted envelope on the relay (tamper / impersonation tests). */
  inject(env: Envelope) {
    put(K.env + env.id, env);
    changed();
  },
  /** Drop expired workspaces and their ciphertext (retention policy). */
  sweep(now = Date.now()) {
    const s = load();
    const dead = new Set(s.rooms.filter((r) => r.expiresAt && r.expiresAt < now).map((r) => r.roomId));
    if (!dead.size) return 0;
    for (const id of dead) remove(K.room + id);
    for (const e of s.envelopes) if (dead.has(e.roomId)) remove(K.env + e.id);
    changed();
    return dead.size;
  },
  reset() {
    for (const [k] of entries()) remove(k);
    try {
      store()?.removeItem("kyosil:relay:v1"); // legacy single-blob store
    } catch {
      /* ignore */
    }
    changed();
  },
};
