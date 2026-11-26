import { useEffect, useState } from "react";
import { isOpen } from "./core/approval";
import { PEOPLE, ROLE_LABEL } from "./core/school";
import { About } from "./features/About";
import { Cover } from "./features/Cover";
import { Practicum } from "./features/Practicum";
import { Rooms } from "./features/Rooms";
import { Today } from "./features/Today";
import { Trust } from "./features/Trust";
import { useApp } from "./state";
import { Avatar, inFrame } from "./ui/common";

export type Page = "today" | "rooms" | "cover" | "practicum" | "trust" | "about";

const NAV: { id: Page; label: string; short: string; ico: string }[] = [
  { id: "today", label: "오늘", short: "오늘", ico: "☀" },
  { id: "rooms", label: "대화방 · 공동 위젯", short: "대화", ico: "✉" },
  { id: "cover", label: "대강 추천 · 승인", short: "대강", ico: "⇄" },
  { id: "practicum", label: "교생실습 참관", short: "실습", ico: "✎" },
  { id: "trust", label: "서버가 보는 것", short: "보안", ico: "⚿" },
  { id: "about", label: "소개 · 설계", short: "소개", ico: "ⓘ" },
];

const pageFromHash = (): Page => {
  const h = location.hash.replace(/^#\/?/, "").split("?")[0] as Page;
  return NAV.some((n) => n.id === h) ? h : "today";
};

export function App() {
  const { ready, error, me, setMe, requests, resetDemo } = useApp();
  const [page, setPage] = useState<Page>(pageFromHash);
  const [armReset, setArmReset] = useState(false);

  useEffect(() => {
    const on = () => setPage(pageFromHash());
    window.addEventListener("hashchange", on);
    return () => window.removeEventListener("hashchange", on);
  }, []);

  const go = (p: Page) => {
    location.hash = `/${p}`;
    setPage(p);
    window.scrollTo({ top: 0 });
  };

  const pending = requests.filter(
    (r) =>
      (r.status === "AWAITING_CONSENT" && r.candidateId === me.id) ||
      (me.role === "coordinator" && isOpen(r.status)),
  ).length;

  const switcher = (id: string) => (
    <div className="persona" title="데모: 탭마다 다른 사람으로 접속해 실시간 동기화를 확인할 수 있습니다">
      <Avatar id={me.id} />
      <div className="who">
        <label className="sr" htmlFor={id}>접속한 사람</label>
        <select id={id} value={me.id} onChange={(e) => setMe(e.target.value)}>
          {PEOPLE.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name} · {p.role === "student-teacher" ? "교생" : p.subject}
            </option>
          ))}
        </select>
        <div className="tiny muted">{ROLE_LABEL[me.role]} · 이 기기 전용 키</div>
      </div>
    </div>
  );

  const nav = (cls = "") =>
    NAV.map((n) => (
      <button key={n.id} className={`nav-btn ${cls}`} aria-current={page === n.id ? "page" : undefined} onClick={() => go(n.id)}>
        <span className="nav-ico" aria-hidden="true">{n.ico}</span>
        <span>{cls ? n.short : n.label}</span>
        {!cls && n.id === "cover" && pending > 0 && <span className="count">{pending}</span>}
      </button>
    ));

  return (
    <div className="shell">
      <aside className="side" aria-label="주 메뉴">
        <div className="brand">
          <img src="./icon.svg" alt="" />
          <div>
            교실잇다
            <small>설치 없는 학교 협업</small>
          </div>
        </div>
        {nav()}
        <div className="side-foot">
          {switcher("persona-side")}
          {!inFrame && (
            <a className="btn ghost sm" href={`${location.pathname}?as=${me.id === "t1" ? "s1" : "t1"}#/${page}`} target="_blank" rel="noopener">
              새 탭에서 다른 사람으로 열기
            </a>
          )}
          {armReset ? (
            <div className="row" style={{ flexWrap: "nowrap" }}>
              <button className="btn danger sm" style={{ flex: 1 }} onClick={() => { setArmReset(false); void resetDemo(); }}>데이터·키 모두 지우기</button>
              <button className="btn ghost sm" onClick={() => setArmReset(false)}>취소</button>
            </div>
          ) : (
            <button className="btn ghost sm" onClick={() => setArmReset(true)}>데모 초기화</button>
          )}
        </div>
      </aside>

      <header className="topbar">
        <div className="brand" style={{ padding: 0 }}>
          <img src="./icon.svg" alt="" />
          교실잇다
        </div>
        <div style={{ maxWidth: 220 }}>{switcher("persona-top")}</div>
      </header>

      <main className="main" id="main">
        {error && <div className="note-box warn" role="alert">오류: {error}</div>}
        {!ready ? (
          <div className="card">
            <h2>이 기기의 암호 키를 준비하고 있습니다…</h2>
            <p className="muted" style={{ marginTop: 8 }}>
              Web Crypto API로 개인 키를 만들고 내보낼 수 없게 IndexedDB에 보관합니다. 설치는 필요 없습니다.
            </p>
          </div>
        ) : page === "today" ? (
          <Today go={go} />
        ) : page === "rooms" ? (
          <Rooms />
        ) : page === "cover" ? (
          <Cover />
        ) : page === "practicum" ? (
          <Practicum />
        ) : page === "trust" ? (
          <Trust />
        ) : (
          <About go={go} />
        )}
      </main>

      <nav className="tabbar" aria-label="하단 메뉴">
        {nav("tab")}
      </nav>
    </div>
  );
}
