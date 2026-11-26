// Passphrase-encrypted backup file for a teacher's class records (.kyosil).
// PBKDF2-SHA256 (600,000 rounds, OWASP 2023) → AES-256-GCM. Nothing leaves the device unless the
// teacher saves the file; without the passphrase the file is unreadable.
import type { RecordEvent } from "./engine";

export interface RecordsSnapshot {
  app: "kyosil-itda";
  kind: "records";
  version: 1;
  classId: string;
  exportedAt: string;
  events: RecordEvent[];
}

interface Envelope { format: "kyosil-backup"; v: 1; kdf: "PBKDF2-SHA256"; iter: number; salt: string; iv: string; data: string }

const ITER = 600_000;
const enc = new TextEncoder(), dec = new TextDecoder();
const b64 = (u: Uint8Array) => btoa(String.fromCharCode(...u));
const unb64 = (s: string) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));

async function keyFrom(pass: string, salt: Uint8Array, iter: number) {
  const base = await crypto.subtle.importKey("raw", enc.encode(pass.normalize("NFC")), "PBKDF2", false, ["deriveKey"]);
  return crypto.subtle.deriveKey({ name: "PBKDF2", hash: "SHA-256", salt: salt as BufferSource, iterations: iter }, base, { name: "AES-GCM", length: 256 }, false, ["encrypt", "decrypt"]);
}

export function checkPassphrase(p: string) {
  if (p.length < 10) return "암호는 10자 이상으로 정해 주세요.";
  if (/^(\d)\1+$|^1234|password|qwer/i.test(p)) return "추측하기 쉬운 암호입니다.";
  return "";
}

export async function sealBackup(snap: RecordsSnapshot, pass: string, iter = ITER): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(16)), iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await keyFrom(pass, salt, iter);
  const ct = new Uint8Array(await crypto.subtle.encrypt({ name: "AES-GCM", iv, additionalData: enc.encode("kyosil-backup/v1") }, key, enc.encode(JSON.stringify(snap))));
  // chunked base64 so large backups do not overflow the call stack
  let data = "";
  for (let i = 0; i < ct.length; i += 0x8000) data += String.fromCharCode(...ct.subarray(i, i + 0x8000));
  const env: Envelope = { format: "kyosil-backup", v: 1, kdf: "PBKDF2-SHA256", iter, salt: b64(salt), iv: b64(iv), data: btoa(data) };
  return JSON.stringify(env);
}

export async function openBackup(file: string, pass: string): Promise<RecordsSnapshot> {
  let env: Envelope;
  try {
    env = JSON.parse(file);
  } catch {
    throw Error("교실잇다 백업 파일이 아닙니다.");
  }
  if (env?.format !== "kyosil-backup" || env.v !== 1 || typeof env.data !== "string") throw Error("교실잇다 백업 파일이 아닙니다.");
  if (!Number.isInteger(env.iter) || env.iter < 100_000 || env.iter > 5_000_000) throw Error("백업 파일 형식이 올바르지 않습니다.");
  const key = await keyFrom(pass, unb64(env.salt), env.iter);
  let plain: ArrayBuffer;
  try {
    plain = await crypto.subtle.decrypt({ name: "AES-GCM", iv: unb64(env.iv) as BufferSource, additionalData: enc.encode("kyosil-backup/v1") }, key, unb64(env.data) as BufferSource);
  } catch {
    throw Error("암호가 맞지 않거나 파일이 손상되었습니다.");
  }
  const snap = JSON.parse(dec.decode(plain)) as RecordsSnapshot;
  if (snap?.app !== "kyosil-itda" || snap.kind !== "records" || !Array.isArray(snap.events)) throw Error("학생 기록 백업이 아닙니다.");
  const ok = new Set(["rec.roster", "rec.obs", "rec.counsel", "rec.draft"]);
  snap.events = snap.events.filter((e) => e && ok.has(e.type)).slice(0, 20_000);
  return snap;
}
