import { useMemo, useState } from "react";
import { isOpen, STATUS_LABEL, type CoverRequest, type HandoffCard } from "../core/approval";
import { DEFAULT_WEIGHTS, privacyCheck, recommend, slotsFor, WEIGHT_LABEL, type Candidate, type Slot, type Weights } from "../core/cover";
import { COVER_HISTORY, DAYS, nameOf, PEOPLE, person, TIMETABLE } from "../core/school";
import { ROOM } from "../core/seed";
import { timeLabel, useApp } from "../state";
import { Avatar, Empty, useToast } from "../ui/common";
import { todayIndex } from "./Today";

const emptyCard: HandoffCard = { goal: "", progress: "", activity: "", materials: "", notes: "" };

export function Cover() {
  const { me, view, requests } = useApp();
  const wf = view(ROOM.workflow);

  if (!wf) {
    return (
      <>
        <div className="page-head"><div><h1>대강 추천 · 승인</h1></div></div>
        <div className="card">
          <h2>🔒 이 업무방의 구성원이 아닙니다</h2>
          <p className="muted" style={{ marginTop: 8 }}>
            {me.name} 님의 기기에는 ‘대강·교체 업무’ 방 키가 봉인되어 있지 않아 내용을 복호화할 수 없습니다. 교생은 교직원 업무 흐름에서 분리됩니다. 서버도 같은 이유로 이 내용을 읽을 수 없습니다.
          </p>
        </div>
      </>
    );
  }

  const open = requests.filter((r) => isOpen(r.status));
  const closed = requests.filter((r) => !isOpen(r.status));
  return (
    <>
      <div className="page-head">
        <div>
          <h1>대강 추천 · 승인</h1>
          <p>공강인 선생님을 형평성·부담·교과 연계로 점수화해 근거와 함께 추천합니다. 결정은 사람이 합니다. 대강 교사 동의 → 시간표 담당 승인 → 반영의 3단계로 처리합니다.</p>
        </div>
      </div>
      <NewRequest />
      <h2 style={{ margin: "26px 0 10px" }}>진행 중 <span className="pill gray">{open.length}</span></h2>
      {open.length === 0 && <Empty>진행 중인 요청이 없습니다.</Empty>}
      <div className="stack">{open.map((r) => <RequestCard key={r.reqId} r={r} />)}</div>
      {closed.length > 0 && (
        <>
          <h2 style={{ margin: "26px 0 10px" }}>완료 · 종료 <span className="pill gray">{closed.length}</span></h2>
          <div className="stack">{closed.map((r) => <RequestCard key={r.reqId} r={r} />)}</div>
        </>
      )}
    </>
  );
}

