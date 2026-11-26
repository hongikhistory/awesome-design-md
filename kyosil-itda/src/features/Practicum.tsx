import { useEffect, useMemo, useRef, useState } from "react";
import type { Decrypted, PracticumEvent } from "../core/engine";
import { fmtClock, gapAnalysis, RUBRIC, TAGS, tagSummary, type Note, type Scores, type Session, type TagKey } from "../core/practicum";
import { CLASSES, nameOf } from "../core/school";
import { timeLabel, useApp } from "../state";
import { Empty, inFrame, useToast } from "../ui/common";

type Tab = "observe" | "rubric" | "feedback" | "report";

interface SessionData {
  session: Session;
  notes: Note[];
  mentorScores?: Scores;
  selfScores?: Scores;
  feedback?: { glow: string; grow: string; next: string; at: number };
  reflection?: { text: string; at: number };
}

// Roles come from the room (who created it), never from a claim inside a message.
function collect(events: Decrypted[], mentorId: string): SessionData[] {
  const map = new Map<string, SessionData>();
  const ev = events.filter((e): e is Decrypted & { payload: PracticumEvent } => e.payload.type.startsWith("prac."));
  for (const e of ev) {
    const p = e.payload;
    if (p.type === "prac.session") {
      const { type: _t, ...session } = p;
      if (!map.has(p.sessionId)) map.set(p.sessionId, { session: { ...session, createdBy: mentorId }, notes: [] });
    }
  }
  for (const e of ev) {
    const p = e.payload;
    if (p.type === "prac.session") continue;
    const s = map.get(p.sessionId);
    if (!s) continue;
    if (p.type === "prac.note") {
      const { type: _t, ...note } = p;
      if (note.author === e.sender) s.notes.push(note); // author must be the signer
    } else if (p.type === "prac.score") {
      // A mentor score only counts from the mentor; a self score only from the student teacher.
      if (p.by === "mentor" && e.sender === mentorId) s.mentorScores = p.scores;
      if (p.by === "self" && e.sender !== mentorId) s.selfScores = p.scores;
    } else if (p.type === "prac.feedback" && e.sender === mentorId) s.feedback = { glow: p.glow, grow: p.grow, next: p.next, at: e.at };
    else if (p.type === "prac.reflect" && e.sender !== mentorId) s.reflection = { text: p.text, at: e.at };
  }
  for (const s of map.values()) s.notes.sort((a, b) => a.t - b.t);
  return [...map.values()].sort((a, b) => b.session.date.localeCompare(a.session.date));
}

export function Practicum() {
  const { me, views } = useApp();
  const rooms = views.filter((v) => v.room.kind === "practicum");
  const [roomId, setRoomId] = useState("");
  const room = rooms.find((r) => r.room.roomId === roomId) ?? rooms[0];

  if (!room) {
    return (
      <>
        <div className="page-head"><div><h1>교생실습 참관 · 피드백</h1></div></div>
        <div className="card">
          <h2>🔒 참여 중인 실습 공간이 없습니다</h2>
          <p className="muted" style={{ marginTop: 8 }}>
            실습 공간은 지도교사와 교생 두 사람만 열 수 있게 암호화됩니다. 같은 학교 선생님도, 서버도 참관 기록과 평가를 읽을 수 없습니다. 데모에서는 <b>김하늘(지도교사)</b> 또는 <b>오세린(교생)</b>으로 전환해 보세요.
          </p>
        </div>
      </>
    );
  }
  return <Workspace key={room.room.roomId} roomId={room.room.roomId} rooms={rooms.map((r) => ({ id: r.room.roomId, name: r.room.name }))} onRoom={setRoomId} isMentor={room.room.createdBy === me.id} />;
}

