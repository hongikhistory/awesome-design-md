import { ChevronDown } from "lucide-react";
import { useMemo, useState } from "react";
import { isOpen, STATUS_LABEL, type CoverRequest, type HandoffCard } from "../core/approval";
import {
  DEFAULT_WEIGHTS,
  privacyCheck,
  recommend,
  slotsFor,
  swapOptions,
  WEIGHT_LABEL,
  type Candidate,
  type Slot,
  type SwapOption,
  type Weights,
} from "../core/cover";
import { COVER_HISTORY, DAYS, nameOf, PEOPLE, PERIOD_TIMES, person, TIMETABLE } from "../core/school";
import { josa } from "../core/josa";
import { ROOM } from "../core/seed";
import { timeLabel, useApp } from "../state";
import { Avatar, Empty, Notice, useToast } from "../ui/common";
import { todayIndex } from "./Today";

const emptyCard: HandoffCard = { goal: "", progress: "", activity: "", materials: "", notes: "" };
const FACTORS = Object.keys(WEIGHT_LABEL) as (keyof Weights)[];

export function Cover() {
  const { me, view, requests } = useApp();
  const wf = view(ROOM.workflow);

  if (!wf) {
    return (
      <>
        <div className="page-head"><div><h1>결강 처리</h1></div></div>
        <Notice kind="plain">
          <b>이 업무 공간을 열 수 있는 권한이 없습니다.</b>
          <p className="muted" style={{ marginTop: 4 }}>
            ‘결강 처리’ 공간의 암호 키는 교직원에게만 전달됩니다. {me.name} 님의 기기에는 키가 없어 내용을 열 수 없고, 서버도 같은 이유로 읽지 못합니다.
          </p>
        </Notice>
      </>
    );
  }

  const open = requests.filter((r) => isOpen(r.status));
  const closed = requests.filter((r) => !isOpen(r.status));
  return (
    <>
      <div className="page-head">
        <div>
          <div className="crumb">업무 · 결강 처리</div>
          <h1>결강 처리 (교체 · 보결)</h1>
          <p className="lead">맞바꿀 수 있는 수업(교체)을 먼저 찾고, 없으면 보결을 요청합니다. 요청은 상대 교사 동의와 시간표 담당 결재를 거쳐 시간표에 반영됩니다.</p>
        </div>
      </div>
      <NewRequest />
      <section className="section" aria-labelledby="open-h">
        <h2 id="open-h">진행 중 <span className="meta">{open.length}건</span></h2>
        {open.length === 0 ? <Empty>진행 중인 요청이 없습니다.</Empty> : <div className="stack">{open.map((r) => <RequestCard key={r.reqId} r={r} />)}</div>}
      </section>
      {closed.length > 0 && (
        <section className="section" aria-labelledby="closed-h">
          <h2 id="closed-h">처리 완료 <span className="meta">{closed.length}건</span></h2>
          <div className="stack">{closed.map((r) => <RequestCard key={r.reqId} r={r} />)}</div>
        </section>
      )}
    </>
  );
}

function FairnessBoard({ history, highlight }: { history: Record<string, number>; highlight: string[] }) {
  const teachers = PEOPLE.filter((p) => p.role !== "student-teacher").sort((a, b) => (history[b.id] ?? 0) - (history[a.id] ?? 0));
  const max = Math.max(1, ...teachers.map((t) => history[t.id] ?? 0));
  return (
    <section className="panel" aria-labelledby="fair-h">
      <div className="panel-head"><h3 id="fair-h">보결 현황</h3><span className="meta">최근 4주 · 이번 주 결재 포함</span></div>
      <div className="panel-body">
        {teachers.map((t) => (
          <div key={t.id} className={`fair-row ${highlight.includes(t.id) ? "me" : ""}`}>
            <span>{t.name}</span>
            <span className="bar" aria-hidden="true"><span style={{ width: `${((history[t.id] ?? 0) / max) * 100}%` }} /></span>
            <span className="num" style={{ textAlign: "right" }}>{history[t.id] ?? 0}회</span>
          </div>
        ))}
        <p className="meta" style={{ marginTop: 8 }}>추천의 ‘형평성’ 점수는 이 횟수로 계산합니다.</p>
      </div>
    </section>
  );
}

