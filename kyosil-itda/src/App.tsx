import { ArrowLeftRight, ClipboardPen, Contrast, FileStack, GraduationCap, House, Info, LayoutGrid, MessagesSquare, Presentation, RotateCcw, ScrollText, ShieldCheck, SquareArrowOutUpRight, X } from "lucide-react";
import { useEffect, useState, type ComponentType } from "react";
import { isOpen } from "./core/approval";
import { PEOPLE } from "./core/school";
import { About } from "./features/About";
import { Cover } from "./features/Cover";
import { Docs } from "./features/Docs";
import { Letters } from "./features/Letters";
import { Slides } from "./features/Slides";
import { Students } from "./features/Students";
import { Practicum } from "./features/Practicum";
import { Rooms } from "./features/Rooms";
import { Today } from "./features/Today";
import { Trust } from "./features/Trust";
import { useApp } from "./state";
import { Avatar, inFrame, Notice } from "./ui/common";

export type Page = "today" | "docs" | "slides" | "letters" | "students" | "rooms" | "cover" | "practicum" | "trust" | "about";
export type Go = (p: Page, as?: string) => void;

const NAV: { id: Page; label: string; short: string; Icon: ComponentType<{ className?: string; "aria-hidden"?: boolean }>; group: string }[] = [
  { id: "today", label: "오늘", short: "오늘", Icon: House, group: "" },
  { id: "docs", label: "문서 변환", short: "문서", Icon: FileStack, group: "수업·문서" },
  { id: "slides", label: "수업 슬라이드", short: "슬라이드", Icon: Presentation, group: "수업·문서" },
  { id: "letters", label: "가정통신문", short: "통신문", Icon: ScrollText, group: "수업·문서" },
  { id: "students", label: "학생 상담·기록", short: "학생", Icon: GraduationCap, group: "학생" },
  { id: "rooms", label: "대화방", short: "대화", Icon: MessagesSquare, group: "협업" },
  { id: "cover", label: "결강 처리 (교체·보결)", short: "결강", Icon: ArrowLeftRight, group: "협업" },
  { id: "practicum", label: "교육실습", short: "실습", Icon: ClipboardPen, group: "협업" },
  { id: "trust", label: "보안 확인", short: "보안", Icon: ShieldCheck, group: "정보" },
  { id: "about", label: "작품 설명", short: "설명", Icon: Info, group: "정보" },
];
const TAB: Page[] = ["today", "docs", "students", "rooms"];

