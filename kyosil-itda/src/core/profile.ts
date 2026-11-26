// School and personal settings kept on this device only (no student data here).
// Tools read these as defaults so a teacher fills in the school once, not on every document.
import { useSyncExternalStore } from "react";
import { person } from "./school";

export type SchoolLevel = "중" | "고";

export interface SchoolProfile {
  school: string;
  level: SchoolLevel;
  /** e.g. 2026 */
  year: number;
  phone: string;
  /** small PNG/WebP data URL, ≤ 256px */
  logo?: string;
}

export interface MyProfile {
  dept: string;
  phone: string;
  /** homeroom, e.g. "2-1"; empty when not a 담임 */
  homeroom: string;
  photo?: string;
  /** the teacher's own name when the app is used for real (the demo keeps the persona name) */
  displayName?: string;
}

const SCHOOL_KEY = "kyosil:school";
const ME_KEY = (id: string) => `kyosil:profile:${id}`;
const EVT = "kyosil:profile";

export const defaultSchool = (): SchoolProfile => ({ school: "홍익중학교", level: "중", year: 2026, phone: "02-123-4567" });
export const defaultMe = (): MyProfile => ({ dept: "2학년부", phone: "", homeroom: "2-1" });

function read<T>(key: string, fallback: () => T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? { ...fallback(), ...JSON.parse(raw) } : fallback();
  } catch {
    return fallback();
  }
}

function write(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (e) {
    // Quota: a large photo or logo is the usual cause.
    throw Error(`저장하지 못했습니다(${(e as Error).name}). 더 작은 이미지를 써 주세요.`);
  }
  window.dispatchEvent(new Event(EVT));
}

// useSyncExternalStore needs a stable snapshot per change.
const cache = new Map<string, { raw: string | null; value: unknown }>();
function snapshot<T>(key: string, fallback: () => T): T {
  let raw: string | null = null;
  try {
    raw = localStorage.getItem(key);
  } catch {
    /* ignore */
  }
  const hit = cache.get(key);
  if (hit && hit.raw === raw) return hit.value as T;
  const value = read(key, fallback);
  cache.set(key, { raw, value });
  return value;
}

const subscribe = (cb: () => void) => {
  window.addEventListener(EVT, cb);
  window.addEventListener("storage", cb);
  return () => {
    window.removeEventListener(EVT, cb);
    window.removeEventListener("storage", cb);
  };
};

export const getSchool = () => snapshot(SCHOOL_KEY, defaultSchool);
export const saveSchool = (s: SchoolProfile) => write(SCHOOL_KEY, s);
export const getMe = (id: string) => snapshot(ME_KEY(id), defaultMe);
export const saveMe = (id: string, p: MyProfile) => write(ME_KEY(id), p);

export const useSchool = () => useSyncExternalStore(subscribe, getSchool);
export const useMyProfile = (id: string) => useSyncExternalStore(subscribe, () => getMe(id));

/** Read an image file, centre-crop to a square if asked, and shrink it to a small data URL. */
export async function imageToDataUrl(file: File, size = 256, square = true): Promise<string> {
  if (!/^image\/(png|jpeg|webp|gif|svg\+xml)$/.test(file.type)) throw Error("PNG, JPG, WebP, GIF, SVG 이미지만 쓸 수 있습니다.");
  if (file.size > 10 * 1024 * 1024) throw Error("10MB보다 작은 이미지를 골라 주세요.");
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((ok, bad) => {
      const i = new Image();
      i.onload = () => ok(i);
      i.onerror = () => bad(Error("이미지를 읽지 못했습니다."));
      i.src = url;
    });
    const w = img.naturalWidth || size, h = img.naturalHeight || size;
    const s = square ? Math.min(w, h) : Math.max(w, h);
    const scale = Math.min(1, size / s);
    const cw = Math.round((square ? s : w) * scale), ch = Math.round((square ? s : h) * scale);
    const c = document.createElement("canvas");
    c.width = cw;
    c.height = ch;
    const g = c.getContext("2d")!;
    if (square) g.drawImage(img, (w - s) / 2, (h - s) / 2, s, s, 0, 0, cw, ch);
    else g.drawImage(img, 0, 0, cw, ch);
    return c.toDataURL("image/png");
  } finally {
    URL.revokeObjectURL(url);
  }
}

// ---------------------------------------------------------------- onboarding

const INTRO_KEY = "kyosil:intro";
export type IntroMode = "demo" | "real";

export function introDone(): IntroMode | null {
  try {
    const q = new URLSearchParams(location.search);
    // shared demo links (?as=…) and tests skip the welcome screens
    if (q.has("as") || q.get("intro") === "0") return "demo";
    const v = localStorage.getItem(INTRO_KEY);
    return v === "demo" || v === "real" ? v : null;
  } catch {
    return "demo";
  }
}

export function finishIntro(mode: IntroMode) {
  try {
    localStorage.setItem(INTRO_KEY, mode);
  } catch {
    /* private mode: show the intro again next time */
  }
}

export function resetIntro() {
  try {
    localStorage.removeItem(INTRO_KEY);
  } catch {
    /* ignore */
  }
}

/** The name to show: the teacher's own name when set, else the demo persona's. */
export const useDisplayName = (id: string) => {
  const p = useMyProfile(id);
  return p.displayName?.trim() || person(id)?.name || "";
};
