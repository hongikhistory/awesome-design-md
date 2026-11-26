// Client engine: turns relay ciphertext into the current user's readable event log.

import type { WorkflowEvent } from "./approval";
import {
  createRoomKey,
  decryptJson,
  encryptJson,
  signEnvelope,
  unwrapRoomKey,
  verifyEnvelope,
  wrapRoomKey,
  type WrappedKey,
} from "./crypto";
import { deviceKeys } from "./keystore";
import type { Note, Scores, Session, TagKey } from "./practicum";
import { relay, type Envelope, type RelayState, type RoomKind, type RoomRecord } from "./relay";
import type { WidgetOp } from "./widgets";

export type PracticumEvent =
  | ({ type: "prac.session" } & Session)
  | ({ type: "prac.note" } & Note)
  | { type: "prac.score"; sessionId: string; by: "mentor" | "self"; scores: Scores }
  | { type: "prac.feedback"; sessionId: string; glow: string; grow: string; next: string }
  | { type: "prac.reflect"; sessionId: string; text: string }
  /** planning conference: what the student teacher wants observed */
  | { type: "prac.focus"; sessionId: string; tags: TagKey[]; question: string };

export type AppEvent = { type: "msg"; text: string } | { type: "system"; text: string } | WidgetOp | WorkflowEvent | PracticumEvent;

export interface Decrypted {
  id: string;
  roomId: string;
  sender: string;
  at: number;
  epoch: number;
  payload: AppEvent;
}

export interface RoomView {
  room: RoomRecord;
  events: Decrypted[];
  /** envelopes the current user cannot read: joined later, removed, or failed signature/authentication */
  unreadable: number;
}

const uid = () => globalThis.crypto.randomUUID();
export const MAX_SKEW_MS = 5 * 60_000;
const ctx = (roomId: string, epoch: number) => `${roomId}#${epoch}`;
const aadOf = (e: Pick<Envelope, "roomId" | "epoch" | "sender" | "id">) => `${e.roomId}|${e.epoch}|${e.sender}|${e.id}`;

const keyCache = new Map<string, CryptoKey>(); // `${me}:${roomId}#${epoch}`
const plainCache = new Map<string, Decrypted | null>(); // `${me}:${envelopeId}` (null = unreadable)

export async function enrol(personIds: string[]) {
  const dir = relay.snapshot().directory;
  for (const id of personIds) {
    const k = await deviceKeys(id);
    if (!dir[id] || dir[id].ecdh.x !== k.publicJwk.x) relay.publishKey(id, { ecdh: k.publicJwk, ecdsa: k.verifyJwk });
  }
}

async function wrapFor(roomId: string, epoch: number, key: CryptoKey, wrapperId: string, members: string[], state: RelayState) {
  const own = await deviceKeys(wrapperId);
  const out: Record<string, WrappedKey> = {};
  for (const m of members) {
    const pub = state.directory[m];
    if (!pub) throw Error(`${m}의 공개키가 등록되지 않았습니다.`);
    out[m] = await wrapRoomKey(key, wrapperId, own.privateKey, pub.ecdh, ctx(roomId, epoch));
  }
  return out;
}

export async function createRoom(opts: { name: string; kind: RoomKind; members: string[]; by: string; expiresAt?: number; roomId?: string }) {
  const state = relay.snapshot();
  const roomId = opts.roomId ?? `room_${uid().slice(0, 8)}`;
  const members = [...new Set([opts.by, ...opts.members])];
  const key = await createRoomKey();
  const room: RoomRecord = {
    roomId,
    name: opts.name,
    kind: opts.kind,
    members,
    epoch: 1,
    keys: { "1": await wrapFor(roomId, 1, key, opts.by, members, state) },
    createdBy: opts.by,
    createdAt: Date.now(),
    expiresAt: opts.expiresAt,
  };
  relay.upsertRoom(room);
  return room;
}

