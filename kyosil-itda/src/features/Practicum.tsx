import { Pause, Play, Printer } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { createRoom, type Decrypted, type PracticumEvent } from "../core/engine";
import { relay } from "../core/relay";
import { fmtClock, gapAnalysis, RUBRIC, TAGS, tagSummary, type Note, type Scores, type Session, type TagKey } from "../core/practicum";
import { CLASSES, nameOf, PEOPLE } from "../core/school";
import { timeLabel, useApp } from "../state";
import { Avatar, Empty, inFrame, Notice, useToast } from "../ui/common";

/*
 * Structure follows clinical supervision (Cogan; Goldhammer):
 * planning conference → classroom observation → feedback conference.
 * Rubric self/mentor comparison sits between observation and feedback,
 * and the 참관록 (observation record) closes the cycle.
 */
type Stage = "plan" | "observe" | "rubric" | "feedback" | "record";
const STAGES: [Stage, string][] = [
  ["plan", "계획 협의"],
  ["observe", "수업 관찰"],
  ["rubric", "평가 비교"],
  ["feedback", "피드백 협의"],
  ["record", "참관록"],
];
const tagColor = (k: TagKey) => `var(--tag-${k})`;
const tagLabel = (k: TagKey) => TAGS.find((t) => t.key === k)!.label;
const roomTitle = (name: string) => name.replace(/^(교생실습|교육실습) · /, "");

