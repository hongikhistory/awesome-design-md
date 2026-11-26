import { lazy, Suspense, useState } from "react";
import type { Go } from "../App";
import { Mascot } from "../ui/Mascot";

// The panel (rules, lesson packs, timer) loads on first open, so the first screen stays light.
// Once opened it stays mounted, so a running timer survives closing the panel.
const ChatPanel = lazy(() => import("./ChatPanel").then((m) => ({ default: m.ChatPanel })));

export function ChatBot({ go }: { go: Go }) {
  const [open, setOpen] = useState(false);
  const [loaded, setLoaded] = useState(false);
  return (
    <>
      {loaded && <Suspense fallback={null}><ChatPanel go={go} open={open} setOpen={setOpen} /></Suspense>}
      <button className={`chat-fab ${open ? "on" : ""}`} onClick={() => { setLoaded(true); setOpen(!open); }} aria-expanded={open} aria-label={open ? "이음이 닫기" : "도우미 이음이 열기"}>
        <Mascot mood={open ? "happy" : "hi"} size={64} />
        {!open && <span className="chat-fab-tip">무엇을 도와드릴까요?</span>}
      </button>
    </>
  );
}