/** Membership change rotates the room key: removed members cannot read anything new. */
export async function changeMembers(roomId: string, by: string, members: string[]) {
  const state = relay.snapshot();
  const room = state.rooms.find((r) => r.roomId === roomId);
  if (!room || !room.members.includes(by)) throw Error("방 구성원만 참여자를 바꿀 수 있습니다.");
  const next = room.epoch + 1;
  const list = [...new Set([by, ...members])];
  const key = await createRoomKey();
  const updated: RoomRecord = { ...room, members: list, epoch: next, keys: { ...room.keys, [String(next)]: await wrapFor(roomId, next, key, by, list, state) } };
  relay.upsertRoom(updated);
  await post(roomId, by, { type: "system", text: `참여자 변경 · 새 암호 키(${next}세대)로 교체` });
  return updated;
}

async function roomKey(me: string, room: RoomRecord, epoch: number, state: RelayState): Promise<CryptoKey | null> {
  const cacheKey = `${me}:${ctx(room.roomId, epoch)}`;
  const hit = keyCache.get(cacheKey);
  if (hit) return hit;
  const w = room.keys[String(epoch)]?.[me];
  const wrapper = w && state.directory[w.from];
  if (!w || !wrapper) return null;
  try {
    const own = await deviceKeys(me);
    const k = await unwrapRoomKey(w, own.privateKey, wrapper.ecdh, ctx(room.roomId, epoch));
    keyCache.set(cacheKey, k);
    return k;
  } catch {
    return null;
  }
}

export async function post(roomId: string, me: string, payload: AppEvent, at = Date.now()) {
  const env = await seal(roomId, me, payload, at);
  relay.append(env);
  return env;
}

export async function seal(roomId: string, me: string, payload: AppEvent, at = Date.now()): Promise<Envelope> {
  const state = relay.snapshot();
  const room = state.rooms.find((r) => r.roomId === roomId);
  if (!room) throw Error("대화방을 찾을 수 없습니다.");
  if (!room.members.includes(me)) throw Error("이 방의 구성원이 아닙니다.");
  const key = await roomKey(me, room, room.epoch, state);
  if (!key) throw Error("이 기기에서 방 키를 열 수 없습니다.");
  const head = { id: uid(), roomId, epoch: room.epoch, sender: me };
  const c = await encryptJson(key, payload, aadOf(head));
  const sig = await signEnvelope((await deviceKeys(me)).signKey, aadOf(head), c);
  return { ...head, at, ...c, sig };
}

export async function readAll(me: string): Promise<RoomView[]> {
  const state = relay.snapshot();
  const views: RoomView[] = [];
  for (const room of state.rooms) {
    if (!room.members.includes(me)) continue;
    const view: RoomView = { room, events: [], unreadable: 0 };
    for (const env of state.envelopes) {
      if (env.roomId !== room.roomId) continue;
      const ck = `${me}:${env.id}`;
      let d = plainCache.get(ck);
      if (d === undefined) {
        d = await open(me, room, env, state);
        // Do not cache "unreadable" forever: a key may arrive later.
        if (d) plainCache.set(ck, d);
      }
      if (d) view.events.push(d);
      else view.unreadable++;
    }
    view.events.sort((a, b) => a.at - b.at || a.id.localeCompare(b.id));
    views.push(view);
  }
  return views;
}

async function open(me: string, room: RoomRecord, env: Envelope, state: RelayState): Promise<Decrypted | null> {
  // Clients stamp their own events; refuse ones dated in the future (reorder/backdate attacks
  // still need a server timestamp in production — see docs/REVIEW.md D4).
  if (env.at > Date.now() + MAX_SKEW_MS) return null;
  const signer = state.directory[env.sender];
  if (!signer || !room.keys[String(env.epoch)]?.[env.sender]) return null; // sender must have been a member of that epoch
  if (!(await verifyEnvelope(signer.ecdsa, aadOf(env), env, env.sig))) return null;
  const key = await roomKey(me, room, env.epoch, state);
  if (!key) return null;
  try {
    const payload = await decryptJson<AppEvent>(key, env, aadOf(env));
    return { id: env.id, roomId: env.roomId, sender: env.sender, at: env.at, epoch: env.epoch, payload };
  } catch {
    return null;
  }
}

export function resetCaches() {
  keyCache.clear();
  plainCache.clear();
}
