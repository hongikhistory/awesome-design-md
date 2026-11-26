import type { Page } from "../App";
import { isOpen, STATUS_LABEL } from "../core/approval";
import { DAYS, nameOf, PERIODS, TIMETABLE } from "../core/school";
import { ROOM } from "../core/seed";
import { useApp } from "../state";

export const todayIndex = () => {
  const d = new Date().getDay(); // 0 Sun .. 6 Sat
  return d >= 1 && d <= 5 ? d - 1 : 0;
};

export function Today({ go }: { go: (p: Page) => void }) {
  const { me, requests, views } = useApp();
  const day = todayIndex();
  const weekend = ![1, 2, 3, 4, 5].includes(new Date().getDay());
  const owner = me.role === "student-teacher" ? "t1" : me.id;
  const covers = requests.filter((r) => r.status === "APPLIED" && r.candidateId === owner);

  const todo = [
    ...requests.filter((r) => r.status === "AWAITING_CONSENT" && r.candidateId === me.id).map((r) => ({ id: r.reqId, text: `${nameOf(r.requesterId)} 선생님의 대강 요청에 응답해 주세요 · ${DAYS[r.day]} ${r.period + 1}교시 ${r.classId}`, page: "cover" as Page })),
    ...(me.role === "coordinator"
      ? requests.filter((r) => r.status === "AWAITING_COORDINATOR").map((r) => ({ id: r.reqId, text: `승인 대기 · ${nameOf(r.absentId)} → ${nameOf(r.candidateId)} (${DAYS[r.day]} ${r.period + 1}교시)`, page: "cover" as Page }))
      : []),
    ...requests.filter((r) => r.requesterId === me.id && isOpen(r.status)).map((r) => ({ id: r.reqId + "m", text: `내 요청 진행 중 · ${STATUS_LABEL[r.status]}`, page: "cover" as Page })),
  ];
  const prac = views.find((v) => v.room.roomId === ROOM.practicum);
  const unreadWidgets = views.reduce((n, v) => n + v.events.filter((e) => e.payload.type === "widget.create").length, 0);

  return (
    <>
      <div className="page-head">
        <div>
          <h1>{me.name} 선생님, 안녕하세요</h1>
          <p>
            {DAYS[day]}요일{weekend ? " (주말이라 월요일 시간표를 보여 줍니다)" : ""} · {me.role === "student-teacher" ? "지도교사 김하늘 선생님의 시간표" : "내 시간표"}
          </p>
        </div>
      </div>

      <div className="grid two">
        <section className="card" aria-labelledby="tt-h">
          <div className="row between" style={{ marginBottom: 10 }}>
            <h2 id="tt-h">이번 주 시간표</h2>
            <span className="pill gray">파란 칸: 수업 · 주황 칸: 대강</span>
          </div>
          <div className="scroll-x">
            <table className="tt">
              <thead>
                <tr>
                  <th scope="col" style={{ width: 38 }}>교시</th>
                  {DAYS.map((d, i) => (
                    <th key={d} scope="col" style={i === day ? { color: "var(--accent)" } : undefined}>{d}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {Array.from({ length: PERIODS }, (_, p) => (
                  <tr key={p}>
                    <th scope="row">{p + 1}</th>
                    {DAYS.map((_, d) => {
                      const l = TIMETABLE[owner]?.[d]?.[p];
                      const c = covers.find((r) => r.day === d && r.period === p);
                      return (
                        <td key={d} className={`${l ? "has" : ""} ${c ? "cover" : ""} ${d === day ? "now" : ""}`}>
                          {c ? `대강 ${c.classId}` : l ? `${l.classId}` : ""}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <div className="stack">
          <section className="card" aria-labelledby="todo-h">
            <h2 id="todo-h">할 일</h2>
            <div className="stack" style={{ marginTop: 10 }}>
              {todo.length === 0 && <p className="muted small">처리할 요청이 없습니다.</p>}
              {todo.map((t) => (
                <button key={t.id} className="btn ghost" style={{ justifyContent: "flex-start", whiteSpace: "normal", textAlign: "left" }} onClick={() => go(t.page)}>
                  {t.text}
                </button>
              ))}
            </div>
          </section>

          <section className="card" aria-labelledby="glance-h">
            <h2 id="glance-h">한눈에</h2>
            <div className="grid three" style={{ marginTop: 12 }}>
              <div>
                <div className="stat">{views.length}</div>
                <div className="muted small">복호화할 수 있는 방</div>
              </div>
              <div>
                <div className="stat">{unreadWidgets}</div>
                <div className="muted small">공동 위젯</div>
              </div>
              <div>
                <div className="stat">{(TIMETABLE[owner]?.[day] ?? []).filter((l) => !l).length}</div>
                <div className="muted small">오늘 공강 교시</div>
              </div>
            </div>
            {prac && (
              <button className="btn primary" style={{ marginTop: 14 }} onClick={() => go("practicum")}>
                교생실습 공간 열기 · {prac.room.name.replace("교생실습 · ", "")}
              </button>
            )}
          </section>

          <section className="note-box accent small">
            <b>시연 팁</b> · 왼쪽 아래 “새 탭에서 다른 사람으로 열기”를 누르면 같은 화면을 다른 사람 입장에서 볼 수 있습니다. 한쪽에서 위젯을 체크하거나 대강을 승인하면 다른 탭에 바로 반영됩니다.
          </section>
        </div>
      </div>
    </>
  );
}