function NewRequest() {
  const { me, send, requests } = useApp();
  const toast = useToast();
  const [absentId, setAbsent] = useState(me.id);
  const [day, setDay] = useState(todayIndex());
  const [slot, setSlot] = useState<Slot | null>(null);
  const [weights, setWeights] = useState<Weights>(DEFAULT_WEIGHTS);
  const [showWeights, setShowWeights] = useState(false);
  const [pick, setPick] = useState<Candidate | null>(null);
  const [card, setCard] = useState<HandoffCard>(emptyCard);
  const [busy, setBusy] = useState(false);

  const absent = person(absentId);
  const slots = useMemo(() => slotsFor(absentId, day, TIMETABLE), [absentId, day]);

  // Covers already promised (open or applied) block those people at those times.
  const assigned = useMemo(() => {
    const out: Record<string, [number, number][]> = {};
    for (const r of requests) if (isOpen(r.status) || r.status === "APPLIED") (out[r.candidateId] ??= []).push([r.day, r.period]);
    return out;
  }, [requests]);
  const history = useMemo(() => {
    const h = { ...COVER_HISTORY };
    for (const r of requests) if (r.status === "APPLIED") h[r.candidateId] = (h[r.candidateId] ?? 0) + 1;
    return h;
  }, [requests]);

  const candidates = useMemo(
    () => (slot ? recommend(slot, { people: PEOPLE, timetable: TIMETABLE, history, assigned }, weights) : []),
    [slot, history, assigned, weights],
  );
  const already = (s: Slot) => requests.find((r) => r.absentId === s.absentId && r.day === s.day && r.period === s.period && (isOpen(r.status) || r.status === "APPLIED"));
  const warnings = privacyCheck(Object.values(card).join("\n"));

  if (me.role === "student-teacher") return null;
  const canPickOthers = me.role === "coordinator";

  const choose = (s: Slot) => {
    setSlot(s);
    setPick(null);
    setCard({ ...emptyCard, goal: "", progress: "", activity: "", materials: "", notes: "" });
  };

  const submit = async () => {
    if (!slot || !pick) return;
    setBusy(true);
    try {
      await send(ROOM.workflow, {
        type: "cover.request",
        reqId: `req_${crypto.randomUUID().slice(0, 8)}`,
        absentId,
        day: slot.day,
        period: slot.period,
        classId: slot.lesson.classId,
        subject: slot.lesson.subject,
        candidateId: pick.personId,
        score: pick.score,
        factors: pick.factors,
        card,
      });
      toast.show(`${nameOf(pick.personId)} 선생님께 대강 요청과 인수인계 카드를 보냈습니다.`);
      setSlot(null);
      setPick(null);
      setCard(emptyCard);
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="card" aria-labelledby="new-h">
      <h2 id="new-h">대강 요청 만들기</h2>
      <div className="grid three" style={{ marginTop: 12 }}>
        <label className="field">결강 교사
          <select value={absentId} disabled={!canPickOthers} onChange={(e) => { setAbsent(e.target.value); setSlot(null); }}>
            {PEOPLE.filter((p) => p.role !== "student-teacher").map((p) => <option key={p.id} value={p.id}>{p.name} · {p.subject}</option>)}
          </select>
        </label>
        <label className="field">요일
          <select value={day} onChange={(e) => { setDay(Number(e.target.value)); setSlot(null); }}>
            {DAYS.map((d, i) => <option key={d} value={i}>{d}요일</option>)}
          </select>
        </label>
        <div className="field">
          <span>학교 정책</span>
          <button className="btn ghost" onClick={() => setShowWeights((s) => !s)}>{showWeights ? "가중치 닫기" : "추천 가중치 조정"}</button>
        </div>
      </div>
      {!canPickOthers && <p className="tiny muted" style={{ marginTop: 6 }}>본인 결강만 요청할 수 있습니다. 시간표 담당은 다른 교사의 결강도 등록할 수 있습니다.</p>}

      {showWeights && (
        <div className="note-box" style={{ marginTop: 12 }}>
          <p className="small" style={{ marginBottom: 8 }}>학교 협의로 정한 기준을 반영합니다. 값이 클수록 그 기준을 중요하게 봅니다.</p>
          <div className="grid three">
            {(Object.keys(WEIGHT_LABEL) as (keyof Weights)[]).map((k) => (
              <label key={k} className="field">{WEIGHT_LABEL[k]} · {weights[k]}
                <input type="range" min={0} max={50} value={weights[k]} onChange={(e) => setWeights((w) => ({ ...w, [k]: Number(e.target.value) }))} />
              </label>
            ))}
          </div>
          <button className="btn ghost sm" style={{ marginTop: 8 }} onClick={() => setWeights(DEFAULT_WEIGHTS)}>기본값</button>
        </div>
      )}

      <h3 style={{ margin: "16px 0 8px" }}>{absent?.name} 선생님의 {DAYS[day]}요일 수업</h3>
      {slots.length === 0 && <Empty>이날 수업이 없습니다.</Empty>}
      <div className="row">
        {slots.map((s) => {
          const dup = already(s);
          return (
            <button key={s.period} className="btn ghost" aria-pressed={slot?.period === s.period} disabled={!!dup}
              style={slot?.period === s.period ? { borderColor: "var(--accent)", background: "var(--accent-soft)" } : undefined}
              onClick={() => choose(s)} title={dup ? `이미 요청됨 · ${STATUS_LABEL[dup.status]}` : undefined}>
              {s.period + 1}교시 · {s.lesson.classId} {s.lesson.subject}{dup ? " ✓" : ""}
            </button>
          );
        })}
      </div>

      {slot && (
        <>
          <h3 style={{ margin: "18px 0 4px" }}>추천 후보 · {DAYS[slot.day]} {slot.period + 1}교시에 공강인 선생님</h3>
          <p className="tiny muted" style={{ marginBottom: 10 }}>막대는 각 기준의 점수입니다. 피로 항목은 감점입니다. 이 점수는 참고용이며 최종 선택은 요청자가 합니다.</p>
          {candidates.length === 0 && <Empty>이 시간에 비어 있는 선생님이 없습니다. 시간표 담당과 교체를 협의하세요.</Empty>}
          <div className="grid two">
            {candidates.slice(0, 4).map((c, i) => (
              <button key={c.personId} className="cand" aria-pressed={pick?.personId === c.personId} onClick={() => setPick(c)}>
                <div className="row between">
                  <div className="row"><Avatar id={c.personId} /><div><b>{nameOf(c.personId)}</b><div className="tiny muted">{person(c.personId)?.subject} · {person(c.personId)?.room}</div></div></div>
                  <div style={{ textAlign: "right" }}><div className="score">{c.score}</div>{i === 0 && <span className="pill">추천 1순위</span>}</div>
                </div>
                <div className="factors">
                  {c.factors.map((f) => (
                    <div key={f.key} className={`factor ${f.points < 0 ? "neg" : ""}`}>
                      <span className="muted">{WEIGHT_LABEL[f.key]}</span>
                      <span className="bar" title={f.reason}><span style={{ width: `${f.max ? (f.points / f.max) * 100 : Math.min(100, (Math.abs(f.points) / Math.max(1, weights.fatigue)) * 100)}%` }} /></span>
                      <span className="tiny" style={{ textAlign: "right" }}>{f.points > 0 ? "+" : ""}{f.points}</span>
                      <span className="tiny faint" style={{ gridColumn: "2 / 4", marginTop: -4 }}>{f.reason}</span>
                    </div>
                  ))}
                </div>
              </button>
            ))}
          </div>
        </>
      )}

      {slot && pick && (
        <div className="card flat" style={{ marginTop: 16, background: "var(--tint)" }}>
          <div className="row between">
            <h3>수업 인수인계 카드 → {nameOf(pick.personId)} 선생님</h3>
            <span className="pill gray">{slot.lesson.classId} · {slot.lesson.subject} · {DAYS[slot.day]} {slot.period + 1}교시</span>
          </div>
          <div className="grid two" style={{ marginTop: 10 }}>
            <label className="field">학습 목표<textarea value={card.goal} onChange={(e) => setCard({ ...card, goal: e.target.value })} placeholder="예: 비유와 상징의 차이를 설명할 수 있다." /></label>
            <label className="field">진도<textarea value={card.progress} onChange={(e) => setCard({ ...card, progress: e.target.value })} placeholder="예: 교과서 84쪽까지" /></label>
            <label className="field">활동 안내<textarea value={card.activity} onChange={(e) => setCard({ ...card, activity: e.target.value })} placeholder="예: 활동지 2번 모둠 활동 20분" /></label>
            <label className="field">준비물 · 자료 위치<textarea value={card.materials} onChange={(e) => setCard({ ...card, materials: e.target.value })} placeholder="예: 활동지는 교무실 책상 서랍" /></label>
          </div>
          <label className="field" style={{ marginTop: 10 }}>학급 유의사항 (학생을 특정하지 마세요)
            <textarea value={card.notes} onChange={(e) => setCard({ ...card, notes: e.target.value })} placeholder="예: 모둠 4는 자원 발표로 진행" />
          </label>
          {warnings.length > 0 && (
            <div className="note-box warn small" role="alert" style={{ marginTop: 10 }}>
              <b>개인정보 점검</b>
              <ul style={{ margin: "6px 0 0", paddingLeft: 18 }}>
                {warnings.map((w, i) => <li key={i}>“{w.match}” · {w.hint}</li>)}
              </ul>
            </div>
          )}
          <div className="row" style={{ marginTop: 12 }}>
            <button className="btn primary" disabled={busy || !card.goal.trim() || !card.activity.trim()} onClick={submit}>
              {warnings.length ? "경고를 확인했고 그대로 보내기" : "대강 요청 보내기"}
            </button>
            <span className="tiny muted">학습 목표와 활동 안내는 필수입니다. 카드는 업무방 구성원만 열 수 있게 암호화됩니다.</span>
          </div>
        </div>
      )}
      {toast.node}
    </section>
  );
}

function RequestCard({ r }: { r: CoverRequest }) {
  const { me, send } = useApp();
  const [comment, setComment] = useState("");
  const [skipReason, setSkipReason] = useState("");
  const [showCard, setShowCard] = useState(r.candidateId === me.id);
  const [showAudit, setShowAudit] = useState(false);
  const act = (payload: Parameters<typeof send>[1]) => send(ROOM.workflow, payload);

  const stepState = (i: number) => {
    const order = ["AWAITING_CONSENT", "AWAITING_COORDINATOR", "APPLIED"];
    const cur = order.indexOf(r.status);
    if (r.status === "DECLINED") return i === 0 ? "fail" : "";
    if (r.status === "REJECTED") return i === 0 ? "done" : i === 1 ? "fail" : "";
    if (r.status === "CANCELLED") return "";
    if (r.status === "APPLIED") return "done";
    return i < cur ? "done" : i === cur ? "cur" : "";
  };
  const statusPill = r.status === "APPLIED" ? "ok" : isOpen(r.status) ? "" : "danger";

  return (
    <article className="card" aria-label={`대강 요청 ${r.classId}`}>
      <div className="row between">
        <div className="row">
          <Avatar id={r.absentId} />
          <span className="muted">→</span>
          <Avatar id={r.candidateId} />
          <div>
            <b>{DAYS[r.day]}요일 {r.period + 1}교시 · {r.classId} {r.subject}</b>
            <div className="tiny muted">{nameOf(r.absentId)} 선생님 결강 → {nameOf(r.candidateId)} 선생님 대강 · 추천 점수 {r.score} · {timeLabel(r.createdAt)}</div>
          </div>
        </div>
        <span className={`pill ${statusPill}`}>{STATUS_LABEL[r.status]}</span>
      </div>
      <div className="steps" style={{ marginTop: 12 }}>
        <div className={`step ${stepState(0)}`}>1 · 대강 교사 동의</div>
        <div className={`step ${stepState(1)}`}>2 · 시간표 담당 승인</div>
        <div className={`step ${stepState(2)}`}>3 · 시간표 반영</div>
      </div>
      {r.consentSkipped && <p className="note-box warn tiny" style={{ marginTop: 8 }}>동의 생략 승인 · 사유: {r.consentSkipped}</p>}

      <div className="row" style={{ marginTop: 10 }}>
        <button className="btn ghost sm" onClick={() => setShowCard((s) => !s)}>{showCard ? "인수인계 카드 닫기" : "인수인계 카드 보기"}</button>
        <button className="btn ghost sm" onClick={() => setShowAudit((s) => !s)}>처리 기록 {r.audit.length}건</button>
        <span className="tiny faint">추천 근거: {r.factors.filter((f) => f.points !== 0).map((f) => f.reason).join(" · ")}</span>
      </div>

      {showCard && (
        <dl className="note-box small" style={{ marginTop: 10, display: "grid", gridTemplateColumns: "110px 1fr", gap: "6px 12px" }}>
          <dt className="muted">학습 목표</dt><dd style={{ margin: 0 }}>{r.card.goal || "—"}</dd>
          <dt className="muted">진도</dt><dd style={{ margin: 0 }}>{r.card.progress || "—"}</dd>
          <dt className="muted">활동 안내</dt><dd style={{ margin: 0 }}>{r.card.activity || "—"}</dd>
          <dt className="muted">준비물</dt><dd style={{ margin: 0 }}>{r.card.materials || "—"}</dd>
          <dt className="muted">유의사항</dt><dd style={{ margin: 0 }}>{r.card.notes || "—"}</dd>
        </dl>
      )}
      {showAudit && (
        <ol className="small" style={{ margin: "10px 0 0", paddingLeft: 18 }}>
          {r.audit.map((a, i) => (
            <li key={i} className={a.ok ? "" : "faint"}>{timeLabel(a.at)} · {nameOf(a.actorId)} · {a.text}</li>
          ))}
        </ol>
      )}

      {r.status === "AWAITING_CONSENT" && r.candidateId === me.id && (
        <div className="note-box accent" style={{ marginTop: 12 }}>
          <b className="small">대강 요청이 왔습니다. 수업을 맡아 주실 수 있나요?</b>
          <input type="text" style={{ marginTop: 8 }} value={comment} onChange={(e) => setComment(e.target.value)} placeholder="한마디 (선택)" aria-label="응답 메모" />
          <div className="row" style={{ marginTop: 8 }}>
            <button className="btn ok" onClick={() => act({ type: "cover.consent", reqId: r.reqId, accept: true, comment: comment.trim() || undefined })}>맡겠습니다</button>
            <button className="btn danger" onClick={() => act({ type: "cover.consent", reqId: r.reqId, accept: false, comment: comment.trim() || undefined })}>어렵습니다</button>
          </div>
        </div>
      )}

      {me.role === "coordinator" && isOpen(r.status) && (
        <div className="note-box" style={{ marginTop: 12 }}>
          <b className="small">시간표 담당 처리</b>
          {r.status === "AWAITING_COORDINATOR" ? (
            <div className="row" style={{ marginTop: 8 }}>
              <button className="btn primary" onClick={() => act({ type: "cover.decide", reqId: r.reqId, approve: true })}>승인 · 시간표 반영</button>
              <button className="btn danger" onClick={() => act({ type: "cover.decide", reqId: r.reqId, approve: false, reason: "다른 교사와 교체로 처리" })}>반려</button>
            </div>
          ) : (
            <div style={{ marginTop: 8 }}>
              <p className="tiny muted">대강 교사의 동의 전입니다. 급할 때만 사유를 남기고 동의 없이 반영할 수 있으며, 사유는 처리 기록에 남습니다.</p>
              <div className="row" style={{ marginTop: 6, flexWrap: "nowrap" }}>
                <input type="text" value={skipReason} onChange={(e) => setSkipReason(e.target.value)} placeholder="동의 생략 사유 (필수)" aria-label="동의 생략 사유" />
                <button className="btn" disabled={!skipReason.trim()} onClick={() => act({ type: "cover.decide", reqId: r.reqId, approve: true, skipConsent: true, reason: skipReason.trim() })}>동의 없이 반영</button>
              </div>
            </div>
          )}
        </div>
      )}

      {r.requesterId === me.id && isOpen(r.status) && (
        <button className="btn ghost sm" style={{ marginTop: 10 }} onClick={() => act({ type: "cover.cancel", reqId: r.reqId })}>요청 취소</button>
      )}
      {r.requesterId === me.id && r.status === "DECLINED" && (
        <p className="tiny muted" style={{ marginTop: 8 }}>대강 교사가 사양했습니다. 위에서 같은 교시를 다시 선택하면 다음 후보를 고를 수 있습니다.</p>
      )}
    </article>
  );
}
