import { CalendarDays, Check, ChevronLeft, ChevronRight, Clock3, Dices, Landmark, ListChecks, MessageCircleQuestion, Pencil, Presentation, Shuffle, Sparkles, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import type { Go } from "../App";
import { behind, hm, lessonTitle, minutesUntil, nextLesson, openerFor, PAGE_LABEL, saveProgress, upcoming, useProgress, useUsage, weekSummary, type Slot } from "../core/daily";
import { DAYS, PERIOD_TIMES } from "../core/school";
import type { StudioId } from "../core/studio";

/* ───────── 다음 수업: what to open before the bell ───────── */

export function NextClass({ go, owner, studio, slots, readOnly }: { go: Go; owner: string; studio: StudioId; slots: Slot[]; readOnly?: boolean }) {
  const prog = useProgress(owner, studio);
  const n = nextLesson(slots);
  const s = n.slot;
  const lesson = s ? prog.at[s.classId] : undefined;
  const head =
    n.state === "now" ? "지금 수업 중" :
    n.state === "next" && s ? (minutesUntil(s.p) <= 60 ? `${minutesUntil(s.p)}분 뒤 시작` : `${PERIOD_TIMES[s.p]} 시작`) :
    n.state === "weekend" ? "다음 주 첫 수업" :
    n.state === "done" ? "오늘 수업 끝" : "오늘은 수업이 없습니다";
  return (
    <section className="panel next-class" aria-labelledby="next-h">
      <div className="panel-body">
        <p className="eyebrow-sm"><Clock3 className="ico sm" aria-hidden /> {head}</p>
        {s ? (
          <>
            <h2 id="next-h" className="next-title">
              <span className="next-period">{s.p + 1}교시</span> {s.classId} <small>{s.label}</small>
            </h2>
            {lesson !== undefined && (
              <p className="next-lesson">
                진도 <b>{lesson + 1}차시</b> · {lessonTitle(prog, lesson)}
                {s.cover && <span className="badge warn" style={{ marginLeft: 8 }}>교체·보결</span>}
              </p>
            )}
            <div className="next-actions">
              <button className="btn primary sm" onClick={() => go("slides")}><Presentation className="ico sm" aria-hidden /> 슬라이드</button>
              <button className="btn sm" onClick={() => go("activities")}><ListChecks className="ico sm" aria-hidden /> 확인 문제</button>
              <button className="btn sm" onClick={() => go("assets")}><Landmark className="ico sm" aria-hidden /> 띄울 자료</button>
              {!readOnly && lesson !== undefined && n.state === "now" && (
                <button className="btn sm" onClick={() => saveProgress(owner, { ...prog, at: { ...prog.at, [s.classId]: lesson + 1 }, log: { ...prog.log, [s.classId]: new Date().toISOString() } })}>
                  <Check className="ico sm" aria-hidden /> 마치고 진도 기록
                </button>
              )}
            </div>
            {n.left > 1 && <p className="meta" style={{ marginTop: 10 }}>오늘 남은 수업 {n.left}개 · {slots.filter((x) => x.p > s.p).map((x) => `${x.p + 1}교시 ${x.classId}`).join(", ")}</p>}
          </>
        ) : (
          <>
            <h2 id="next-h" className="next-title">{n.state === "done" ? "수고하셨습니다" : "준비할 수업이 없습니다"}</h2>
            <p className="meta" style={{ marginTop: 6 }}>{n.state === "done" ? "오늘 진도를 확인하고, 내일 쓸 자료를 미리 만들어 두세요." : "학급 일과 문서 정리를 하기 좋은 날입니다."}</p>
            <div className="next-actions"><button className="btn sm" onClick={() => go("slides")}><Presentation className="ico sm" aria-hidden /> 내일 슬라이드 만들기</button></div>
          </>
        )}
      </div>
    </section>
  );
}

/* ───────── 수업 여는 질문: a new one each day, on the classroom screen in one click ───────── */

export function Opener({ go, studio }: { go: Go; studio: StudioId }) {
  const [shift, setShift] = useState(0);
  const [big, setBig] = useState(false);
  const q = openerFor(studio, new Date(), shift);
  return (
    <section className="panel opener" aria-labelledby="op-h">
      <div className="panel-body">
        <p className="eyebrow-sm"><MessageCircleQuestion className="ico sm" aria-hidden /> <span id="op-h">오늘의 수업 여는 질문</span></p>
        <p className="opener-q" aria-live="polite">{q}</p>
        <div className="next-actions">
          <button className="btn sm primary" onClick={() => setBig(true)}><Sparkles className="ico sm" aria-hidden /> 교실 화면에 띄우기</button>
          <button className="btn sm" onClick={() => setShift(shift + 1)}><Shuffle className="ico sm" aria-hidden /> 다른 질문</button>
        </div>
      </div>
      {big && <OpenerStage q={q} onNext={() => setShift(shift + 1)} onPrev={() => setShift(shift - 1)} onClose={() => setBig(false)} onPick={() => { setBig(false); go("classtools"); }} />}
    </section>
  );
}

function OpenerStage({ q, onNext, onPrev, onClose, onPick }: { q: string; onNext: () => void; onPrev: () => void; onClose: () => void; onPick: () => void }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    ref.current?.focus();
    const on = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowRight") onNext();
      if (e.key === "ArrowLeft") onPrev();
    };
    window.addEventListener("keydown", on);
    return () => window.removeEventListener("keydown", on);
  }, [onClose, onNext, onPrev]);
  return createPortal(
    <div className="presenter opener-stage" role="dialog" aria-modal="true" aria-label="수업 여는 질문" tabIndex={-1} ref={ref}>
      <div className="presenter-top">
        <span className="meta" style={{ color: "#C3D0EC" }}>수업 여는 질문 · ← → 다른 질문 · Esc 닫기</span>
        <button className="btn sm" onClick={onClose} aria-label="닫기"><X className="ico sm" aria-hidden /></button>
      </div>
      <div className="presenter-stage" key={q}><p className="opener-big">{q}</p></div>
      <div className="presenter-cap">
        <button className="btn sm" onClick={onPrev} aria-label="이전 질문"><ChevronLeft className="ico sm" aria-hidden /></button>
        <button className="btn sm" onClick={onPick}><Dices className="ico sm" aria-hidden /> 발표할 학생 뽑기</button>
        <button className="btn sm" onClick={onNext} aria-label="다음 질문"><ChevronRight className="ico sm" aria-hidden /></button>
      </div>
    </div>,
    document.body,
  );
}

