import { CircleAlert, CircleCheck, Info, TriangleAlert } from "lucide-react";
import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { person } from "../core/school";

/** Embedded viewers (iframes) block window.open, print and dialogs. */
export const inFrame = (() => {
  try {
    return window.self !== window.top;
  } catch {
    return true;
  }
})();

export function Avatar({ id }: { id: string }) {
  const p = person(id);
  return (
    <span className="avatar" style={{ background: p?.color ?? "#6d7882" }} aria-hidden="true">
      {p?.name.slice(1, 2) ?? "?"}
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

export function Empty({ children }: { children: ReactNode }) {
  return <div className="empty small">{children}</div>;
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
