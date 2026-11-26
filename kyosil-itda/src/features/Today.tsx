import { useState } from "react";
import type { Go, Page } from "../App";
import type { CoverRequest } from "../core/approval";
import { DAYS, nameOf, PERIOD_TIMES, PERIODS, TIMETABLE } from "../core/school";
import { useApp } from "../state";
import { inFrame, Notice } from "../ui/common";

export const todayIndex = () => {
  const d = new Date().getDay(); // 0 Sun .. 6 Sat
  return d >= 1 && d <= 5 ? d - 1 : 0;
};

/** Dates (M/D) of this school week, Monday first; weekends show next week. */
export function weekDates(base = new Date()) {
  const d = new Date(base);
  const dow = d.getDay();
  d.setDate(d.getDate() + (dow === 0 ? 1 : dow === 6 ? 2 : 1 - dow));
  return DAYS.map((_, i) => {
    const x = new Date(d);
    x.setDate(d.getDate() + i);
    return `${x.getMonth() + 1}/${x.getDate()}`;
  });
}

export interface Change { label: string; note: string }

/** What applied cover/swap decisions change in one person's week. */
export function changesFor(owner: string, requests: CoverRequest[]) {
  const map = new Map<string, Change>();
  for (const r of requests) {
    if (r.status !== "APPLIED") continue;
    const at = (d: number, p: number) => `${d}-${p}`;
    if (r.kind === "swap" && r.swapWith) {
      if (r.candidateId === owner) {
        map.set(at(r.day, r.period), { label: r.classId, note: `교체 · ${nameOf(r.absentId)} 수업` });
        map.set(at(r.swapWith.day, r.swapWith.period), { label: "—", note: `교체 → ${nameOf(r.absentId)}` });
      }
      if (r.absentId === owner) {
        map.set(at(r.day, r.period), { label: "—", note: `교체 → ${nameOf(r.candidateId)}` });
        map.set(at(r.swapWith.day, r.swapWith.period), { label: r.swapWith.classId, note: `교체 · ${nameOf(r.candidateId)} 수업` });
      }
    } else {
      if (r.candidateId === owner) map.set(at(r.day, r.period), { label: r.classId, note: `대강 · ${nameOf(r.absentId)}` });
      if (r.absentId === owner) map.set(at(r.day, r.period), { label: "결강", note: `대강 ${nameOf(r.candidateId)}` });
    }
  }
  return map;
}

