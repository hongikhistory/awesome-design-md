import { useCallback, useEffect, useRef, useState } from "react";
import { person } from "../core/school";

export function Avatar({ id, size }: { id: string; size?: "lg" }) {
  const p = person(id);
  return (
    <span className={`avatar ${size ?? ""}`} style={{ background: p?.color ?? "#a39e98" }} aria-hidden="true">
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
    timer.current = window.setTimeout(() => setMsg(""), 2600);
  }, []);
  useEffect(() => () => window.clearTimeout(timer.current), []);
  const node = msg ? (
    <div className="toast" role="status">
      {msg}
    </div>
  ) : null;
  return { show, node };
}

export function Empty({ children }: { children: React.ReactNode }) {
  return <div className="note-box muted small">{children}</div>;
}