function NewRequest() {
  const { me, send, requests } = useApp();
  const toast = useToast();
  const [absentId, setAbsent] = useState(me.role === "coordinator" ? "t5" : me.id);
  const [day, setDay] = useState(todayIndex());
  const [slot, setSlot] = useState<Slot | null>(null);
  const [weights, setWeights] = useState<Weights>(DEFAULT_WEIGHTS);
  const [pick, setPick] = useState<{ kind: "cover"; c: Candidate } | { kind: "swap"; o: SwapOption } | null>(null);
  const [card, setCard] = useState<HandoffCard>(emptyCard);
  const [busy, setBusy] = useState(false);

  const absent = person(absentId);
  const slots = useMemo(() => slotsFor(absentId, day, TIMETABLE), [absentId, day]);
  const assigned = useMemo(() => {
    const out: Record<string, [number, number][]> = {};
    for (const r of requests)
      if (isOpen(r.status) || r.status === "APPLIED") {
        (out[r.candidateId] ??= []).push([r.day, r.period]);
        if (r.kind === "swap" && r.swapWith) (out[r.absentId] ??= []).push([r.swapWith.day, r.swapWith.period]);
      }
    return out;
  }, [requests]);
  const history = useMemo(() => {
    const h = { ...COVER_HISTORY };
    for (const r of requests) if (r.status === "APPLIED" && r.kind !== "swap") h[r.candidateId] = (h[r.candidateId] ?? 0) + 1;
    return h;
  }, [requests]);
  const ctx = { people: PEOPLE, timetable: TIMETABLE, history, assigned, unavailable: [absentId] };
  const candidates = useMemo(() => (slot ? recommend(slot, ctx, weights) : []), [slot, history, assigned, weights]); // eslint-disable-line react-hooks/exhaustive-deps
  const swaps = useMemo(() => (slot ? swapOptions(slot, ctx).slice(0, 4) : []), [slot, assigned]); // eslint-disable-line react-hooks/exhaustive-deps
  const already = (s: Slot) => requests.find((r) => r.absentId === s.absentId && r.day === s.day && r.period === s.period && (isOpen(r.status) || r.status === "APPLIED"));
  const warnings = privacyCheck(Object.values(card).join("\n"));
  const partnerId = pick ? (pick.kind === "cover" ? pick.c.personId : pick.o.personId) : null;

  if (me.role === "student-teacher") return null;
  const canPickOthers = me.role === "coordinator";

  const submit = async () => {
    if (!slot || !pick) return;
    setBusy(true);
    try {
      const base = { type: "cover.request" as const, reqId: `req_${crypto.randomUUID().slice(0, 8)}`, absentId, day: slot.day, period: slot.period, classId: slot.lesson.classId, subject: slot.lesson.subject, card };
      if (pick.kind === "cover") await send(ROOM.workflow, { ...base, kind: "cover", candidateId: pick.c.personId, score: pick.c.score, factors: pick.c.factors });
      else
        await send(ROOM.workflow, {
          ...base,
          kind: "swap",
          candidateId: pick.o.personId,
          score: 0,
          factors: [],
          swapWith: { day: pick.o.day, period: pick.o.period, classId: pick.o.lesson.classId, subject: pick.o.lesson.subject },
        });
      toast.show(`${nameOf(partnerId!)} 선생님께 ${pick.kind === "swap" ? "교체" : "보결"} 요청을 보냈습니다.`);
      setSlot(null);
      setPick(null);
      setCard(emptyCard);
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="panel" aria-labelledby="new-h">
      <div className="panel-head"><h2 id="new-h">결강 등록</h2>{!canPickOthers && <span className="meta">본인 결강만 등록할 수 있습니다</span>}</div>
      <div className="panel-body stack">
        <div className="grid three">
          <label className="field">결강 교사
            <select value={absentId} disabled={!canPickOthers} onChange={(e) => { setAbsent(e.target.value); setSlot(null); setPick(null); }}>
              {PEOPLE.filter((p) => p.role !== "student-teacher").map((p) => <option key={p.id} value={p.id}>{p.name} ({p.subject})</option>)}
            </select>
          </label>
          <label className="field">결강일
            <select value={day} onChange={(e) => { setDay(Number(e.target.value)); setSlot(null); setPick(null); }}>
              {DAYS.map((d, i) => <option key={d} value={i}>{d}요일</option>)}
            </select>
          </label>
        </div>

        <fieldset style={{ border: 0, padding: 0, margin: 0 }}>
          <legend className="field" style={{ marginBottom: 6 }}>{absent?.name} 선생님의 {DAYS[day]}요일 수업</legend>
          {slots.length === 0 ? <Empty>이날 수업이 없습니다.</Empty> : (
            <div className="row">
              {slots.map((s) => {
                const dup = already(s);
                return (
                  <label key={s.period} className="choice" style={dup ? { opacity: 0.6 } : undefined} title={dup ? STATUS_LABEL[dup.status] : undefined}>
                    <input type="radio" name="slot" disabled={!!dup} checked={slot?.period === s.period} onChange={() => { setSlot(s); setPick(null); setCard(emptyCard); }} />
                    {s.period + 1}교시 {s.lesson.classId}{dup ? " · 요청됨" : ""}
                  </label>
                );
              })}
            </div>
          )}
        </fieldset>

        {slot && (
          <div className="grid" style={{ gridTemplateColumns: "minmax(0, 1fr) minmax(220px, 280px)", alignItems: "start" }}>
            <div className="stack" style={{ minWidth: 0 }}>
              <div>
                <h3>① 교체 가능한 수업 <span className="meta">수업 결손·추가 근무 없음</span></h3>
                {swaps.length === 0 ? (
                  <p className="meta" style={{ marginTop: 6 }}>{slot.lesson.classId} 학급에서 맞바꿀 수 있는 수업이 없습니다. 아래 보결 후보를 확인하세요.</p>
                ) : (
                  <div className="scroll-x" style={{ marginTop: 8 }}>
                    <table className="sheet">
                      <thead><tr><th scope="col">선택</th><th scope="col">교사</th><th scope="col">바꾸는 방법</th></tr></thead>
                      <tbody>
                        {swaps.map((o) => {
                          const sel = pick?.kind === "swap" && pick.o === o;
                          const id = `swap-${o.personId}-${o.day}-${o.period}`;
                          return (
                            <tr key={id} className={`clickable ${sel ? "selected" : ""}`} onClick={() => setPick({ kind: "swap", o })}>
                              <td><input id={id} type="radio" name="pick" checked={sel} onChange={() => setPick({ kind: "swap", o })} /></td>
                              <td><label htmlFor={id}>{nameOf(o.personId)} <span className="meta">{person(o.personId)?.subject}</span></label></td>
                              <td>{DAYS[slot.day]} {slot.period + 1}교시 {slot.lesson.classId} 수업은 {nameOf(o.personId)} 선생님이, {DAYS[o.day]} {o.period + 1}교시 {o.lesson.classId} {o.lesson.subject} 수업은 {absent?.name} 선생님이 맡습니다.</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              <div>
                <div className="row between">
                  <h3>② 보결 후보 비교 <span className="meta">{DAYS[slot.day]} {slot.period + 1}교시({PERIOD_TIMES[slot.period]})에 공강인 선생님</span></h3>
                </div>
                {candidates.length === 0 ? <Empty>이 시간에 공강인 선생님이 없습니다. 시간표 담당과 상의해 주세요.</Empty> : (
                  <div className="scroll-x" style={{ marginTop: 8 }}>
                    <table className="sheet">
                      <thead>
                        <tr>
                          <th scope="col">선택</th><th scope="col">교사</th>
                          {FACTORS.map((k) => <th key={k} scope="col">{WEIGHT_LABEL[k]}</th>)}
                          <th scope="col" className="num">합계</th>
                        </tr>
                      </thead>
                      <tbody>
                        {candidates.slice(0, 5).map((c) => {
                          const sel = pick?.kind === "cover" && pick.c.personId === c.personId;
                          const id = `cand-${c.personId}`;
                          return (
                            <tr key={c.personId} className={`clickable ${sel ? "selected" : ""}`} onClick={() => setPick({ kind: "cover", c })}>
                              <td><input id={id} type="radio" name="pick" checked={sel} onChange={() => setPick({ kind: "cover", c })} /></td>
                              <td style={{ whiteSpace: "nowrap" }}><label htmlFor={id}><b>{nameOf(c.personId)}</b><br /><span className="meta">{person(c.personId)?.subject}</span></label></td>
                              {FACTORS.map((k) => {
                                const f = c.factors.find((x) => x.key === k)!;
                                return (
                                  <td key={k}><div className="factor-cell"><span className={`pts ${f.points < 0 ? "neg" : ""}`}>{f.points > 0 ? "+" : ""}{f.points}</span><span className="why">{f.reason}</span></div></td>
                                );
                              })}
                              <td className="num"><span className="score-cell">{c.score}</span></td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
                <details style={{ marginTop: 10 }}>
                  <summary className="btn sm" style={{ listStyle: "none", display: "inline-flex" }}><ChevronDown className="ico sm" aria-hidden /> 학교 기준(가중치) 조정</summary>
                  <div className="panel sub" style={{ marginTop: 8 }}>
                    <div className="panel-body grid three">
                      {FACTORS.map((k) => (
                        <label key={k} className="field">{WEIGHT_LABEL[k]} <span className="hint">{weights[k]}점</span>
                          <input type="range" min={0} max={50} value={weights[k]} onChange={(e) => setWeights((w) => ({ ...w, [k]: Number(e.target.value) }))} />
                        </label>
                      ))}
                      <div><button className="btn sm" onClick={() => setWeights(DEFAULT_WEIGHTS)}>기본값으로</button></div>
                    </div>
                  </div>
                </details>
              </div>
            </div>
            <FairnessBoard history={history} highlight={partnerId ? [partnerId] : []} />
          </div>
        )}

        {slot && pick && (
          <div className="handoff">
            <div className="handoff-title" aria-label="수업 인수인계서">수 업 인 수 인 계 서</div>
            <table className="sheet" style={{ borderTop: 0 }}>
              <tbody>
                <tr><th scope="row">수업</th><td>{DAYS[slot.day]}요일 {slot.period + 1}교시 ({PERIOD_TIMES[slot.period]}) · {slot.lesson.classId} {slot.lesson.subject}</td></tr>
                <tr><th scope="row">인계</th><td>{absent?.name} → {nameOf(partnerId!)} ({pick.kind === "swap" ? "교체" : "보결"})</td></tr>
                {([["goal", "학습 목표", "예: 임진왜란의 전개 과정을 지도에서 설명할 수 있다.", true], ["progress", "진도", "예: 교과서 84쪽까지", false], ["activity", "활동 안내", "예: 활동지 2번 모둠 활동 20분", true], ["materials", "자료 위치", "예: 교무실 책상 오른쪽 서랍", false], ["notes", "학급 유의사항", "학생을 특정하지 않게 적습니다. 예: 모둠 4는 자원 발표로", false]] as [keyof HandoffCard, string, string, boolean][]).map(([k, label, ph, req]) => (
                  <tr key={k}>
                    <th scope="row"><label htmlFor={`card-${k}`}>{label}{req && <span style={{ color: "var(--danger)" }}> *</span>}</label></th>
                    <td><textarea id={`card-${k}`} rows={k === "notes" ? 2 : 2} value={card[k]} onChange={(e) => setCard({ ...card, [k]: e.target.value })} placeholder={ph} aria-required={req} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="stack" style={{ padding: 12 }}>
              {warnings.length > 0 && (
                <Notice kind="warn" role="alert">
                  <b>개인정보 점검</b>
                  <ul style={{ margin: "4px 0 0", paddingLeft: 18 }}>{warnings.map((w, i) => <li key={i}>“{w.match}”: {w.hint}</li>)}</ul>
                </Notice>
              )}
              <div className="row">
                <button className="btn primary" disabled={busy || (pick.kind === "cover" && (!card.goal.trim() || !card.activity.trim()))} onClick={submit}>
                  {warnings.length ? "경고를 확인하고 요청 보내기" : `${pick.kind === "swap" ? "교체" : "보결"} 요청 보내기`}
                </button>
                <span className="meta">{pick.kind === "cover" ? "보결 요청에는 학습 목표와 활동 안내를 꼭 적어야 합니다." : "교체 요청은 인수인계서를 비워 두어도 됩니다."} 인수인계서는 교직원만 열 수 있게 암호화됩니다.</span>
              </div>
            </div>
          </div>
        )}
      </div>
      {toast.node}
    </section>
  );
}

function stampOf(r: CoverRequest, who: string, text: string) {
  return r.audit.find((a) => a.ok && a.actorId === who && a.text.startsWith(text));
}

function Kyeoljae({ r }: { r: CoverRequest }) {
  const req = r.audit[0];
  const consent = stampOf(r, r.candidateId, "동의");
  const declined = stampOf(r, r.candidateId, "거절");
  const decided = r.audit.find((a) => a.ok && (a.text.startsWith("결재") || a.text.startsWith("반려") || a.text.startsWith("동의 생략")));
  const coordinator = PEOPLE.find((p) => p.role === "coordinator")!;
  const cell = (a: typeof req | undefined, label: string, voidLabel?: string) =>
    a ? <span className={`stamp ${voidLabel ? "void" : ""}`}>{voidLabel ?? label}</span> : <span className="stamp-wait">미처리</span>;
  const date = (a?: { at: number }) => (a ? new Date(a.at).toLocaleDateString("ko-KR", { month: "numeric", day: "numeric" }) : "");
  return (
    <table className="kyeoljae" aria-label="결재란">
      <tbody>
        <tr>
          <th rowSpan={3} scope="rowgroup" className="side-label">결재</th>
          <th scope="col" className="head">요청</th>
          <th scope="col" className="head">{r.kind === "swap" ? "교체 교사" : "보결 교사"}</th>
          <th scope="col" className="head">시간표 담당</th>
        </tr>
        <tr className="stamps">
          <td>{cell(req, "요청")}</td>
          <td>{declined ? cell(declined, "", "거절") : r.consentSkipped && !consent ? <span className="stamp-wait">생략</span> : cell(consent, "동의")}</td>
          <td>{decided ? cell(decided, "결재", decided.text.startsWith("반려") ? "반려" : undefined) : r.status === "CANCELLED" ? <span className="stamp-wait">취소</span> : cell(undefined, "")}</td>
        </tr>
        <tr className="foot">
          <td>{nameOf(r.requesterId)} {date(req)}</td>
          <td>{nameOf(r.candidateId)} {date(consent ?? declined)}</td>
          <td>{coordinator.name} {date(decided)}</td>
        </tr>
      </tbody>
    </table>
  );
}

function RequestCard({ r }: { r: CoverRequest }) {
  const { me, send } = useApp();
  const [comment, setComment] = useState("");
  const [skipReason, setSkipReason] = useState("");
  const [showCard, setShowCard] = useState(r.candidateId === me.id && isOpen(r.status));
  const [showAudit, setShowAudit] = useState(false);
  const act = (payload: Parameters<typeof send>[1]) => send(ROOM.workflow, payload);
  const kind = r.kind === "swap" ? "교체" : "보결";
  const tone = r.status === "APPLIED" ? "ok" : isOpen(r.status) ? "info" : "danger";
  const hasCard = Object.values(r.card).some((v) => v.trim());

  return (
    <article className="panel" aria-label={`${kind} 요청 ${DAYS[r.day]} ${r.period + 1}교시 ${r.classId}`}>
      <div className="panel-body" style={{ display: "flex", gap: 20, flexWrap: "wrap", justifyContent: "space-between" }}>
        <div className="stack tight" style={{ minWidth: 0, flex: "1 1 320px" }}>
          <div className="row">
            <span className="badge">{kind}</span>
            <span className={`badge ${tone}`}>{STATUS_LABEL[r.status]}</span>
          </div>
          <h3>{DAYS[r.day]}요일 {r.period + 1}교시 · {r.classId} {r.subject}</h3>
          <div className="row small">
            <Avatar id={r.absentId} /> {nameOf(r.absentId)} <span className="meta">결강</span>
            <span aria-hidden="true">→</span>
            <Avatar id={r.candidateId} /> {nameOf(r.candidateId)} <span className="meta">{kind}</span>
          </div>
          {r.kind === "swap" && r.swapWith && (
            <p className="small muted">맞바꾸는 수업: {DAYS[r.swapWith.day]} {r.swapWith.period + 1}교시 {r.swapWith.classId} {r.swapWith.subject} → {nameOf(r.absentId)}</p>
          )}
          {r.kind !== "swap" && r.factors.length > 0 && (
            <p className="meta">추천 근거(합계 {r.score}점): {r.factors.filter((f) => f.points !== 0).map((f) => f.reason).join(", ")}</p>
          )}
          {r.consentSkipped && <Notice kind="warn">동의 없이 결재됨 · 사유: {r.consentSkipped}</Notice>}
          <div className="row">
            {hasCard && <button className="btn sm" aria-expanded={showCard} onClick={() => setShowCard((s) => !s)}>인수인계서 {showCard ? "닫기" : "보기"}</button>}
            <button className="btn sm" aria-expanded={showAudit} onClick={() => setShowAudit((s) => !s)}>처리 기록 {r.audit.length}건</button>
          </div>
        </div>
        <Kyeoljae r={r} />
      </div>

      {(showCard || showAudit) && (
        <div className="panel-body" style={{ borderTop: "1px solid var(--line)" }}>
          {showCard && (
            <table className="sheet">
              <tbody>
                {([["goal", "학습 목표"], ["progress", "진도"], ["activity", "활동 안내"], ["materials", "자료 위치"], ["notes", "학급 유의사항"]] as [keyof HandoffCard, string][]).map(([k, l]) => (
                  <tr key={k}><th scope="row">{l}</th><td className="body">{r.card[k] || "—"}</td></tr>
                ))}
              </tbody>
            </table>
          )}
          {showAudit && (
            <ol className="small" style={{ margin: showCard ? "12px 0 0" : 0, paddingLeft: 20 }}>
              {r.audit.map((a, i) => (
                <li key={i} style={a.ok ? undefined : { color: "var(--text-meta)" }}>{timeLabel(a.at)} · {nameOf(a.actorId)} · {a.text}</li>
              ))}
            </ol>
          )}
        </div>
      )}

      {r.status === "AWAITING_CONSENT" && r.candidateId === me.id && (
        <div className="panel-body" style={{ borderTop: "1px solid var(--line)", background: "var(--primary-bg)" }}>
          <b>{nameOf(r.requesterId)} 선생님이 {josa(kind, "을/를")} 요청했습니다.</b>
          <div className="row nowrap" style={{ marginTop: 8 }}>
            <input type="text" value={comment} onChange={(e) => setComment(e.target.value)} placeholder="남길 말 (선택)" aria-label="응답 메모" />
            <button className="btn primary" onClick={() => act({ type: "cover.consent", reqId: r.reqId, accept: true, comment: comment.trim() || undefined })}>동의</button>
            <button className="btn danger" onClick={() => act({ type: "cover.consent", reqId: r.reqId, accept: false, comment: comment.trim() || undefined })}>거절</button>
          </div>
        </div>
      )}

      {me.role === "coordinator" && isOpen(r.status) && (
        <div className="panel-body" style={{ borderTop: "1px solid var(--line)", background: "var(--surface-sub)" }}>
          {r.status === "AWAITING_COORDINATOR" ? (
            <div className="row">
              <b style={{ marginRight: "auto" }}>시간표 담당 결재</b>
              <button className="btn primary" onClick={() => act({ type: "cover.decide", reqId: r.reqId, approve: true })}>결재 · 시간표 반영</button>
              <button className="btn danger" onClick={() => act({ type: "cover.decide", reqId: r.reqId, approve: false, reason: "다른 방법으로 처리" })}>반려</button>
            </div>
          ) : (
            <div className="stack tight">
              <b>상대 교사의 동의 전입니다</b>
              <p className="meta">급할 때만 사유를 남기고 동의 없이 결재할 수 있습니다. 사유는 처리 기록에 남습니다.</p>
              <div className="row nowrap">
                <input type="text" value={skipReason} onChange={(e) => setSkipReason(e.target.value)} placeholder="동의 생략 사유 (필수)" aria-label="동의 생략 사유" />
                <button className="btn" disabled={!skipReason.trim()} onClick={() => act({ type: "cover.decide", reqId: r.reqId, approve: true, skipConsent: true, reason: skipReason.trim() })}>동의 없이 결재</button>
              </div>
            </div>
          )}
        </div>
      )}

      {r.requesterId === me.id && isOpen(r.status) && (
        <div className="panel-body" style={{ borderTop: "1px solid var(--line)", paddingTop: 10, paddingBottom: 10 }}>
          <button className="btn sm text" onClick={() => act({ type: "cover.cancel", reqId: r.reqId })}>요청 취소</button>
        </div>
      )}
      {r.requesterId === me.id && r.status === "DECLINED" && (
        <div className="panel-body" style={{ borderTop: "1px solid var(--line)" }}>
          <p className="meta">상대 교사가 거절했습니다. 위의 ‘결강 등록’에서 같은 교시를 다시 골라 다른 선생님께 요청하세요.</p>
        </div>
      )}
    </article>
  );
}

