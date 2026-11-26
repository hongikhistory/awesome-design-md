// Device key storage. CryptoKey objects are structured-cloneable, so IndexedDB can
// hold a non-extractable private key: the page can use it but never read its bytes.

import { createDeviceKeys, type DeviceKeys } from "./crypto";

const DB = "kyosil-device";
const STORE = "keys";
const mem = new Map<string, DeviceKeys>(); // fallback (private mode / blocked IDB)

function open(): Promise<IDBDatabase | null> {
  return new Promise((resolve) => {
    try {
      const req = indexedDB.open(DB, 1);
      req.onupgradeneeded = () => req.result.createObjectStore(STORE);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
}

async function get(id: string): Promise<DeviceKeys | undefined> {
  if (mem.has(id)) return mem.get(id);
  const db = await open();
  if (!db) return undefined;
  return new Promise((resolve) => {
    const req = db.transaction(STORE).objectStore(STORE).get(id);
    req.onsuccess = () => {
      if (req.result) mem.set(id, req.result as DeviceKeys);
      resolve(req.result as DeviceKeys | undefined);
    };
    req.onerror = () => resolve(undefined);
  });
}

async function put(id: string, keys: DeviceKeys) {
  mem.set(id, keys);
  const db = await open();
  if (!db) return;
  await new Promise<void>((resolve) => {
    const tx = db.transaction(STORE, "readwrite");
    tx.objectStore(STORE).put(keys, id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => resolve();
  });
}

export async function deviceKeys(id: string): Promise<DeviceKeys> {
  const existing = await get(id);
  if (existing) return existing;
  const created = await createDeviceKeys();
  await put(id, created);
  return created;
}

export async function clearDeviceKeys() {
  mem.clear();
  const db = await open();
  if (!db) return;
  await new Promise<void>((resolve) => {
    const tx = db.transaction(STORE, "readwrite");
    tx.objectStore(STORE).clear();
    tx.oncomplete = () => resolve();
    tx.onerror = () => resolve();
  });
}
