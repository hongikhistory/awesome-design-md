import { ArrowLeftRight, ClipboardPen, Search, Wand2, Contrast, FileStack, GraduationCap, House, KeyRound, Landmark, ListChecks, PartyPopper, Settings2, UsersRound, Info, LayoutGrid, MessagesSquare, Presentation, RotateCcw, ScrollText, ShieldCheck, SquareArrowOutUpRight, X } from "lucide-react";
import { Component, lazy, Suspense, useEffect, useState, type ComponentType, type ReactNode } from "react";
import { isOpen } from "./core/approval";
import { PEOPLE } from "./core/school";
import { About } from "./features/About";
import { Cover } from "./features/Cover";
import { Practicum } from "./features/Practicum";
import { Rooms } from "./features/Rooms";
import { Today } from "./features/Today";
import { ChatBot } from "./features/ChatBot";
import { Trust } from "./features/Trust";
import { BRAND } from "./brand";
import { getMe, introDone, saveMe, useMyProfile, useSchool, useStudioId, type IntroMode } from "./core/profile";
import { STUDIOS, type StudioId } from "./core/studio";
import { installStudioCss } from "./ui/studioTheme";
import { Onboarding } from "./features/Onboarding";
import { useApp } from "./state";

// The four document tools pull in JSZip, markdown-it and the kordoc loader; load them on first visit.
const Docs = lazy(() => import("./features/Docs").then((m) => ({ default: m.Docs })));
const Slides = lazy(() => import("./features/Slides").then((m) => ({ default: m.Slides })));
const Letters = lazy(() => import("./features/Letters").then((m) => ({ default: m.Letters })));
const Settings = lazy(() => import("./features/Settings").then((m) => ({ default: m.Settings })));
const Activities = lazy(() => import("./features/Activities").then((m) => ({ default: m.Activities })));
const Groups = lazy(() => import("./features/Groups").then((m) => ({ default: m.Groups })));
const Assets = lazy(() => import("./features/Assets").then((m) => ({ default: m.Assets })));
const ClassTools = lazy(() => import("./features/ClassTools").then((m) => ({ default: m.ClassTools })));
const Packs = lazy(() => import("./features/Packs").then((m) => ({ default: m.Packs })));
const Students = lazy(() => import("./features/Students").then((m) => ({ default: m.Students })));
import { Logo } from "./ui/Brand";
import { Palette, type PaletteItem } from "./ui/Palette";
import { recordDay, setUsageUser } from "./core/daily";
import { KEYWORDS } from "./core/pages";
import { Avatar, inFrame, Notice } from "./ui/common";

export type Page = "today" | "packs" | "docs" | "slides" | "activities" | "assets" | "classtools" | "groups" | "letters" | "students" | "rooms" | "cover" | "practicum" | "trust" | "settings" | "about";
export type Go = (p: Page, as?: string) => void;

const NAV: { id: Page; label: string; short: string; Icon: ComponentType<{ className?: string; "aria-hidden"?: boolean }>; group: string }[] = [
  { id: "today", label: "오늘", short: "오늘", Icon: House, group: "" },
  { id: "packs", label: "과목별 수업 만들기", short: "만들기", Icon: Wand2, group: "수업" },
  { id: "slides", label: "수업 슬라이드", short: "슬라이드", Icon: Presentation, group: "수업" },
  { id: "activities", label: "학생 활동 만들기", short: "활동", Icon: ListChecks, group: "수업" },
  { id: "assets", label: "수업 에셋", short: "에셋", Icon: Landmark, group: "수업" },
  { id: "docs", label: "문서 변환", short: "문서", Icon: FileStack, group: "수업" },
  { id: "classtools", label: "학급 도구함", short: "도구함", Icon: PartyPopper, group: "학급" },
  { id: "groups", label: "모둠·자리", short: "모둠", Icon: UsersRound, group: "학급" },
  { id: "students", label: "학생 상담·기록", short: "학생", Icon: GraduationCap, group: "학급" },
  { id: "letters", label: "가정통신문", short: "통신문", Icon: ScrollText, group: "학교 업무" },
  { id: "rooms", label: "대화방", short: "대화", Icon: MessagesSquare, group: "학교 업무" },
  { id: "cover", label: "결강 처리 (교체·보결)", short: "결강", Icon: ArrowLeftRight, group: "학교 업무" },
  { id: "practicum", label: "교육실습", short: "실습", Icon: ClipboardPen, group: "학교 업무" },
  { id: "settings", label: "학교·내 정보", short: "설정", Icon: Settings2, group: "정보" },
  { id: "trust", label: "보안 확인", short: "보안", Icon: ShieldCheck, group: "정보" },
  { id: "about", label: "작품 설명", short: "설명", Icon: Info, group: "정보" },
];
const TAB: Page[] = ["today", "slides", "activities", "classtools"];

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