export function WeekTable({ owner, requests, caption }: { owner: string; requests: CoverRequest[]; caption: string }) {
  const day = todayIndex();
  const dates = weekDates();
  const changes = changesFor(owner, requests);
  return (
    <div className="scroll-x">
      <table className="tt">
        <caption className="sr">{caption}</caption>
        <thead>
          <tr>
            <th scope="col" style={{ width: 76 }}>교시</th>
            {DAYS.map((d, i) => (
              <th key={d} scope="col" className={i === day ? "today" : ""}>
                {d} <span style={{ fontWeight: 400, fontSize: 12 }}>{dates[i]}</span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: PERIODS }, (_, p) => (
            <FragmentRow key={p} p={p}>
              <tr>
                <th scope="row">{p + 1}교시<small>{PERIOD_TIMES[p]}</small></th>
                {DAYS.map((_, d) => {
                  const l = TIMETABLE[owner]?.[d]?.[p];
                  const c = changes.get(`${d}-${p}`);
                  if (d === 4 && p === 6) return <td key={d}><small>동아리</small></td>;
                  return (
                    <td key={d} className={`${c ? "change" : ""} ${d === day && !c ? "today" : ""}`}>
                      {c ? (<><b>{c.label}</b><small>{c.note}</small></>) : l ? (<><b>{l.classId}</b><small>{l.subject}</small></>) : null}
                    </td>
                  );
                })}
              </tr>
            </FragmentRow>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function FragmentRow({ p, children }: { p: number; children: React.ReactNode }) {
  return (
    <>
      {children}
      {p === 3 && (
        <tr className="lunch">
          <th scope="row">점심</th>
          <td colSpan={5}>12:30 – 13:30</td>
        </tr>
      )}
    </>
  );
}

const TOUR: { as: string; page: Page; title: string; what: string }[] = [
  { as: "t3", page: "today", title: "박민지 · 시간표 담당", what: "결재 대기와 이번 주 시간표 변경을 확인합니다." },
  { as: "t1", page: "cover", title: "김하늘 · 국어", what: "강지호 선생님의 대강 요청과 인수인계 카드를 읽고 동의합니다." },
  { as: "t3", page: "cover", title: "박민지 · 시간표 담당", what: "결재란에 결재하면 두 선생님의 시간표가 바뀝니다." },
  { as: "t5", page: "cover", title: "정유나 · 사회", what: "내 결강을 등록하고, 교체 우선 제안과 대강 후보 비교표를 봅니다." },
  { as: "s1", page: "practicum", title: "오세린 · 교생", what: "계획 협의에서 ‘관찰받고 싶은 초점’을 정합니다." },
  { as: "t1", page: "practicum", title: "김하늘 · 지도교사", what: "초점에 맞춰 관찰 기록을 남기고 자기평가와 비교합니다." },
  { as: "t1", page: "trust", title: "보안 확인", what: "서버에 저장된 암호문을 보고, 위조 메시지가 걸러지는지 실험합니다." },
];

function Tour({ go }: { go: Go }) {
  const [done, setDone] = useState<number[]>(() => {
    try {
      return JSON.parse(sessionStorage.getItem("kyosil:tour") || "[]");
    } catch {
      return [];
    }
  });
  const mark = (i: number) => {
    const next = [...new Set([...done, i])];
    setDone(next);
    try {
      sessionStorage.setItem("kyosil:tour", JSON.stringify(next));
    } catch {
      /* ignore */
    }
  };
  return (
    <section className="panel" aria-labelledby="tour-h">
      <div className="panel-head">
        <h2 id="tour-h">시연 안내 · 7단계</h2>
        <span className="meta">버튼을 누르면 그 사람으로 바뀌어 해당 화면이 열립니다</span>
      </div>
      <div className="panel-body" style={{ paddingTop: 4, paddingBottom: 4 }}>
        <ol className="tour">
          {TOUR.map((t, i) => (
            <li key={i} className={done.includes(i) ? "done" : ""}>
              <div className="what"><b>{t.title}</b>{t.what}</div>
              <button className="btn sm" onClick={() => { mark(i); go(t.page, t.as); }}>열기</button>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

export function Today({ go, openMine }: { go: Go; openMine: number }) {
  const { me, requests } = useApp();
  const owner = me.role === "student-teacher" ? (me.id === "s2" ? "t2" : "t1") : me.id;
  const consent = requests.filter((r) => r.status === "AWAITING_CONSENT" && r.candidateId === me.id);
  const approve = me.role === "coordinator" ? requests.filter((r) => r.status === "AWAITING_COORDINATOR") : [];

  return (
    <>
      <div className="page-head">
        <div>
          <div className="crumb">{weekDates()[todayIndex()]} {DAYS[todayIndex()]}요일</div>
          <h1>{me.name} {me.role === "student-teacher" ? "교생" : "선생님"}의 이번 주</h1>
          <p className="lead">
            {me.role === "student-teacher" ? `지도교사 ${nameOf(owner)} 선생님의 시간표입니다.` : "교체·대강이 반영된 칸은 노란색으로 표시됩니다."}
          </p>
        </div>
      </div>

      <div className="grid two" style={{ alignItems: "start" }}>
        <section className="panel" aria-labelledby="tt-h">
          <div className="panel-head"><h2 id="tt-h">주간 시간표</h2><span className="meta">수업 45분 · 쉬는 시간 10분</span></div>
          <div className="panel-body"><WeekTable owner={owner} requests={requests} caption={`${nameOf(owner)} 주간 시간표`} /></div>
        </section>

        <div className="stack">
          <section className="panel" aria-labelledby="todo-h">
            <div className="panel-head"><h2 id="todo-h">처리할 일</h2></div>
            <div className="panel-body stack tight">
              {consent.length + approve.length + openMine === 0 && <p className="muted">처리할 요청이 없습니다.</p>}
              {consent.map((r) => (
                <button key={r.reqId} className="btn" style={{ justifyContent: "space-between", whiteSpace: "normal", textAlign: "left", minHeight: 48 }} onClick={() => go("cover")}>
                  <span>{nameOf(r.requesterId)} 선생님 {r.kind === "swap" ? "교체" : "대강"} 요청 · {DAYS[r.day]} {r.period + 1}교시 {r.classId}</span>
                  <span className="badge warn">동의 필요</span>
                </button>
              ))}
              {approve.map((r) => (
                <button key={r.reqId} className="btn" style={{ justifyContent: "space-between", whiteSpace: "normal", textAlign: "left", minHeight: 48 }} onClick={() => go("cover")}>
                  <span>{nameOf(r.absentId)} → {nameOf(r.candidateId)} {r.kind === "swap" ? "교체" : "대강"} · {DAYS[r.day]} {r.period + 1}교시</span>
                  <span className="badge info">결재 대기</span>
                </button>
              ))}
              {openMine > 0 && <p className="meta">내가 올린 요청 {openMine}건이 진행 중입니다.</p>}
            </div>
          </section>
          <Tour go={go} />
          {inFrame && (
            <Notice kind="plain">
              이 화면은 한 창에서 사람을 바꿔 가며 시연합니다. 각 사람은 자기 기기 키로만 내용을 엽니다.
            </Notice>
          )}
        </div>
      </div>
    </>
  );
}
