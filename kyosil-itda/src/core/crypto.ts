// End-to-end encryption on the Web Crypto API only (no native module, no install).
//
// Model (intentionally small, documented trade-off for school-sized groups):
// - Each device owns an ECDH P-256 key pair. The private key is created with
//   extractable=false, so script cannot export it; IndexedDB stores the CryptoKey handle.
// - Each room has a random AES-256-GCM "room key" per epoch.
// - The room key is wrapped for every member with a key derived by ECDH(sender, member)
//   + HKDF-SHA-256. The relay stores only wrapped keys and ciphertext.
// - Every message is AES-GCM encrypted with a fresh 96-bit IV and authenticated
//   associated data (room, epoch, sender), so a relay cannot move a ciphertext
//   between rooms or forge the sender label without failing decryption.
// - Membership change => new epoch => new room key (removed members cannot read
//   new messages). Forward secrecy inside an epoch is NOT provided (MLS would).

const subtle = globalThis.crypto.subtle;
const enc = new TextEncoder();
const dec = new TextDecoder();

export type PublicJwk = JsonWebKey;

export interface DeviceKeys {
  privateKey: CryptoKey; // ECDH, non-extractable
  publicJwk: PublicJwk;
  signKey: CryptoKey; // ECDSA, non-extractable
  verifyJwk: PublicJwk;
}

export interface PublicIdentity {
  ecdh: PublicJwk;
  ecdsa: PublicJwk;
}

export interface WrappedKey {
  from: string; // wrapping member id (whose public key the recipient must use)
  iv: string;
  wrapped: string;
}

export interface Ciphertext {
  iv: string;
  ct: string;
}

export function b64(bytes: ArrayBuffer | Uint8Array): string {
  const u = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  let s = "";
  for (let i = 0; i < u.length; i++) s += String.fromCharCode(u[i]);
  return btoa(s);
}

export function unb64(s: string): Uint8Array<ArrayBuffer> {
  const bin = atob(s);
  const u = new Uint8Array(new ArrayBuffer(bin.length));
  for (let i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i);
  return u;
}

const ECDH = { name: "ECDH", namedCurve: "P-256" } as const;
const ECDSA = { name: "ECDSA", namedCurve: "P-256" } as const;
const SIG = { name: "ECDSA", hash: "SHA-256" } as const;

export async function createDeviceKeys(): Promise<DeviceKeys> {
  const pair = (await subtle.generateKey(ECDH, false, ["deriveKey", "deriveBits"])) as CryptoKeyPair;
  const sign = (await subtle.generateKey(ECDSA, false, ["sign", "verify"])) as CryptoKeyPair;
  return {
    privateKey: pair.privateKey,
    publicJwk: await subtle.exportKey("jwk", pair.publicKey),
    signKey: sign.privateKey,
    verifyJwk: await subtle.exportKey("jwk", sign.publicKey),
  };
}

/** Sender signature over the exact ciphertext + its associated data. */
export async function signEnvelope(key: CryptoKey, aad: string, c: Ciphertext): Promise<string> {
  return b64(await subtle.sign(SIG, key, enc.encode(`${aad}|${c.iv}|${c.ct}`)));
}

export async function verifyEnvelope(jwk: PublicJwk, aad: string, c: Ciphertext, sig: string): Promise<boolean> {
  try {
    const key = await subtle.importKey("jwk", jwk, ECDSA, false, ["verify"]);
    return await subtle.verify(SIG, key, unb64(sig), enc.encode(`${aad}|${c.iv}|${c.ct}`));
  } catch {
    return false;
  }
}

async function importPublic(jwk: PublicJwk): Promise<CryptoKey> {
  return subtle.importKey("jwk", jwk, ECDH, false, []);
}

/** ECDH shared secret -> HKDF -> AES-GCM key-encryption key, bound to the room/epoch. */
async function wrappingKey(own: CryptoKey, peer: PublicJwk, context: string): Promise<CryptoKey> {
  const bits = await subtle.deriveBits({ name: "ECDH", public: await importPublic(peer) }, own, 256);
  const ikm = await subtle.importKey("raw", bits, "HKDF", false, ["deriveKey"]);
  return subtle.deriveKey(
    { name: "HKDF", hash: "SHA-256", salt: enc.encode("kyosil-itda/v1"), info: enc.encode(context) },
    ikm,
    { name: "AES-GCM", length: 256 },
    false,
    ["wrapKey", "unwrapKey"],
  );
}

export async function createRoomKey(): Promise<CryptoKey> {
  // Extractable only so it can be wrapped; it never leaves the device unwrapped.
  return subtle.generateKey({ name: "AES-GCM", length: 256 }, true, ["encrypt", "decrypt"]);
}

export async function wrapRoomKey(
  roomKey: CryptoKey,
  ownId: string,
  own: CryptoKey,
  peer: PublicJwk,
  context: string,
): Promise<WrappedKey> {
  const iv = globalThis.crypto.getRandomValues(new Uint8Array(12));
  const kek = await wrappingKey(own, peer, context);
  const wrapped = await subtle.wrapKey("raw", roomKey, kek, { name: "AES-GCM", iv });
  return { from: ownId, iv: b64(iv), wrapped: b64(wrapped) };
}

export async function unwrapRoomKey(
  w: WrappedKey,
  own: CryptoKey,
  wrapperPublic: PublicJwk,
  context: string,
): Promise<CryptoKey> {
  const kek = await wrappingKey(own, wrapperPublic, context);
  return subtle.unwrapKey(
    "raw",
    unb64(w.wrapped),
    kek,
    { name: "AES-GCM", iv: unb64(w.iv) },
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"],
  );
}

export async function encryptJson(key: CryptoKey, value: unknown, aad: string): Promise<Ciphertext> {
  const iv = globalThis.crypto.getRandomValues(new Uint8Array(12));
  const ct = await subtle.encrypt(
    { name: "AES-GCM", iv, additionalData: enc.encode(aad) },
    key,
    enc.encode(JSON.stringify(value)),
  );
  return { iv: b64(iv), ct: b64(ct) };
}

export async function decryptJson<T>(key: CryptoKey, c: Ciphertext, aad: string): Promise<T> {
  const pt = await subtle.decrypt(
    { name: "AES-GCM", iv: unb64(c.iv), additionalData: enc.encode(aad) },
    key,
    unb64(c.ct),
  );
  return JSON.parse(dec.decode(pt)) as T;
}

/** Short human-comparable fingerprint of a public key (safety number). */
export async function fingerprint(jwk: PublicJwk): Promise<string> {
  const digest = await subtle.digest("SHA-256", enc.encode(`${jwk.x}.${jwk.y}`));
  const hex = [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
  return hex.slice(0, 20).replace(/(.{4})/g, "$1 ").trim().toUpperCase();
}
