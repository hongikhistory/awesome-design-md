import { CircleAlert, CircleCheck, Info, TriangleAlert } from "lucide-react";
import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { useMyProfile } from "../core/profile";
import { person } from "../core/school";
import { EmptyArt } from "./Illustrations";

/** Embedded viewers (iframes) block window.open, print and dialogs. */
export const inFrame = (() => {
  try {
    return window.self !== window.top;
  } catch {
    return true;
  }
})();

const SKIN = ["#F6D3B3", "#EBC09A", "#D9A47C", "#F2C9A5", "#C98E66"];
const HAIR = ["#2B2420", "#3B2A22", "#4A3426", "#1F1B1A", "#5C4033", "#6B4A35"];
const hash = (s: string) => [...s].reduce((a, c) => (a * 31 + c.charCodeAt(0)) >>> 0, 7);

/** Original flat illustration: a face with one of four hair styles, shirt in the person's colour. */
export function Illustrated({ seed, color, size = 28 }: { seed: string; color: string; size?: number }) {
  const h = hash(seed);
  const skin = SKIN[h % SKIN.length], hair = HAIR[(h >> 3) % HAIR.length], style = (h >> 6) % 4;
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" aria-hidden="true" className="avatar-svg">
      <rect width="40" height="40" rx="20" fill={color} opacity=".16" />
      {style === 1 && <path d="M8 22c0-10 5-15 12-15s12 5 12 15v10H8z" fill={hair} />}
      <path d="M7 40c1-7 6-10 13-10s12 3 13 10z" fill={color} />
      <rect x="17" y="24" width="6" height="7" rx="3" fill={skin} />
      <ellipse cx="20" cy="18" rx="8" ry="9" fill={skin} />
      {style === 0 && <path d="M11.5 17c0-6 3.6-9.5 8.5-9.5s8.5 3.5 8.5 9.5c-2-3-5-4.6-8.5-4.6S13.5 14 11.5 17z" fill={hair} />}
      {style === 1 && <path d="M12 16c1-5 4-7.5 8-7.5s7 2.5 8 7.5c-3-2.4-5-3-8-3s-5 .6-8 3z" fill={hair} />}
      {style === 2 && <><circle cx="20" cy="7.5" r="4" fill={hair} /><path d="M11.5 17.5c0-6 3.6-9.5 8.5-9.5s8.5 3.5 8.5 9.5c-1.5-4-4.5-5.5-8.5-5.5s-7 1.5-8.5 5.5z" fill={hair} /></>}
      {style === 3 && <path d="M11 20c-.5-8 3.5-12 9-12s9.5 4 9 12l-1.5-3c-2-3-4.5-4-7.5-4s-5.5 1-7.5 4z" fill={hair} />}
      <circle cx="17" cy="19" r="1" fill="#2A2522" />
      <circle cx="23" cy="19" r="1" fill="#2A2522" />
      <path d="M17.6 22.6c1.4 1.1 3.4 1.1 4.8 0" stroke="#9A5B45" strokeWidth="1.2" fill="none" strokeLinecap="round" />
      <circle cx="15" cy="21.6" r="1.3" fill="#F08F7F" opacity=".45" />
      <circle cx="25" cy="21.6" r="1.3" fill="#F08F7F" opacity=".45" />
    </svg>
  );
}

export function Avatar({ id, size = 28 }: { id: string; size?: number }) {
  const p = person(id);
  const { photo } = useMyProfile(id);
  if (photo) return <img className="avatar photo" src={photo} width={size} height={size} alt="" aria-hidden="true" />;
  return (
    <span className="avatar" style={{ width: size, height: size }} aria-hidden="true">
      <Illustrated seed={id + (p?.name ?? "")} color={p?.color ?? "#6d7882"} size={size} />
    </span>
  );
}

export function useToast() {
  const [msg, setMsg] = useState("");
  const timer = useRef<number | undefined>(undefined);
  const show = useCallback((m: string) => {
    setMsg(m);
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setMsg(""), 2800);
  }, []);
  useEffect(() => () => window.clearTimeout(timer.current), []);
  const node = (
    <div className={msg ? "toast" : "sr"} role="status" aria-live="polite">
      {msg}
    </div>
  );
  return { show, node };
}

export function Empty({ children, art }: { children: ReactNode; art?: "docs" | "notes" | "people" }) {
  return <div className="empty small">{art && <EmptyArt kind={art} />}<div>{children}</div></div>;
}

const NOTICE_ICON = { info: Info, warn: TriangleAlert, ok: CircleCheck, plain: CircleAlert };

export function Notice({ kind = "info", children, role }: { kind?: keyof typeof NOTICE_ICON; children: ReactNode; role?: string }) {
  const I = NOTICE_ICON[kind];
  return (
    <div className={`notice ${kind === "plain" ? "" : kind}`} role={role}>
      <I className="ico" aria-hidden="true" />
      <div style={{ minWidth: 0 }}>{children}</div>
    </div>
  );
}
