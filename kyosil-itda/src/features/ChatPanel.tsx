import { Send, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type { Go } from "../App";
import { reply, SUGGESTIONS, type ChatAction, type Mood } from "../core/chatbot";
import { fairInt } from "../core/classtools";
import { nextLesson, openerFor, type Slot } from "../core/daily";
import { useDisplayName, useStudioId } from "../core/profile";
import { PERIOD_TIMES, TIMETABLE } from "../core/school";
import { STUDIOS } from "../core/studio";
import { useApp } from "../state";
import { Mascot } from "../ui/Mascot";
import { useOpenPack } from "./openPack";
import { useClassRoster } from "./roster";
import { todayIndex } from "./Today";

interface Msg { who: "bot" | "me"; text: string; actions?: ChatAction[]; mood?: Mood }

function nextText(owner: string) {
  const slots: Slot[] = (TIMETABLE[owner]?.[todayIndex()] ?? []).map((l, p) => (l ? { p, classId: l.classId, label: l.subject, cover: false } : null)).filter(Boolean) as Slot[];
  const n = nextLesson(slots);
  if (!n.slot) return n.state === "done" ? "오늘 수업은 모두 끝났어요. 수고하셨어요!" : "오늘은 수업이 없어요.";
  const s = n.slot;
  return n.state === "now" ? `지금 ${s.p + 1}교시 ${s.classId} ${s.label} 수업 중이에요.` : `다음 수업은 ${s.p + 1}교시(${PERIOD_TIMES[s.p]}) ${s.classId} ${s.label}이에요.`;
}

function beep() {
  try {
    const a = new AudioContext(), o = a.createOscillator(), g = a.createGain();
    o.frequency.value = 880; g.gain.value = 0.08; o.connect(g); g.connect(a.destination); o.start(); o.stop(a.currentTime + 0.35);
  } catch { /* no audio */ }
}

export function ChatPanel({ go, open, setOpen }: { go: Go; open: boolean; setOpen: (o: boolean) => void }) {
  const { me } = useApp();
  const name = useDisplayName(me.id);
  const studio = useStudioId(me.id);
  const { names } = useClassRoster();
  const openPack = useOpenPack(go);
  const owner = me.role === "student-teacher" ? (me.id === "s2" ? "t2" : "t1") : me.id;
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [text, setText] = useState("");
  const [timer, setTimer] = useState<{ end: number; total: number } | null>(null);
  const [now, setNow] = useState(Date.now());
  const list = useRef<HTMLDivElement>(null);
  const input = useRef<HTMLInputElement>(null);
  const mood: Mood = msgs.filter((m) => m.who === "bot").at(-1)?.mood ?? "hi";

  const ask = (q: string) => {
    const r = reply(q, { name, next: nextText(owner), opener: openerFor(studio), roster: names, pick: (n) => fairInt(n) });
    setMsgs((m) => [...m, ...(q ? [{ who: "me" as const, text: q }] : []), { who: "bot", text: r.text, actions: r.actions, mood: r.mood }]);
  };
  useEffect(() => { if (open && !msgs.length) ask(""); if (open) setTimeout(() => input.current?.focus(), 50); }, [open]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { list.current?.scrollTo({ top: list.current.scrollHeight, behavior: "smooth" }); }, [msgs, open]);
  useEffect(() => {
    if (!timer) return;
    const id = setInterval(() => {
      const t = Date.now(); setNow(t);
      if (t >= timer.end) { setTimer(null); beep(); setMsgs((m) => [...m, { who: "bot", text: "⏰ 시간이 다 됐어요!", mood: "happy" }]); }
    }, 250);
    return () => clearInterval(id);
  }, [timer]);
  useEffect(() => {
    if (!open) return;
    const on = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    window.addEventListener("keydown", on);
    return () => window.removeEventListener("keydown", on);
  }, [open]);

  const act = (a: ChatAction) => {
    if (a.kind === "say") return ask(a.text);
    if (a.kind === "go") { setOpen(false); return go(a.page as Parameters<Go>[0]); }
    if (a.kind === "packs") { setOpen(false); return go("packs"); }
    if (a.kind === "timer") { setTimer({ end: Date.now() + a.seconds * 1000, total: a.seconds }); setNow(Date.now()); return; }
    if (a.kind === "pack") { setOpen(false); openPack(a.pack, a.to, name); }
  };
  const left = timer ? Math.max(0, Math.ceil((timer.end - now) / 1000)) : 0;

  return (
    <>
      {(
        <div className="ieum" role="dialog" aria-modal="false" aria-labelledby="ieum-h" hidden={!open}>
          <div className="ieum-head">
            <Mascot mood={mood} size={48} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <h2 id="ieum-h">이음이</h2>
              <p className="meta">{STUDIOS[studio].subject} 도우미 · 이 기기 안에서만 동작해요</p>
            </div>
            <button className="btn sm text" onClick={() => setOpen(false)} aria-label="이음이 닫기"><X className="ico sm" aria-hidden /></button>
          </div>
          <div className="ieum-list" ref={list} aria-live="polite">
            {msgs.map((m, i) => (
              <div key={i} className={`ieum-msg ${m.who}`}>
                <p>{m.text}</p>
                {m.actions && m.actions.length > 0 && (
                  <div className="ieum-actions">
                    {m.actions.map((a, j) => <button key={j} className={`chip-btn ${a.kind === "pack" || a.kind === "timer" ? "primary" : ""}`} onClick={() => act(a)}>{a.label}</button>)}
                  </div>
                )}
              </div>
            ))}
            {timer && (
              <div className="ieum-timer" role="timer" aria-label={`남은 시간 ${Math.floor(left / 60)}분 ${left % 60}초`}>
                <b>{String(Math.floor(left / 60)).padStart(2, "0")}:{String(left % 60).padStart(2, "0")}</b>
                <span className="ieum-timer-bar"><i style={{ width: `${(left / timer.total) * 100}%` }} /></span>
                <button className="btn sm text" onClick={() => setTimer(null)}>멈추기</button>
              </div>
            )}
          </div>
          <form className="ieum-input" onSubmit={(e) => { e.preventDefault(); if (text.trim()) { ask(text.trim()); setText(""); } }}>
            <input ref={input} value={text} onChange={(e) => setText(e.target.value)} placeholder={`예: ${SUGGESTIONS[0]}`} aria-label="이음이에게 말하기" maxLength={300} />
            <button className="btn primary sm" type="submit" aria-label="보내기"><Send className="ico sm" aria-hidden /></button>
          </form>
        </div>
      )}
    </>
  );
}