interface SessionData {
  session: Session;
  notes: Note[];
  focus?: { tags: TagKey[]; question: string; at: number };
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
    if (p.type === "prac.session" && !map.has(p.sessionId)) {
      const { type: _t, ...session } = p;
      map.set(p.sessionId, { session: { ...session, createdBy: mentorId }, notes: [] });
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
    } else if (p.type === "prac.focus") s.focus = { tags: p.tags.slice(0, 2), question: p.question, at: e.at };
    else if (p.type === "prac.score") {
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

  return (
    <>
      <div className="page-head">
        <div>
          <div className="crumb">업무 · 교육실습</div>
          <h1>교육실습 수업 관찰</h1>
          <p className="lead">임상장학의 순서(계획 협의 → 수업 관찰 → 피드백 협의)로 진행합니다. 기록은 지도교사와 교생 두 사람만 열 수 있습니다.</p>
        </div>
        {rooms.length > 1 && (
          <label className="field no-print" style={{ minWidth: 220 }}>실습 공간
            <select value={room?.room.roomId} onChange={(e) => setRoomId(e.target.value)}>
              {rooms.map((r) => <option key={r.room.roomId} value={r.room.roomId}>{roomTitle(r.room.name)}</option>)}
            </select>
          </label>
        )}
      </div>
      {room ? (
        <Workspace key={room.room.roomId} roomId={room.room.roomId} isMentor={room.room.createdBy === me.id} />
      ) : me.role === "student-teacher" ? (
        <Notice kind="plain">
          <b>아직 열린 실습 공간이 없습니다.</b>
          <p className="muted" style={{ marginTop: 4 }}>지도교사가 실습 공간을 열면 이 기기로 암호 키가 전달되어 바로 볼 수 있습니다.</p>
        </Notice>
      ) : null}
      {me.role !== "student-teacher" && <OpenSpace />}
    </>
  );
}

function OpenSpace() {
  const { me, tick } = useApp();
  // Assignments are room membership, which the relay already sees as metadata; contents stay encrypted.
  const taken = useMemo(() => new Set(relay.snapshot().rooms.filter((r) => r.kind === "practicum").flatMap((r) => r.members)), [tick]); // eslint-disable-line react-hooks/exhaustive-deps
  const students = PEOPLE.filter((p) => p.role === "student-teacher");
  const [picked, setStudent] = useState("");
  const student = picked && !taken.has(picked) ? picked : (students.find((s) => !taken.has(s.id))?.id ?? "");
  const [days, setDays] = useState(60);
  const [busy, setBusy] = useState(false);
  const toast = useToast();
  return (
    <section className="panel section no-print" aria-labelledby="open-h">
      <div className="panel-head"><h2 id="open-h">실습 공간 열기</h2><span className="meta">지도교사가 실습 첫날 엽니다</span></div>
      <div className="panel-body stack">
        <div className="grid three">
          <label className="field">교생
            <select value={student} onChange={(e) => setStudent(e.target.value)}>
              {students.map((s) => <option key={s.id} value={s.id} disabled={taken.has(s.id)}>{s.name} ({s.subject}){taken.has(s.id) ? " · 배정됨" : ""}</option>)}
            </select>
          </label>
          <label className="field">기록 보존 기간
            <select value={days} onChange={(e) => setDays(Number(e.target.value))}>
              {[30, 60, 90].map((d) => <option key={d} value={d}>실습 종료 후 {d}일</option>)}
            </select>
          </label>
        </div>
        <p className="meta">공간을 열면 {me.name} 선생님과 교생의 기기에만 암호 키가 전달됩니다. 보존 기간이 지나면 서버의 암호문도 삭제됩니다.</p>
        <div>
          <button className="btn primary" disabled={!student || taken.has(student) || busy} onClick={async () => {
            setBusy(true);
            try {
              await createRoom({ name: `교육실습 · ${me.name} × ${nameOf(student)}`, kind: "practicum", members: [student], by: me.id, expiresAt: Date.now() + days * 86_400_000 });
              toast.show(`${nameOf(student)} 교생과의 실습 공간을 열었습니다.`);
            } finally {
              setBusy(false);
            }
          }}>실습 공간 열기</button>
        </div>
      </div>
      {toast.node}
    </section>
  );
}

function Workspace({ roomId, isMentor }: { roomId: string; isMentor: boolean }) {
  const { view } = useApp();
  const v = view(roomId)!;
  const mentorId = v.room.createdBy;
  const data = useMemo(() => collect(v.events, mentorId), [v.events, mentorId]);
  const [sid, setSid] = useState("");
  const [stage, setStage] = useState<Stage>("plan");
  const [creating, setCreating] = useState(false);
  const cur = data.find((d) => d.session.sessionId === sid) ?? data[0];
  const days = v.room.expiresAt ? Math.max(0, Math.ceil((v.room.expiresAt - Date.now()) / 86_400_000)) : null;
  const studentId = v.room.members.find((m) => m !== mentorId) ?? "";

  const progress = (d: SessionData): Record<Stage, boolean> => ({
    plan: !!d.focus,
    observe: d.notes.length > 0,
    rubric: !!d.mentorScores && !!d.selfScores,
    feedback: !!d.feedback && !!d.reflection,
    record: !!d.feedback && !!d.reflection && !!d.mentorScores && !!d.selfScores,
  });

  return (
    <>
      <div className="panel">
        <div className="panel-head">
          <div className="row">
            <Avatar id={mentorId} /> <b>{nameOf(mentorId)}</b> <span className="meta">지도교사</span>
            <Avatar id={studentId} /> <b>{nameOf(studentId)}</b> <span className="meta">교생</span>
          </div>
          <div className="row">
            <span className="meta">{isMentor ? "지도교사로 접속" : "교생으로 접속"}{days !== null ? ` · ${days}일 뒤 자동 삭제` : ""}</span>
            <button className="btn sm no-print" onClick={() => setCreating((c) => !c)} aria-expanded={creating}>수업 추가</button>
          </div>
        </div>
        {creating && <NewSession roomId={roomId} mentorId={mentorId} onDone={(id) => { setCreating(false); if (id) { setSid(id); setStage("plan"); } }} />}
        {data.length > 0 && (
          <div className="panel-body no-print" style={{ paddingBottom: 0 }}>
            <div className="tabs" role="tablist" aria-label="수업 선택">
              {data.map((d) => (
                <button key={d.session.sessionId} role="tab" aria-selected={cur?.session.sessionId === d.session.sessionId} onClick={() => setSid(d.session.sessionId)}>
                  {d.session.date.slice(5).replace("-", "/")} {d.session.title}
                </button>
              ))}
            </div>
          </div>
        )}
        {!cur ? (
          <div className="panel-body"><Empty>아직 수업이 없습니다. ‘수업 추가’로 첫 관찰 수업을 등록하세요.</Empty></div>
        ) : (
          <div className="panel-body stack">
            <div className="row between">
              <div>
                <h2>{cur.session.title}</h2>
                <p className="meta" style={{ marginTop: 2 }}>{cur.session.date} · {cur.session.classId} · {cur.session.durationMin}분 · 수업자 {nameOf(studentId)}</p>
              </div>
            </div>
            <ol className="steps no-print" aria-label="진행 단계">
              {STAGES.map(([k, l]) => {
                const done = progress(cur)[k];
                return (
                  <li key={k} className={stage === k ? "cur" : done ? "done" : ""}>
                    <button onClick={() => setStage(k)} aria-current={stage === k ? "step" : undefined}>{l}</button>
                  </li>
                );
              })}
            </ol>
          </div>
        )}
      </div>
      {cur && (
        <div className="section" style={{ marginTop: 16 }}>
          {stage === "plan" && <Plan roomId={roomId} d={cur} isMentor={isMentor} />}
          {stage === "observe" && <Observe roomId={roomId} d={cur} />}
          {stage === "rubric" && <Rubric roomId={roomId} d={cur} isMentor={isMentor} />}
          {stage === "feedback" && <Feedback roomId={roomId} d={cur} isMentor={isMentor} />}
          {stage === "record" && <Record d={cur} mentorId={mentorId} studentId={studentId} days={days} />}
        </div>
      )}
    </>
  );
}

function NewSession({ roomId, mentorId, onDone }: { roomId: string; mentorId: string; onDone: (id?: string) => void }) {
  const { send } = useApp();
  const [s, setS] = useState({ title: "", date: new Date().toISOString().slice(0, 10), classId: "2-1", plan: "", durationMin: 45 });
  return (
    <div className="panel-body stack" style={{ borderBottom: "1px solid var(--line)", background: "var(--surface-sub)" }}>
      <div className="grid three">
        <label className="field">단원 · 수업 제목<input id="sess-title" type="text" value={s.title} onChange={(e) => setS({ ...s, title: e.target.value })} placeholder="예: 2-2 국어 · 설명문의 짜임" /></label>
        <label className="field">수업일<input id="sess-date" type="date" value={s.date} onChange={(e) => setS({ ...s, date: e.target.value })} /></label>
        <label className="field">학급<select id="sess-class" value={s.classId} onChange={(e) => setS({ ...s, classId: e.target.value })}>{CLASSES.map((c) => <option key={c}>{c}</option>)}</select></label>
      </div>
      <label className="field">수업 흐름 <span className="hint">지도안 요약</span><textarea id="sess-plan" value={s.plan} onChange={(e) => setS({ ...s, plan: e.target.value })} placeholder="도입(5) → 전개(30) → 정리(10)" /></label>
      <div className="row">
        <button className="btn primary" disabled={!s.title.trim()} onClick={async () => {
          const sessionId = `sess_${crypto.randomUUID().slice(0, 8)}`;
          await send(roomId, { type: "prac.session", sessionId, createdBy: mentorId, ...s, title: s.title.trim() });
          onDone(sessionId);
        }}>등록</button>
        <button className="btn" onClick={() => onDone()}>취소</button>
      </div>
    </div>
  );
}

function Plan({ roomId, d, isMentor }: { roomId: string; d: SessionData; isMentor: boolean }) {
  const { send } = useApp();
  const [tags, setTags] = useState<TagKey[]>(d.focus?.tags ?? []);
  const [q, setQ] = useState(d.focus?.question ?? "");
  const toast = useToast();
  const toggle = (k: TagKey) => setTags((t) => (t.includes(k) ? t.filter((x) => x !== k) : t.length >= 2 ? [t[1], k] : [...t, k]));
  return (
    <div className="grid two" style={{ alignItems: "start" }}>
      <section className="panel" aria-labelledby="plan-h">
        <div className="panel-head"><h3 id="plan-h">수업 흐름</h3></div>
        <div className="panel-body body">{d.session.plan || <span className="meta">지도안 요약이 없습니다.</span>}</div>
      </section>
      <section className="panel" aria-labelledby="focus-h">
        <div className="panel-head"><h3 id="focus-h">관찰 초점</h3><span className="meta">교생이 정합니다 · 최대 2개</span></div>
        <div className="panel-body stack">
          {!isMentor ? (
            <>
              <fieldset style={{ border: 0, padding: 0, margin: 0 }}>
                <legend className="field" style={{ marginBottom: 6 }}>피드백을 받고 싶은 영역</legend>
                <div className="row">
                  {TAGS.map((t) => (
                    <label key={t.key} className="choice">
                      <input type="checkbox" checked={tags.includes(t.key)} onChange={() => toggle(t.key)} />
                      {t.label}
                    </label>
                  ))}
                </div>
              </fieldset>
              <label className="field">지도교사에게 부탁할 점<textarea id="focus-q" value={q} onChange={(e) => setQ(e.target.value)} placeholder="예: 학생 답을 받은 뒤 이어서 묻는 발문이 자연스러운지 봐 주세요." /></label>
              <div><button className="btn primary" disabled={!tags.length} onClick={async () => { await send(roomId, { type: "prac.focus", sessionId: d.session.sessionId, tags, question: q.trim() }); toast.show("관찰 초점을 지도교사와 공유했습니다."); }}>초점 공유</button></div>
            </>
          ) : d.focus ? (
            <>
              <div className="row">{d.focus.tags.map((k) => <span key={k} className="badge" style={{ borderColor: tagColor(k), color: tagColor(k) }}>{tagLabel(k)}</span>)}</div>
              {d.focus.question && <p className="body">“{d.focus.question}”</p>}
              <p className="meta">수업 관찰 화면에서 이 영역의 버튼에 ‘교생이 요청한 초점’이 표시됩니다.</p>
            </>
          ) : (
            <Empty>교생이 아직 관찰 초점을 정하지 않았습니다.</Empty>
          )}
        </div>
      </section>
      {toast.node}
    </div>
  );
}

function Timeline({ notes, durationMin }: { notes: Note[]; durationMin: number }) {
  const total = durationMin * 60;
  const phases = [["도입", 5 / 45], ["전개", 30 / 45], ["정리", 10 / 45]] as const;
  let acc = 0;
  return (
    <div className="timeline" role="img" aria-label={`수업 ${durationMin}분 동안 관찰 기록 ${notes.length}개`}>
      {phases.map(([l, f]) => {
        const left = acc;
        acc += f;
        return <span key={l} className="phase" style={{ left: `${left * 100}%`, width: `${f * 100}%` }}><span>{l}</span></span>;
      })}
      {notes.map((n) => (
        <span key={n.noteId} className="mark" title={`${fmtClock(n.t)} ${tagLabel(n.tag)} · ${n.text}`} style={{ left: `${Math.min(100, (n.t / total) * 100)}%`, background: tagColor(n.tag) }} />
      ))}
      {[0, 0.25, 0.5, 0.75, 1].map((f) => <span key={f} className="tick" style={{ left: `${f * 100}%` }}>{Math.round(durationMin * f)}분</span>)}
    </div>
  );
}

function Observe({ roomId, d }: { roomId: string; d: SessionData }) {
  const { me, send } = useApp();
  const [startAt, setStartAt] = useState<number | null>(null);
  const [now, setNow] = useState(Date.now());
  const [tag, setTag] = useState<TagKey>(d.focus?.tags[0] ?? "question");
  const [text, setText] = useState("");
  const [manual, setManual] = useState("");
  const input = useRef<HTMLInputElement>(null);
  const counts = tagSummary(d.notes);
  const focus = d.focus?.tags ?? [];

  useEffect(() => {
    if (startAt === null) return;
    const id = window.setInterval(() => setNow(Date.now()), 500);
    return () => window.clearInterval(id);
  }, [startAt]);
  useEffect(() => {
    const on = (e: KeyboardEvent) => {
      if (!e.altKey) return;
      const i = Number(e.key) - 1;
      if (TAGS[i]) {
        e.preventDefault();
        setTag(TAGS[i].key);
        input.current?.focus();
      }
    };
    window.addEventListener("keydown", on);
    return () => window.removeEventListener("keydown", on);
  }, []);

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
    <div className="stack">
      <section className="panel" aria-labelledby="obs-h">
        <div className="panel-head">
          <h3 id="obs-h">관찰 기록</h3>
          <div className="row">
            <span className="clock" aria-label={`경과 ${fmtClock(elapsed)}`}>{fmtClock(elapsed)}</span>
            {startAt === null ? (
              <button className="btn" onClick={() => { setStartAt(Date.now()); setNow(Date.now()); }}><Play className="ico sm" aria-hidden /> 수업 시작</button>
            ) : (
              <button className="btn" onClick={() => setStartAt(null)}><Pause className="ico sm" aria-hidden /> 멈춤</button>
            )}
          </div>
        </div>
        <div className="panel-body stack">
          <div className="tagpad" role="radiogroup" aria-label="관찰 영역">
            {TAGS.map((t, i) => (
              <button key={t.key} role="radio" aria-checked={tag === t.key} className={`tagbtn ${focus.includes(t.key) ? "focus" : ""}`} onClick={() => setTag(t.key)}>
                <span><span className="dot" style={{ background: tagColor(t.key) }} />{t.label}</span>
                {focus.includes(t.key) ? <span className="focus-mark">교생이 요청한 초점</span> : <kbd>Alt+{i + 1}</kbd>}
              </button>
            ))}
          </div>
          <form className="row nowrap" onSubmit={(e) => { e.preventDefault(); void add(); }}>
            {startAt === null && <input type="text" value={manual} onChange={(e) => setManual(e.target.value)} placeholder="분:초" aria-label="시각(분:초)" style={{ width: 84 }} />}
            <input ref={input} type="text" value={text} onChange={(e) => setText(e.target.value)} placeholder="관찰한 장면을 사실대로 적으세요 (예: 발문 후 대기 시간 2초)" aria-label="관찰 메모" />
            <button className="btn primary" type="submit" disabled={!text.trim()}>기록</button>
          </form>
          <p className="meta">판단보다 장면을 먼저 적고, 학생 이름은 적지 않습니다. 교생도 다른 선생님의 수업을 참관할 때 이 화면에 기록할 수 있습니다.</p>
        </div>
      </section>
      <section className="panel" aria-labelledby="tl-h">
        <div className="panel-head"><h3 id="tl-h">시간대별 관찰 기록 {d.notes.length}개</h3>
          <div className="row">{TAGS.map((t) => <span key={t.key} className="legend"><i style={{ background: tagColor(t.key) }} />{t.label} {counts[t.key]}</span>)}</div>
        </div>
        <div className="panel-body">
          <Timeline notes={d.notes} durationMin={d.session.durationMin} />
          {d.notes.length === 0 ? <Empty>아직 기록이 없습니다.</Empty> : (
            <table className="sheet">
              <thead><tr><th scope="col">시각</th><th scope="col">영역</th><th scope="col">장면</th><th scope="col">기록</th></tr></thead>
              <tbody>
                {d.notes.map((n) => (
                  <tr key={n.noteId}>
                    <td className="mono">{fmtClock(n.t)}</td>
                    <td style={{ whiteSpace: "nowrap" }}><span className="dot" style={{ display: "inline-block", width: 8, height: 8, marginRight: 6, background: tagColor(n.tag) }} />{tagLabel(n.tag)}</td>
                    <td>{n.text}</td>
                    <td className="meta" style={{ whiteSpace: "nowrap" }}>{nameOf(n.author)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
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
    <div className="grid two" style={{ alignItems: "start" }}>
      <section className="panel" aria-labelledby="rb-h">
        <div className="panel-head"><h3 id="rb-h">{isMentor ? "지도교사 평가" : "교생 자기평가"}</h3>{mine && <span className="badge ok">제출함</span>}</div>
        <div className="panel-body">
          <p className="meta" style={{ marginBottom: 8 }}>두 사람이 모두 제출해야 비교 결과가 열립니다. 다시 제출하면 최신 값으로 바뀝니다.</p>
          <table className="sheet rubric">
            <tbody>
              {RUBRIC.map((r) => (
                <tr key={r.key}>
                  <th scope="row">{r.label}</th>
                  <td>
                    <div className="levels" role="radiogroup" aria-label={r.label}>
                      {r.levels.map((desc, i) => (
                        <button key={i} role="radio" aria-checked={draft[r.key] === i + 1} className="level" onClick={() => setDraft({ ...draft, [r.key]: i + 1 })}>
                          <b>{i + 1}</b>{desc}
                        </button>
                      ))}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <button className="btn primary" style={{ marginTop: 12 }} disabled={!complete} onClick={async () => {
            await send(roomId, { type: "prac.score", sessionId: d.session.sessionId, by: isMentor ? "mentor" : "self", scores: draft });
            toast.show("평가를 제출했습니다.");
          }}>제출</button>
        </div>
        {toast.node}
      </section>
      <section className="panel" aria-labelledby="gap-h">
        <div className="panel-head"><h3 id="gap-h">자기평가와 지도교사 평가</h3></div>
        <div className="panel-body">
          {!both ? (
            <Notice kind="plain">
              지도교사 평가 {d.mentorScores ? "제출됨" : "대기"} · 자기평가 {d.selfScores ? "제출됨" : "대기"}
              <p className="meta" style={{ marginTop: 4 }}>두 평가가 모두 모이면, 차이가 가장 큰 영역을 피드백 협의 주제로 제안합니다.</p>
            </Notice>
          ) : (
            <>
              <div className="row" style={{ marginBottom: 6 }}>
                <span className="legend"><i className="s" />교생 자기평가</span>
                <span className="legend"><i className="m" />지도교사</span>
                <span className="meta">눈금 1 – 4</span>
              </div>
              {g.rows.map((r) => (
                <div key={r.key} className="gap-row">
                  <span>{r.label}</span>
                  <span className="gap-track" role="img" aria-label={`${r.label}: 자기평가 ${r.self}, 지도교사 ${r.mentor}`}>
                    {r.mentor !== undefined && <span className="m" style={{ left: `${((r.mentor - 1) / 3) * 100}%` }} />}
                    {r.self !== undefined && <span className="s" style={{ left: `${((r.self - 1) / 3) * 100}%` }} />}
                  </span>
                  <span className={`badge ${r.gap ? "warn" : "ok"}`}>{r.gap === 0 ? "일치" : `${r.gap! > 0 ? "+" : ""}${r.gap}`}</span>
                </div>
              ))}
              {g.topic && <div style={{ marginTop: 12 }}><Notice kind="info"><b>피드백 협의 주제</b><br />{g.topic}</Notice></div>}
            </>
          )}
        </div>
      </section>
    </div>
  );
}

function Feedback({ roomId, d, isMentor }: { roomId: string; d: SessionData; isMentor: boolean }) {
  const { send } = useApp();
  const [fb, setFb] = useState({ glow: d.feedback?.glow ?? "", grow: d.feedback?.grow ?? "", next: d.feedback?.next ?? "" });
  const [ref, setRef] = useState(d.reflection?.text ?? "");
  const toast = useToast();
  const focusNotes = d.focus ? d.notes.filter((n) => d.focus!.tags.includes(n.tag)) : [];
  return (
    <div className="stack">
      {d.focus && (
        <Notice kind="info">
          <b>교생이 요청한 초점: {d.focus.tags.map(tagLabel).join(", ")}</b> · 관련 기록 {focusNotes.length}개
          {focusNotes.length > 0 && <ul style={{ margin: "4px 0 0", paddingLeft: 18 }}>{focusNotes.map((n) => <li key={n.noteId}>{fmtClock(n.t)} {n.text}</li>)}</ul>}
        </Notice>
      )}
      <div className="grid two" style={{ alignItems: "start" }}>
        <section className="panel" aria-labelledby="fb-h">
          <div className="panel-head"><h3 id="fb-h">지도교사 피드백</h3></div>
          <div className="panel-body stack">
            {isMentor ? (
              <>
                <label className="field">잘된 점 <span className="hint">장면과 효과를 함께</span><textarea id="fb-glow" value={fb.glow} onChange={(e) => setFb({ ...fb, glow: e.target.value })} /></label>
                <label className="field">다음에 바꿔 볼 점 <span className="hint">한두 가지에 집중</span><textarea id="fb-grow" value={fb.grow} onChange={(e) => setFb({ ...fb, grow: e.target.value })} /></label>
                <label className="field">다음 수업 목표 <span className="hint">관찰할 수 있는 행동으로</span><input id="fb-next" type="text" value={fb.next} onChange={(e) => setFb({ ...fb, next: e.target.value })} placeholder="예: 후속 발문 3회 이상" /></label>
                <div><button className="btn primary" disabled={!fb.glow.trim() || !fb.grow.trim()} onClick={async () => { await send(roomId, { type: "prac.feedback", sessionId: d.session.sessionId, ...fb }); toast.show("피드백을 교생에게 전달했습니다."); }}>교생에게 전달</button></div>
              </>
            ) : d.feedback ? (
              <table className="sheet">
                <tbody>
                  <tr><th scope="row">잘된 점</th><td className="body">{d.feedback.glow}</td></tr>
                  <tr><th scope="row">바꿔 볼 점</th><td className="body">{d.feedback.grow}</td></tr>
                  <tr><th scope="row">다음 목표</th><td className="body">{d.feedback.next}</td></tr>
                </tbody>
              </table>
            ) : (
              <Empty>아직 피드백이 없습니다.</Empty>
            )}
          </div>
        </section>
        <section className="panel" aria-labelledby="rf-h">
          <div className="panel-head"><h3 id="rf-h">교생 성찰</h3>{d.reflection && <span className="meta">{timeLabel(d.reflection.at)}</span>}</div>
          <div className="panel-body stack">
            {!isMentor ? (
              <>
                <label className="field">수업을 돌아보며 <span className="hint">계획과 달랐던 장면, 그때의 판단, 다음에 바꿀 것</span><textarea id="rf-text" style={{ minHeight: 160 }} value={ref} onChange={(e) => setRef(e.target.value)} /></label>
                <div><button className="btn primary" disabled={!ref.trim()} onClick={async () => { await send(roomId, { type: "prac.reflect", sessionId: d.session.sessionId, text: ref.trim() }); toast.show("성찰을 지도교사와 공유했습니다."); }}>지도교사와 공유</button></div>
              </>
            ) : d.reflection ? (
              <p className="body" style={{ whiteSpace: "pre-wrap" }}>{d.reflection.text}</p>
            ) : (
              <Empty>교생이 아직 성찰을 쓰지 않았습니다.</Empty>
            )}
          </div>
        </section>
      </div>
      {toast.node}
    </div>
  );
}

function Record({ d, mentorId, studentId, days }: { d: SessionData; mentorId: string; studentId: string; days: number | null }) {
  const g = gapAnalysis(d.selfScores, d.mentorScores);
  return (
    <section className="panel" aria-labelledby="rec-h">
      <div className="panel-head">
        <h2 id="rec-h">수업 참관록</h2>
        {inFrame ? <span className="meta no-print">인쇄는 앱을 브라우저에서 직접 열었을 때 할 수 있습니다.</span> : (
          <button className="btn no-print" onClick={() => window.print()}><Printer className="ico sm" aria-hidden /> 인쇄 · PDF</button>
        )}
      </div>
      <div className="panel-body stack">
        <table className="sheet">
          <tbody>
            <tr><th scope="row">실습생</th><td>{nameOf(studentId)}</td><th scope="row">지도교사</th><td>{nameOf(mentorId)}</td></tr>
            <tr><th scope="row">수업일</th><td>{d.session.date}</td><th scope="row">학급</th><td>{d.session.classId} ({d.session.durationMin}분)</td></tr>
            <tr><th scope="row">단원</th><td colSpan={3}>{d.session.title}</td></tr>
            <tr><th scope="row">관찰 초점</th><td colSpan={3}>{d.focus ? `${d.focus.tags.map(tagLabel).join(", ")} — ${d.focus.question}` : "—"}</td></tr>
          </tbody>
        </table>
        <h3>1. 관찰 기록</h3>
        <Timeline notes={d.notes} durationMin={d.session.durationMin} />
        <table className="sheet">
          <thead><tr><th scope="col">시각</th><th scope="col">영역</th><th scope="col">장면</th></tr></thead>
          <tbody>{d.notes.map((n) => <tr key={n.noteId}><td className="mono">{fmtClock(n.t)}</td><td>{tagLabel(n.tag)}</td><td>{n.text}</td></tr>)}</tbody>
        </table>
        <h3>2. 평가 비교</h3>
        <table className="sheet">
          <thead><tr><th scope="col">영역</th><th scope="col" className="num">자기평가</th><th scope="col" className="num">지도교사</th><th scope="col" className="num">차이</th></tr></thead>
          <tbody>{g.rows.map((r) => <tr key={r.key}><td>{r.label}</td><td className="num">{r.self ?? "—"}</td><td className="num">{r.mentor ?? "—"}</td><td className="num">{r.gap ?? "—"}</td></tr>)}</tbody>
        </table>
        {g.topic && <p className="small"><b>협의 주제</b> · {g.topic}</p>}
        <h3>3. 피드백 협의</h3>
        <table className="sheet">
          <tbody>
            <tr><th scope="row">잘된 점</th><td>{d.feedback?.glow ?? "—"}</td></tr>
            <tr><th scope="row">바꿔 볼 점</th><td>{d.feedback?.grow ?? "—"}</td></tr>
            <tr><th scope="row">다음 목표</th><td>{d.feedback?.next ?? "—"}</td></tr>
            <tr><th scope="row">교생 성찰</th><td style={{ whiteSpace: "pre-wrap" }}>{d.reflection?.text ?? "—"}</td></tr>
          </tbody>
        </table>
        <p className="meta">참관록에는 학생 개인을 특정하는 정보를 적지 않습니다. 원본 기록은 두 사람의 기기에서만 열리며{days !== null ? `, ${days}일 뒤 서버에서 삭제됩니다` : ""}.</p>
      </div>
    </section>
  );
}