function Workspace({ roomId, rooms, onRoom, isMentor }: { roomId: string; rooms: { id: string; name: string }[]; onRoom: (id: string) => void; isMentor: boolean }) {
  const { view } = useApp();
  const v = view(roomId)!;
  const data = useMemo(() => collect(v.events, v.room.createdBy), [v.events, v.room.createdBy]);
  const [sid, setSid] = useState("");
  const [tab, setTab] = useState<Tab>("observe");
  const [creating, setCreating] = useState(false);
  const cur = data.find((d) => d.session.sessionId === sid) ?? data[0];
  const days = v.room.expiresAt ? Math.max(0, Math.ceil((v.room.expiresAt - Date.now()) / 86_400_000)) : null;

  return (
    <>
      <div className="page-head">
        <div>
          <h1>교생실습 참관 · 피드백</h1>
          <p>
            {v.room.name.replace("교생실습 · ", "")} · {isMentor ? "지도교사로 접속" : "교생으로 접속"} · 두 사람만 복호화 가능
            {days !== null && <> · <b>{days}일 뒤 자동 삭제</b></>}
          </p>
        </div>
        <div className="row no-print">
          {rooms.length > 1 && (
            <select value={roomId} onChange={(e) => onRoom(e.target.value)} aria-label="실습 공간">
              {rooms.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
            </select>
          )}
          <button className="btn primary" onClick={() => setCreating(true)}>새 수업 기록</button>
        </div>
      </div>
      {creating && <NewSession roomId={roomId} mentorId={v.room.createdBy} onDone={(id) => { setCreating(false); if (id) { setSid(id); setTab("observe"); } }} />}
      {!cur ? (
        <Empty>아직 수업 기록이 없습니다. “새 수업 기록”으로 시작하세요.</Empty>
      ) : (
        <>
          <div className="row no-print" style={{ marginBottom: 12 }}>
            {data.map((d) => (
              <button key={d.session.sessionId} className="btn ghost sm" aria-pressed={cur.session.sessionId === d.session.sessionId}
                style={cur.session.sessionId === d.session.sessionId ? { borderColor: "var(--accent)", background: "var(--accent-soft)" } : undefined}
                onClick={() => setSid(d.session.sessionId)}>
                {d.session.date} · {d.session.title}
              </button>
            ))}
          </div>
          <div className="card" style={{ marginBottom: 14 }}>
            <div className="row between">
              <div>
                <h2>{cur.session.title}</h2>
                <p className="small muted" style={{ marginTop: 4 }}>{cur.session.date} · {cur.session.classId} · {cur.session.durationMin}분 · 수업자 교생</p>
              </div>
              <div className="row no-print" role="tablist" aria-label="실습 단계">
                {([["observe", "① 참관 기록"], ["rubric", "② 루브릭 평가"], ["feedback", "③ 피드백·성찰"], ["report", "④ 보고서"]] as [Tab, string][]).map(([k, l]) => (
                  <button key={k} role="tab" aria-selected={tab === k} className={`btn sm ${tab === k ? "primary" : "ghost"}`} onClick={() => setTab(k)}>{l}</button>
                ))}
              </div>
            </div>
            {cur.session.plan && <p className="note-box small" style={{ marginTop: 10 }}><b>수업 흐름</b> · {cur.session.plan}</p>}
          </div>
          {tab === "observe" && <Observe roomId={roomId} d={cur} isMentor={isMentor} />}
          {tab === "rubric" && <Rubric roomId={roomId} d={cur} isMentor={isMentor} />}
          {tab === "feedback" && <Feedback roomId={roomId} d={cur} isMentor={isMentor} />}
          {tab === "report" && <Report d={cur} roomName={v.room.name} days={days} />}
        </>
      )}
    </>
  );
}

function NewSession({ roomId, mentorId, onDone }: { roomId: string; mentorId: string; onDone: (id?: string) => void }) {
  const { send } = useApp();
  const [s, setS] = useState({ title: "", date: new Date().toISOString().slice(0, 10), classId: "2-1", plan: "", durationMin: 45 });
  return (
    <div className="card no-print" style={{ marginBottom: 14 }}>
      <h3>새 수업 기록</h3>
      <div className="grid three" style={{ marginTop: 10 }}>
        <label className="field">수업 제목<input type="text" value={s.title} onChange={(e) => setS({ ...s, title: e.target.value })} placeholder="예: 2-2 국어 · 설명문의 짜임" /></label>
        <label className="field">날짜<input type="date" value={s.date} onChange={(e) => setS({ ...s, date: e.target.value })} /></label>
        <label className="field">학급<select value={s.classId} onChange={(e) => setS({ ...s, classId: e.target.value })}>{CLASSES.map((c) => <option key={c}>{c}</option>)}</select></label>
      </div>
      <label className="field" style={{ marginTop: 10 }}>수업 흐름 (지도안 요약)<textarea value={s.plan} onChange={(e) => setS({ ...s, plan: e.target.value })} placeholder="도입(5) → 전개(30) → 정리(10)" /></label>
      <div className="row" style={{ marginTop: 10 }}>
        <button className="btn primary" disabled={!s.title.trim()} onClick={async () => {
          const sessionId = `sess_${crypto.randomUUID().slice(0, 8)}`;
          await send(roomId, { type: "prac.session", sessionId, createdBy: mentorId, ...s, title: s.title.trim() });
          onDone(sessionId);
        }}>만들기</button>
        <button className="btn ghost" onClick={() => onDone()}>취소</button>
      </div>
    </div>
  );
}

function Timeline({ notes, durationMin }: { notes: Note[]; durationMin: number }) {
  const total = durationMin * 60;
  return (
    <div className="timeline" role="img" aria-label={`수업 ${durationMin}분 동안 참관 메모 ${notes.length}개의 분포`}>
      {notes.map((n) => {
        const tag = TAGS.find((t) => t.key === n.tag)!;
        return <span key={n.noteId} className="dot" title={`${fmtClock(n.t)} ${tag.label} · ${n.text}`} style={{ left: `${Math.min(100, (n.t / total) * 100)}%`, background: tag.color }} />;
      })}
      {[0, 0.25, 0.5, 0.75, 1].map((f) => <span key={f} className="tick" style={{ left: `${f * 100}%` }}>{Math.round(durationMin * f)}분</span>)}
    </div>
  );
}

function Observe({ roomId, d, isMentor }: { roomId: string; d: SessionData; isMentor: boolean }) {
  const { me, send } = useApp();
  const [startAt, setStartAt] = useState<number | null>(null);
  const [now, setNow] = useState(Date.now());
  const [tag, setTag] = useState<TagKey>("question");
  const [text, setText] = useState("");
  const [manual, setManual] = useState("");
  const input = useRef<HTMLInputElement>(null);
  const counts = tagSummary(d.notes);

  useEffect(() => {
    if (startAt === null) return;
    const id = window.setInterval(() => setNow(Date.now()), 500);
    return () => window.clearInterval(id);
  }, [startAt]);

  useEffect(() => {
    if (!isMentor) return;
    const on = (e: KeyboardEvent) => {
      if (!e.altKey) return;
      const i = Number(e.key) - 1;
      if (TAGS[i]) { e.preventDefault(); setTag(TAGS[i].key); input.current?.focus(); }
    };
    window.addEventListener("keydown", on);
    return () => window.removeEventListener("keydown", on);
  }, [isMentor]);

  const elapsed = startAt === null ? 0 : Math.floor((now - startAt) / 1000);
  const add = async () => {
    const t = text.trim();
    if (!t) return;
    const mm = manual.match(/^(\d{1,2})(?::(\d{1,2}))?$/);
    const at = startAt !== null ? elapsed : mm ? Number(mm[1]) * 60 + Number(mm[2] ?? 0) : 0;
    setText("");
    await send(roomId, { type: "prac.note", noteId: `n_${crypto.randomUUID().slice(0, 8)}`, sessionId: d.session.sessionId, t: at, tag, text: t, author: me.id });
  };

  return (
    <div className="grid two">
      {isMentor ? (
        <section className="card" aria-labelledby="obs-h">
          <h3 id="obs-h">실시간 참관 메모</h3>
          <div className="row between" style={{ margin: "10px 0" }}>
            <div className="clock" aria-live="off">{fmtClock(elapsed)}</div>
            {startAt === null ? <button className="btn primary" onClick={() => { setStartAt(Date.now()); setNow(Date.now()); }}>수업 시작</button> : <button className="btn" onClick={() => setStartAt(null)}>종료</button>}
          </div>
          <div className="tagpad" role="radiogroup" aria-label="관찰 영역">
            {TAGS.map((t, i) => (
              <button key={t.key} role="radio" aria-checked={tag === t.key} className="tagbtn" aria-pressed={tag === t.key} style={tag === t.key ? { background: t.color, borderColor: t.color } : { borderColor: t.color, color: t.color }} onClick={() => setTag(t.key)}>
                {t.label}<kbd>Alt+{i + 1}</kbd>
              </button>
            ))}
          </div>
          <form className="row" style={{ marginTop: 10, flexWrap: "nowrap" }} onSubmit={(e) => { e.preventDefault(); void add(); }}>
            {startAt === null && <input type="text" value={manual} onChange={(e) => setManual(e.target.value)} placeholder="분:초" aria-label="시각(분:초)" style={{ width: 80 }} />}
            <input ref={input} type="text" value={text} onChange={(e) => setText(e.target.value)} placeholder="본 장면을 사실대로 적기 (예: 대기 시간 2초)" aria-label="참관 메모" />
            <button className="btn primary" type="submit" disabled={!text.trim()}>기록</button>
          </form>
          <p className="tiny muted" style={{ marginTop: 8 }}>판단보다 장면을 적어 두면 피드백 대화의 근거가 됩니다. 학생 이름은 적지 않습니다.</p>
        </section>
      ) : (
        <section className="card">
          <h3>지도교사의 참관 기록</h3>
          <p className="small muted" style={{ marginTop: 8 }}>지도교사가 수업 중 남긴 장면 기록입니다. 메모가 몰린 구간을 보고 성찰을 써 보세요.</p>
        </section>
      )}
      <section className="card" aria-labelledby="tl-h">
        <h3 id="tl-h">수업 타임라인 · 메모 {d.notes.length}개</h3>
        <Timeline notes={d.notes} durationMin={d.session.durationMin} />
        <div className="row">
          {TAGS.map((t) => <span key={t.key} className="pill gray"><span style={{ width: 8, height: 8, borderRadius: 2, background: t.color, display: "inline-block" }} />{t.label} {counts[t.key]}</span>)}
        </div>
      </section>
      <section className="card" style={{ gridColumn: "1 / -1" }}>
        <h3>메모 목록</h3>
        {d.notes.length === 0 && <Empty>아직 메모가 없습니다.</Empty>}
        <ol style={{ listStyle: "none", padding: 0, margin: "8px 0 0" }}>
          {d.notes.map((n) => {
            const t = TAGS.find((x) => x.key === n.tag)!;
            return (
              <li key={n.noteId} className="row" style={{ padding: "8px 0", borderBottom: "1px solid var(--border)", flexWrap: "nowrap", alignItems: "flex-start" }}>
                <span className="mono" style={{ minWidth: 44 }}>{fmtClock(n.t)}</span>
                <span className="pill" style={{ background: "transparent", color: t.color, border: `1px solid ${t.color}` }}>{t.label}</span>
                <span style={{ flex: 1 }}>{n.text}</span>
              </li>
            );
          })}
        </ol>
      </section>
    </div>
  );
}

function Rubric({ roomId, d, isMentor }: { roomId: string; d: SessionData; isMentor: boolean }) {
  const { send } = useApp();
  const mine = isMentor ? d.mentorScores : d.selfScores;
  const [draft, setDraft] = useState<Scores>(mine ?? {});
  const toast = useToast();
  const complete = RUBRIC.every((r) => draft[r.key]);
  const both = !!d.mentorScores && !!d.selfScores;
  const g = gapAnalysis(d.selfScores, d.mentorScores);

  return (
    <div className="grid two">
      <section className="card" aria-labelledby="rb-h">
        <div className="row between">
          <h3 id="rb-h">{isMentor ? "지도교사 평가" : "교생 자기평가"}</h3>
          {mine && <span className="pill ok">제출함</span>}
        </div>
        <p className="tiny muted" style={{ margin: "6px 0 4px" }}>블라인드 방식 · 두 사람이 모두 제출해야 서로의 점수가 공개됩니다. 다시 제출하면 최신 값으로 바뀝니다.</p>
        {RUBRIC.map((r) => (
          <div key={r.key} className="rubric-row">
            <b className="small">{r.label}</b>
            <div className="levels" role="radiogroup" aria-label={r.label}>
              {r.levels.map((desc, i) => (
                <button key={i} role="radio" aria-checked={draft[r.key] === i + 1} className="level" aria-pressed={draft[r.key] === i + 1} onClick={() => setDraft({ ...draft, [r.key]: i + 1 })}>
                  <b>{i + 1}</b>{desc}
                </button>
              ))}
            </div>
          </div>
        ))}
        <button className="btn primary" style={{ marginTop: 12 }} disabled={!complete} onClick={async () => {
          await send(roomId, { type: "prac.score", sessionId: d.session.sessionId, by: isMentor ? "mentor" : "self", scores: draft });
          toast.show("평가를 암호화해 제출했습니다.");
        }}>제출</button>
        {toast.node}
      </section>
      <section className="card" aria-labelledby="gap-h">
        <h3 id="gap-h">자기평가 ↔ 지도교사 평가 비교</h3>
        {!both ? (
          <div className="note-box small" style={{ marginTop: 10 }}>
            {d.mentorScores ? "지도교사 평가 제출됨" : "지도교사 평가 대기"} · {d.selfScores ? "자기평가 제출됨" : "자기평가 대기"}
            <br />두 평가가 모두 모이면 차이가 큰 영역을 대화 주제로 추천합니다.
          </div>
        ) : (
          <>
            <div className="row tiny muted" style={{ margin: "10px 0 4px" }}>
              <span className="row" style={{ gap: 4 }}><span style={{ width: 10, height: 10, borderRadius: 5, background: "#ff64c8", display: "inline-block" }} />교생 자기평가</span>
              <span className="row" style={{ gap: 4 }}><span style={{ width: 10, height: 10, borderRadius: 5, background: "var(--accent)", display: "inline-block" }} />지도교사</span>
            </div>
            {g.rows.map((r) => (
              <div key={r.key} className="gap-row">
                <span>{r.label}</span>
                <span className="gap-track" aria-label={`${r.label}: 자기평가 ${r.self}, 지도교사 ${r.mentor}`}>
                  {r.mentor !== undefined && <span className="m" style={{ left: `${((r.mentor - 1) / 3) * 92 + 4}%` }} />}
                  {r.self !== undefined && <span className="s" style={{ left: `${((r.self - 1) / 3) * 92 + 4}%` }} />}
                </span>
                <span className={`pill ${r.gap ? (Math.abs(r.gap) >= 1 ? "warn" : "") : "ok"}`}>{r.gap === 0 ? "일치" : `${r.gap! > 0 ? "+" : ""}${r.gap}`}</span>
              </div>
            ))}
            {g.topic && <div className="note-box accent small" style={{ marginTop: 12 }}><b>협의회 대화 주제</b><br />{g.topic}</div>}
          </>
        )}
      </section>
    </div>
  );
}

function Feedback({ roomId, d, isMentor }: { roomId: string; d: SessionData; isMentor: boolean }) {
  const { send } = useApp();
  const [fb, setFb] = useState({ glow: d.feedback?.glow ?? "", grow: d.feedback?.grow ?? "", next: d.feedback?.next ?? "" });
  const [ref, setRef] = useState(d.reflection?.text ?? "");
  const toast = useToast();
  return (
    <div className="grid two">
      <section className="card" aria-labelledby="fb-h">
        <h3 id="fb-h">지도교사 피드백</h3>
        {isMentor ? (
          <div className="stack" style={{ marginTop: 10 }}>
            <label className="field">잘된 점 (Glow)<textarea value={fb.glow} onChange={(e) => setFb({ ...fb, glow: e.target.value })} placeholder="구체적 장면과 효과를 함께" /></label>
            <label className="field">성장 과제 (Grow)<textarea value={fb.grow} onChange={(e) => setFb({ ...fb, grow: e.target.value })} placeholder="한두 가지에 집중해서" /></label>
            <label className="field">다음 수업 목표<input type="text" value={fb.next} onChange={(e) => setFb({ ...fb, next: e.target.value })} placeholder="관찰 가능한 목표 (예: 후속 발문 3회)" /></label>
            <button className="btn primary" disabled={!fb.glow.trim() || !fb.grow.trim()} onClick={async () => { await send(roomId, { type: "prac.feedback", sessionId: d.session.sessionId, ...fb }); toast.show("피드백을 교생에게만 전달했습니다."); }}>교생에게 전달</button>
          </div>
        ) : d.feedback ? (
          <dl className="stack small" style={{ marginTop: 10 }}>
            <div className="note-box ok"><b>잘된 점</b><br />{d.feedback.glow}</div>
            <div className="note-box warn"><b>성장 과제</b><br />{d.feedback.grow}</div>
            <div className="note-box accent"><b>다음 수업 목표</b><br />{d.feedback.next}</div>
            <p className="tiny faint">{timeLabel(d.feedback.at)}</p>
          </dl>
        ) : (
          <Empty>아직 피드백이 없습니다.</Empty>
        )}
      </section>
      <section className="card" aria-labelledby="rf-h">
        <h3 id="rf-h">교생 성찰</h3>
        {!isMentor ? (
          <div className="stack" style={{ marginTop: 10 }}>
            <label className="field">수업을 돌아보며<textarea style={{ minHeight: 140 }} value={ref} onChange={(e) => setRef(e.target.value)} placeholder="계획과 달랐던 장면, 그때의 판단, 다음에 바꿔 볼 것" /></label>
            <button className="btn primary" disabled={!ref.trim()} onClick={async () => { await send(roomId, { type: "prac.reflect", sessionId: d.session.sessionId, text: ref.trim() }); toast.show("성찰을 지도교사에게만 공유했습니다."); }}>지도교사와 공유</button>
          </div>
        ) : d.reflection ? (
          <div className="note-box small" style={{ marginTop: 10, whiteSpace: "pre-wrap" }}>{d.reflection.text}<p className="tiny faint" style={{ marginTop: 6 }}>{timeLabel(d.reflection.at)}</p></div>
        ) : (
          <Empty>교생이 아직 성찰을 쓰지 않았습니다.</Empty>
        )}
      </section>
      {toast.node}
    </div>
  );
}

function Report({ d, roomName, days }: { d: SessionData; roomName: string; days: number | null }) {
  const g = gapAnalysis(d.selfScores, d.mentorScores);
  const counts = tagSummary(d.notes);
  return (
    <section className="card" aria-labelledby="rp-h">
      <div className="row between">
        <h2 id="rp-h">교육실습 수업 참관 보고서</h2>
        {inFrame ? <span className="tiny muted no-print">인쇄·PDF 저장은 앱을 브라우저에서 직접 열었을 때 사용할 수 있습니다.</span> : <button className="btn primary no-print" onClick={() => window.print()}>인쇄 · PDF 저장</button>}
      </div>
      <p className="small muted" style={{ marginTop: 6 }}>
        {roomName.replace("교생실습 · ", "")} · {d.session.title} · {d.session.date} · {d.session.classId} · 지도교사 {nameOf(d.session.createdBy)}
      </p>
      <hr />
      <h3>1. 참관 기록 요약</h3>
      <Timeline notes={d.notes} durationMin={d.session.durationMin} />
      <p className="small">{TAGS.map((t) => `${t.label} ${counts[t.key]}`).join(" · ")}</p>
      <ul className="small">{d.notes.map((n) => <li key={n.noteId}>{fmtClock(n.t)} [{TAGS.find((t) => t.key === n.tag)!.label}] {n.text}</li>)}</ul>
      <h3 style={{ marginTop: 14 }}>2. 루브릭 평가</h3>
      <table className="data" style={{ marginTop: 6 }}>
        <thead><tr><th>영역</th><th>자기평가</th><th>지도교사</th><th>차이</th></tr></thead>
        <tbody>{g.rows.map((r) => <tr key={r.key}><td>{r.label}</td><td>{r.self ?? "—"}</td><td>{r.mentor ?? "—"}</td><td>{r.gap ?? "—"}</td></tr>)}</tbody>
      </table>
      {g.topic && <p className="small" style={{ marginTop: 8 }}><b>협의 주제</b> · {g.topic}</p>}
      <h3 style={{ marginTop: 14 }}>3. 피드백</h3>
      {d.feedback ? (
        <ul className="small"><li><b>잘된 점</b> · {d.feedback.glow}</li><li><b>성장 과제</b> · {d.feedback.grow}</li><li><b>다음 목표</b> · {d.feedback.next}</li></ul>
      ) : <p className="small muted">없음</p>}
      <h3 style={{ marginTop: 14 }}>4. 교생 성찰</h3>
      <p className="small" style={{ whiteSpace: "pre-wrap" }}>{d.reflection?.text ?? "없음"}</p>
      <hr />
      <p className="tiny muted">이 보고서에는 학생 개인을 특정하는 정보가 없습니다. 원본 기록은 지도교사와 교생의 기기에서만 복호화되며{days !== null ? `, ${days}일 뒤 서버에서 자동 삭제됩니다` : ""}.</p>
    </section>
  );
}