/** A tool page that cannot load (offline before first use, or the single-file build) must not blank the app. */
class LoadGuard extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    if (!this.state.failed) return this.props.children;
    return (
      <Notice kind="warn" role="alert">
        <b>이 화면을 불러오지 못했습니다.</b> 인터넷에 연결된 상태에서 한 번 열면 그다음부터는 오프라인에서도 열립니다. 단일 HTML 파일판에는 문서 도구가 들어 있지 않습니다.{" "}
        <button className="btn sm" onClick={() => location.reload()}>다시 시도</button>
      </Notice>
    );
  }
}

function Skeleton() {
  return (
    <div className="skeleton" role="status" aria-label="화면을 불러오는 중">
      <span className="sk sk-crumb" /><span className="sk sk-title" /><span className="sk sk-line" />
      <div className="sk-grid"><span className="sk sk-card" /><span className="sk sk-card" /></div>
    </div>
  );
}

export function App() {
  const { ready, error, me, setMe, requests, resetDemo } = useApp();
  const school = useSchool();
  const studio = useStudioId(me.id);
  const mine = useMyProfile(me.id);
  useEffect(() => { installStudioCss(); }, []);
  useEffect(() => { document.documentElement.dataset.studio = studio; }, [studio]);
  const [intro, setIntro] = useState<IntroMode | null>(introDone);
  const [page, setPage] = useState<Page>(pageFromHash);
  const [armReset, setArmReset] = useState(false);
  const [contrast, setContrast] = useState<Contrast>(initialContrast);
  const [sheet, setSheet] = useState(false);
  const [find, setFind] = useState(false);
  useEffect(() => { setUsageUser(me.id); recordDay(me.id); }, [me.id]);
  useEffect(() => {
    const on = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") { e.preventDefault(); setFind((f) => !f); }
    };
    window.addEventListener("keydown", on);
    return () => window.removeEventListener("keydown", on);
  }, []);
  const paletteItems: PaletteItem[] = NAV.map((n) => ({ id: n.id, label: n.label, group: n.group, keywords: KEYWORDS[n.id] ?? "", Icon: n.Icon }));

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
              {getMe(p.id).displayName || p.name} · {p.role === "teacher" ? `${p.subject} 교사` : p.role === "coordinator" ? `${p.subject}·시간표` : "교생"}
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

  if (!intro) return <Onboarding onDone={(m) => { setIntro(m); go("today"); }} />;

  return (
    <div className="shell">
      <aside className="side" aria-label="주 메뉴">
        <div className="brand">
          <Logo />
          <div>
            <b>{BRAND.name}</b>
            <small>{school.school} · {school.year}학년도</small>
          </div>
        </div>
        <label className="studio-chip">
          <span className="sr">과목 스튜디오</span>
          <span className="studio-dot" aria-hidden="true" />
          <select value={studio} onChange={(e) => saveMe(me.id, { ...mine, studio: e.target.value as StudioId })} aria-label="과목 스튜디오">
            {(Object.keys(STUDIOS) as StudioId[]).map((k) => <option key={k} value={k}>{STUDIOS[k].name}</option>)}
          </select>
        </label>
        <button className="find-btn" onClick={() => setFind(true)} aria-keyshortcuts="Control+K">
          <Search className="ico sm" aria-hidden /><span>빠른 찾기</span><kbd>Ctrl K</kbd>
        </button>
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
          <Logo />
          <b>{BRAND.name}</b>
        </div>
        <div className="row nowrap" style={{ gap: 6, minWidth: 0 }}>
          <button className="btn sm" onClick={() => setFind(true)} aria-label="빠른 찾기"><Search className="ico sm" aria-hidden /></button>
          <div style={{ maxWidth: 230, minWidth: 0 }}>{switcher("persona-top", true)}</div>
        </div>
      </header>

      <main className="main" id="main">
        {error && <Notice kind="warn" role="alert">오류가 발생했습니다: {error}</Notice>}
        <LoadGuard key={page}>
        <Suspense fallback={<Skeleton />}>
        <div className="page-enter">
        {!ready ? (
          <div className="panel boot"><div className="panel-body row nowrap" style={{ gap: 16 }}>
            <span className="boot-key" aria-hidden="true"><KeyRound className="ico" /></span>
            <div>
              <h2>이 기기의 암호 키를 준비하고 있습니다</h2>
              <p className="muted" style={{ marginTop: 4 }}>브라우저에서 개인 키를 만들고, 밖으로 꺼낼 수 없는 형태로 보관합니다.</p>
            </div>
          </div></div>
        ) : page === "today" ? (
          <Today go={go} openMine={openMine} />
        ) : page === "packs" ? (
          <Packs go={go} />
        ) : page === "docs" ? (
          <Docs go={go} />
        ) : page === "slides" ? (
          <Slides />
        ) : page === "activities" ? (
          <Activities />
        ) : page === "assets" ? (
          <Assets />
        ) : page === "classtools" ? (
          <ClassTools />
        ) : page === "groups" ? (
          <Groups />
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
        ) : page === "settings" ? (
          <Settings />
        ) : page === "trust" ? (
          <Trust />
        ) : (
          <About go={go} />
        )}
        </div>
        </Suspense>
        </LoadGuard>
      </main>

      <nav className="tabbar" aria-label="하단 메뉴">
        {NAV.filter((n) => TAB.includes(n.id)).map((n) => navBtn(n, true))}
        <button className="nav-btn" aria-expanded={sheet} aria-current={!TAB.includes(page) ? "page" : undefined} onClick={() => setSheet(!sheet)}>
          <LayoutGrid className="ico" aria-hidden />
          <span>전체</span>
        </button>
      </nav>
      {ready && <ChatBot go={go} />}
      {find && <Palette items={paletteItems} onClose={() => setFind(false)} onPick={(id) => { setFind(false); go(id as Page); }} />}
      {sheet && (
        <div className="sheet-backdrop" onClick={() => setSheet(false)}>
          <div className="menu-sheet" role="dialog" aria-modal="true" aria-label="전체 메뉴" onClick={(e) => e.stopPropagation()}>
            <div className="row between"><b>전체 메뉴</b><button className="btn sm text" onClick={() => setSheet(false)} aria-label="닫기"><X className="ico sm" aria-hidden /></button></div>
            <label className="studio-chip sheet-studio">
              <span className="meta" style={{ whiteSpace: "nowrap" }}>과목 스튜디오</span>
              <span className="studio-dot" aria-hidden="true" />
              <select value={studio} onChange={(e) => saveMe(me.id, { ...mine, studio: e.target.value as StudioId })} aria-label="과목 스튜디오">
                {(Object.keys(STUDIOS) as StudioId[]).map((k) => <option key={k} value={k}>{STUDIOS[k].name}</option>)}
              </select>
            </label>
            <div className="menu-grid">{NAV.map((n) => navBtn(n, true))}</div>
          </div>
        </div>
      )}
    </div>
  );
}