/* ───────── 학급별 진도 ───────── */

export function ProgressPanel({ owner, studio, readOnly }: { owner: string; studio: StudioId; readOnly?: boolean }) {
  const prog = useProgress(owner, studio);
  const [edit, setEdit] = useState(false);
  const [text, setText] = useState("");
  const classes = Object.keys(prog.at);
  const late = new Map(behind(prog).map((b) => [b.classId, b.gap]));
  const total = Math.max(prog.plan.length, 1);
  const set = (c: string, v: number) => saveProgress(owner, { ...prog, at: { ...prog.at, [c]: Math.max(0, Math.min(total - 1, v)) }, log: { ...prog.log, [c]: new Date().toISOString() } });
  if (!classes.length) return null;
  return (
    <section className="panel" aria-labelledby="prog-h">
      <div className="panel-head">
        <h2 id="prog-h">학급별 진도</h2>
        {!readOnly && <button className="btn sm text" onClick={() => { setText(prog.plan.join("\n")); setEdit(!edit); }}><Pencil className="ico sm" aria-hidden /> 차시 계획</button>}
      </div>
      <div className="panel-body">
        {edit ? (
          <div className="stack tight">
            <label htmlFor="plan-ta" className="meta">한 줄에 한 차시씩 적습니다. 학교 진도표를 붙여 넣어도 됩니다.</label>
            <textarea id="plan-ta" rows={8} value={text} onChange={(e) => setText(e.target.value)} />
            <div className="row">
              <button className="btn primary sm" onClick={() => { const plan = text.split("\n").map((x) => x.trim()).filter(Boolean).slice(0, 60); if (plan.length) saveProgress(owner, { ...prog, plan }); setEdit(false); }}>저장</button>
              <button className="btn sm" onClick={() => setEdit(false)}>취소</button>
            </div>
          </div>
        ) : (
          <ul className="prog-list">
            {classes.map((c) => {
              const v = prog.at[c];
              return (
                <li key={c}>
                  <b className="prog-class">{c}</b>
                  <div className="prog-main">
                    <div className="prog-line"><span>{v + 1}차시 · {lessonTitle(prog, v)}</span>{late.get(c) ? <span className="badge warn">{late.get(c)}차시 늦음</span> : null}</div>
                    <div className="prog-bar" role="img" aria-label={`${total}차시 중 ${v + 1}차시`}><i style={{ width: `${((v + 1) / total) * 100}%` }} /></div>
                  </div>
                  {!readOnly && (
                    <div className="prog-btns">
                      <button className="btn sm" onClick={() => set(c, v - 1)} aria-label={`${c} 진도 한 차시 되돌리기`} disabled={v === 0}>−</button>
                      <button className="btn sm" onClick={() => set(c, v + 1)} aria-label={`${c} 진도 한 차시 넘기기`} disabled={v >= total - 1}>+</button>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </section>
  );
}

/* ───────── 이번 주 기록 ───────── */

export function WeekRecord({ id }: { id: string }) {
  const u = useUsage(id);
  const w = weekSummary(u);
  return (
    <section className="panel" aria-labelledby="wk-h">
      <div className="panel-head"><h2 id="wk-h">이번 주 기록</h2>
        <ol className="streak" aria-label={`이번 주 ${w.used.filter(Boolean).length}일 사용`}>
          {DAYS.map((d, i) => <li key={d} className={w.used[i] ? "on" : ""}><span aria-hidden="true">{w.used[i] ? "✓" : d}</span><span className="sr">{d}요일 {w.used[i] ? "사용" : "미사용"}</span></li>)}
        </ol>
      </div>
      <div className="panel-body">
        <div className="saved">
          <div><b>{w.made.length}</b><span>만든 자료</span></div>
          <div><b>{hm(w.minutes)}</b><span>아낀 시간(추정)</span></div>
        </div>
        {w.made.length ? (
          <ul className="made-list">
            {w.made.slice(0, 4).map((m, i) => (
              <li key={i}><span className="badge">{PAGE_LABEL[m.page] ?? "자료"}</span><span className="made-name">{m.name}</span><span className="meta">{DAYS[(new Date(m.at).getDay() + 6) % 7] ?? ""}</span></li>
            ))}
          </ul>
        ) : <p className="meta">자료를 내려받으면 여기에 쌓입니다.</p>}
        <p className="meta" style={{ marginTop: 8, fontSize: 12 }}>아낀 시간은 직접 만들 때 걸리는 시간을 슬라이드 30분, 활동·통신문 20분, 기록 15분, 문서 변환 10분으로 잡은 추정치입니다.</p>
      </div>
    </section>
  );
}

/* ───────── 학사일정 ───────── */

export function Upcoming() {
  const list = upcoming();
  if (!list.length) return null;
  return (
    <ul className="dday" aria-label="다가오는 학사일정(가상)">
      {list.map((e) => (
        <li key={e.date}><CalendarDays className="ico sm" aria-hidden /><b>{e.dday === 0 ? "D-DAY" : `D-${e.dday}`}</b>{e.name}</li>
      ))}
    </ul>
  );
}