const pageFromHash = (): Page => {
  const h = location.hash.replace(/^#\/?/, "").split("?")[0] as Page;
  return NAV.some((n) => n.id === h) ? h : "today";
};

type Contrast = "system" | "high" | "normal";
function applyContrast(c: Contrast) {
  const root = document.documentElement;
  if (c === "system") delete root.dataset.contrast;
  else root.dataset.contrast = c;
  try {
    localStorage.setItem("kyosil:contrast", c);
  } catch {
    /* ignore */
  }
}
function initialContrast(): Contrast {
  try {
    const v = localStorage.getItem("kyosil:contrast");
    if (v === "high" || v === "normal") return v;
  } catch {
    /* ignore */
  }
  return "system";
}

export function App() {
  const { ready, error, me, setMe, requests, resetDemo } = useApp();
  const [page, setPage] = useState<Page>(pageFromHash);
  const [armReset, setArmReset] = useState(false);
  const [contrast, setContrast] = useState<Contrast>(initialContrast);
  const [sheet, setSheet] = useState(false);

  useEffect(() => applyContrast(contrast), [contrast]);
  useEffect(() => {
    const on = () => setPage(pageFromHash());
    window.addEventListener("hashchange", on);
    return () => window.removeEventListener("hashchange", on);
  }, []);

  const go: Go = (p, as) => {
    if (as) setMe(as);
    location.hash = p;
    setPage(p);
    setSheet(false);
    window.scrollTo({ top: 0 });
  };

  const pending = requests.filter(
    (r) => (r.status === "AWAITING_CONSENT" && r.candidateId === me.id) || (me.role === "coordinator" && r.status === "AWAITING_COORDINATOR"),
  ).length;
  const openMine = requests.filter((r) => r.requesterId === me.id && isOpen(r.status)).length;

  const switcher = (id: string, compact = false) => (
    <div className="persona">
      {!compact && <label htmlFor={id} className="meta">접속한 사람 (시연용)</label>}
      <div className="row nowrap">
        <Avatar id={me.id} />
        <select id={id} value={me.id} onChange={(e) => setMe(e.target.value)} aria-label={compact ? "접속한 사람 (시연용)" : undefined}>
          {PEOPLE.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name} · {p.role === "teacher" ? `${p.subject} 교사` : p.role === "coordinator" ? `${p.subject}·시간표` : "교생"}
            </option>
          ))}
        </select>
      </div>
    </div>
  );

  const navBtn = (n: (typeof NAV)[number], tab = false) => (
    <button key={n.id} className="nav-btn" aria-current={page === n.id ? "page" : undefined} onClick={() => go(n.id)}>
      <n.Icon className="ico" aria-hidden />
      <span>{tab ? n.short : n.label}</span>
      {!tab && n.id === "cover" && pending > 0 && <span className="count" aria-label={`처리할 결재 ${pending}건`}>{pending}</span>}
    </button>
  );
  const nav = () =>
    NAV.map((n, i) => (
      <div key={n.id} style={{ display: "contents" }}>
        {n.group && (i === 0 || NAV[i - 1].group !== n.group) && <div className="nav-label">{n.group}</div>}
        {navBtn(n)}
      </div>
    ));

  return (
    <div className="shell">
      <aside className="side" aria-label="주 메뉴">
        <div className="brand">
          <span className="brand-mark" aria-hidden="true">잇</span>
          <div>
            <b>교실잇다</b>
            <small>가상 · 한빛중학교 교무실</small>
          </div>
        </div>
        <nav aria-label="화면">{nav()}</nav>
        <div className="side-foot">
          {switcher("persona-side")}
          {!inFrame && (
            <a className="btn sm" href={`${location.pathname}?as=${me.id === "t1" ? "s1" : "t1"}#${page}`} target="_blank" rel="noopener">
              <SquareArrowOutUpRight className="ico sm" aria-hidden /> 다른 사람으로 새 탭
            </a>
          )}
          <div className="row nowrap">
            <button className="btn sm" style={{ flex: 1 }} aria-pressed={contrast === "high"} onClick={() => setContrast(contrast === "high" ? "normal" : "high")}>
              <Contrast className="ico sm" aria-hidden /> {contrast === "high" ? "기본 대비" : "고대비"}
            </button>
            {armReset ? (
              <button className="btn sm danger" onClick={() => { setArmReset(false); void resetDemo(); }}>초기화 확인</button>
            ) : (
              <button className="btn sm" onClick={() => setArmReset(true)} title="시연 데이터와 기기 키를 처음 상태로">
                <RotateCcw className="ico sm" aria-hidden /> 초기화
              </button>
            )}
          </div>
          {armReset && <button className="btn sm text" onClick={() => setArmReset(false)}>초기화 취소</button>}
        </div>
      </aside>

      <header className="topbar">
        <div className="brand" style={{ padding: 0 }}>
          <span className="brand-mark" aria-hidden="true">잇</span>
          <b>교실잇다</b>
        </div>
        <div style={{ maxWidth: 230, minWidth: 0 }}>{switcher("persona-top", true)}</div>
      </header>

      <main className="main" id="main">
        {error && <Notice kind="warn" role="alert">오류가 발생했습니다: {error}</Notice>}
        {!ready ? (
          <div className="panel"><div className="panel-body">
            <h2>이 기기의 암호 키를 준비하고 있습니다</h2>
            <p className="muted" style={{ marginTop: 8 }}>브라우저에서 개인 키를 만들고, 밖으로 꺼낼 수 없는 형태로 보관합니다.</p>
          </div></div>
        ) : page === "today" ? (
          <Today go={go} openMine={openMine} />
        ) : page === "docs" ? (
          <Docs go={go} />
        ) : page === "slides" ? (
          <Slides />
        ) : page === "letters" ? (
          <Letters />
        ) : page === "students" ? (
          <Students />
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
        {NAV.filter((n) => TAB.includes(n.id)).map((n) => navBtn(n, true))}
        <button className="nav-btn" aria-expanded={sheet} aria-current={!TAB.includes(page) ? "page" : undefined} onClick={() => setSheet(!sheet)}>
          <LayoutGrid className="ico" aria-hidden />
          <span>전체</span>
        </button>
      </nav>
      {sheet && (
        <div className="sheet-backdrop" onClick={() => setSheet(false)}>
          <div className="menu-sheet" role="dialog" aria-modal="true" aria-label="전체 메뉴" onClick={(e) => e.stopPropagation()}>
            <div className="row between"><b>전체 메뉴</b><button className="btn sm text" onClick={() => setSheet(false)} aria-label="닫기"><X className="ico sm" aria-hidden /></button></div>
            <div className="menu-grid">{NAV.map((n) => navBtn(n, true))}</div>
          </div>
        </div>
      )}
    </div>
  );
}
