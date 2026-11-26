import { ListChecks, FileDown, LoaderCircle, MonitorPlay, Plus, Upload, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import p400 from "../assets/fonts/paperlogy/Paperlogy-4Regular.subset.woff2?url";
import p600 from "../assets/fonts/paperlogy/Paperlogy-6SemiBold.subset.woff2?url";
import p800 from "../assets/fonts/paperlogy/Paperlogy-8ExtraBold.subset.woff2?url";
import { download, toMarkdown } from "../core/docs/engine";
import { buildSlides, exportPptx, parseLessonPlan, THEMES, type LessonPlan, type SlideTheme, type Step } from "../core/lesson";
import { deckHtml, paperlogyFontCss, slideInnerHtml, SLIDE_CSS } from "../core/slidesHtml";
import { useStudioId } from "../core/profile";
import { STUDIOS } from "../core/studio";
import { useApp } from "../state";
import { inFrame, Notice, useToast } from "../ui/common";

const SAMPLE = `# 이 사건의 이름은? 동학 농민 운동
단원: 동학 농민 운동
대상: 2학년 1반 · 역사
교사: 곽민혁
학습 목표: 동학 농민 운동의 배경과 전개를 설명할 수 있다 · 여러 기록을 비교해 사건의 성격을 판단할 수 있다
도입(5) 같은 사건의 여러 이름 살펴보기 → 전개(20) 사료 다섯 편을 읽고 근거 분류하기 → 전개(15) 다른 이름을 고른 친구와 모둠으로 근거 비교 → 정리(5) 이름 정하기 출구 카드
발문: 같은 사건을 왜 사람마다 다르게 부를까?
준비물: 사료 카드, 활동지, 모둠 보드
평가: 근거를 들어 사건의 이름 정하기`;

const lines = (xs: string[]) => xs.join("\n");
const unlines = (s: string) => s.split("\n").map((x) => x.trim()).filter(Boolean);

function SlideView({ html, bg, scale }: { html: string; bg: string; scale: number }) {
  return (
    <div className="slide-frame" style={{ width: 1280 * scale, height: 720 * scale }}>
      <div className="slide" style={{ background: `#${bg}`, transform: `scale(${scale})`, transformOrigin: "0 0" }} dangerouslySetInnerHTML={{ __html: html }} />
    </div>
  );
}

export function Slides() {
  const { handoff, setHandoff } = useApp();
  const [plan, setPlan] = useState<LessonPlan>(() => parseLessonPlan(SAMPLE));
  const [source, setSource] = useState("예시 지도안");
  const [paste, setPaste] = useState("");
  const [showPaste, setShowPaste] = useState(false);
  const { me } = useApp();
  const studioTheme = STUDIOS[useStudioId(me.id)].slideTheme;
  const [theme, setTheme] = useState<SlideTheme>(() => THEMES.find((t) => t.id === studioTheme) ?? THEMES[0]);
  const [roles, setRoles] = useState(true);
  const [cur, setCur] = useState(0);
  const [busy, setBusy] = useState("");
  const [err, setErr] = useState("");
  const input = useRef<HTMLInputElement>(null);
  const stage = useRef<HTMLDivElement>(null);
  const [stageW, setStageW] = useState(720);
  const toast = useToast();

  useEffect(() => {
    if (handoff?.to === "slides") {
      setPlan(parseLessonPlan(handoff.markdown));
      setSource(handoff.name);
      setHandoff(null);
      setCur(0);
    }
  }, [handoff, setHandoff]);

  useEffect(() => {
    const el = stage.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setStageW(el.clientWidth));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const slides = useMemo(() => buildSlides(plan, { groupRoles: roles }), [plan, roles]);
  const phases = plan.steps.map((s) => s.phase);
  const html = (i: number, th = theme) => slideInnerHtml(slides[i], th, phases, i + 1, slides.length);
  const at = Math.min(cur, slides.length - 1);

  const fromFile = async (f: File) => {
    setBusy("file");
    setErr("");
    try {
      const r = await toMarkdown(f);
      setPlan(parseLessonPlan(r.markdown));
      setSource(f.name);
      setCur(0);
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy("");
    }
  };

  const set = <K extends keyof LessonPlan>(k: K, v: LessonPlan[K]) => setPlan((p) => ({ ...p, [k]: v }));
  const setStep = (i: number, s: Partial<Step>) => setPlan((p) => ({ ...p, steps: p.steps.map((x, j) => (j === i ? { ...x, ...s } : x)) }));

  const saveHtml = async () => {
    setBusy("html");
    try {
      const fontFaceCss = await paperlogyFontCss({ 400: p400, 600: p600, 800: p800 });
      download(`${plan.title || "수업"}.html`, deckHtml({ slides, theme, phases, title: plan.title || "수업", fontFaceCss }), "text/html;charset=utf-8");
      toast.show("HTML 발표 파일을 저장했습니다. 브라우저로 열고 → 키로 넘기세요.");
    } finally {
      setBusy("");
    }
  };
  const savePptx = async () => {
    setBusy("pptx");
    try {
      await exportPptx(slides, theme, phases, `${plan.title || "수업"}.pptx`);
    } catch (e) {
      toast.show(`PPTX를 만들지 못했습니다: ${(e as Error).message}`);
    } finally {
      setBusy("");
    }
  };

  return (
    <>
      <div className="page-head">
        <div>
          <div className="crumb">수업·문서 · 수업 슬라이드</div>
          <h1>수업 슬라이드 만들기</h1>
          <p className="lead">수업 지도안을 넣으면 학습 목표, 수업 흐름, 활동, 모둠 역할, 확인 문제, 정리 슬라이드를 만듭니다. 내용은 직접 고칠 수 있고, 템플릿을 바꾸면 바로 반영됩니다.</p>
        </div>
        <div className="row">
          <button className="btn primary" disabled={!!busy} onClick={() => void saveHtml()}>{busy === "html" ? <LoaderCircle className="ico sm spin" aria-hidden /> : <MonitorPlay className="ico sm" aria-hidden />} HTML 발표 파일</button>
          <button className="btn" onClick={() => { setHandoff({ to: "activities", name: plan.title || "수업", markdown: [`# ${plan.title}`, `학습 목표: ${plan.objectives.join(" / ")}`, ...plan.steps.map((s) => `${s.phase}: ${s.activities.join(", ")}`), `평가: ${plan.assessment.join(" / ")}`].join("\n") }); location.hash = "activities"; }}><ListChecks className="ico sm" aria-hidden /> 학생 활동 만들기</button>
          <button className="btn" disabled={!!busy} onClick={() => void savePptx()}>{busy === "pptx" ? <LoaderCircle className="ico sm spin" aria-hidden /> : <FileDown className="ico sm" aria-hidden />} PPTX</button>
        </div>
      </div>

      <style>{SLIDE_CSS}</style>
      <div className="slides-layout">
        <div className="stack">
          <section className="panel" aria-labelledby="src-h">
            <div className="panel-head"><h2 id="src-h">① 지도안 넣기</h2><span className="meta">지금: {source}</span></div>
            <div className="panel-body stack">
              <div className="row">
                <button className="btn" onClick={() => input.current?.click()} disabled={busy === "file"}>{busy === "file" ? <LoaderCircle className="ico sm spin" aria-hidden /> : <Upload className="ico sm" aria-hidden />} 파일에서(HWP·HWPX·DOCX·PDF)</button>
                <button className="btn" aria-expanded={showPaste} onClick={() => setShowPaste((s) => !s)}>붙여 넣기</button>
                <button className="btn text" onClick={() => { setPlan(parseLessonPlan(SAMPLE)); setSource("예시 지도안"); setCur(0); }}>예시로 되돌리기</button>
                <input ref={input} type="file" hidden accept=".hwp,.hwpx,.docx,.pdf,.md,.txt,.pptx" aria-label="지도안 파일" onChange={(e) => { const f = e.target.files?.[0]; if (f) void fromFile(f); e.target.value = ""; }} />
              </div>
              {showPaste && (
                <div className="stack tight">
                  <label className="field">지도안 내용 <span className="hint">‘단원:’, ‘학습 목표:’, ‘도입(5) … → 전개(30) …’ 같은 형식을 알아봅니다</span>
                    <textarea id="plan-paste" rows={6} value={paste} onChange={(e) => setPaste(e.target.value)} placeholder={SAMPLE} />
                  </label>
                  <div><button className="btn primary sm" disabled={!paste.trim()} onClick={() => { setPlan(parseLessonPlan(paste)); setSource("붙여 넣은 지도안"); setShowPaste(false); setCur(0); }}>이 내용으로 만들기</button></div>
                </div>
              )}
              {err && <Notice kind="warn" role="alert">{err}</Notice>}
            </div>
          </section>

          <section className="panel" aria-labelledby="outline-h">
            <div className="panel-head"><h2 id="outline-h">② 내용 다듬기</h2></div>
            <div className="panel-body stack">
              <div className="grid two">
                <label className="field">수업 제목<input id="pl-title" type="text" value={plan.title} onChange={(e) => set("title", e.target.value)} /></label>
                <label className="field">단원<input id="pl-unit" type="text" value={plan.unit} onChange={(e) => set("unit", e.target.value)} /></label>
                <label className="field">대상<input id="pl-target" type="text" value={plan.target} onChange={(e) => set("target", e.target.value)} /></label>
                <label className="field">교사<input id="pl-teacher" type="text" value={plan.teacher} onChange={(e) => set("teacher", e.target.value)} /></label>
              </div>
              <label className="field">학습 목표 <span className="hint">한 줄에 하나</span><textarea id="pl-obj" rows={2} value={lines(plan.objectives)} onChange={(e) => set("objectives", unlines(e.target.value))} /></label>
              <div className="field">
                <span>수업 흐름</span>
                <div className="stack tight">
                  {plan.steps.map((s, i) => (
                    <div key={i} className="step-edit">
                      <input type="text" aria-label={`${i + 1}단계 이름`} value={s.phase} onChange={(e) => setStep(i, { phase: e.target.value })} />
                      <input type="text" aria-label={`${i + 1}단계 시간(분)`} inputMode="numeric" value={s.minutes ?? ""} onChange={(e) => setStep(i, { minutes: Number(e.target.value) || undefined })} placeholder="분" />
                      <textarea aria-label={`${i + 1}단계 활동`} rows={Math.max(1, s.activities.length)} value={lines(s.activities)} onChange={(e) => setStep(i, { activities: unlines(e.target.value) })} placeholder="활동(한 줄에 하나)" />
                      <button className="btn sm text" aria-label={`${i + 1}단계 삭제`} onClick={() => set("steps", plan.steps.filter((_, j) => j !== i))}><X className="ico sm" aria-hidden /></button>
                    </div>
                  ))}
                  <div><button className="btn sm" onClick={() => set("steps", [...plan.steps, { phase: "활동", minutes: 10, activities: [] }])}><Plus className="ico sm" aria-hidden /> 단계 추가</button></div>
                </div>
              </div>
              <div className="grid two">
                <label className="field">생각 열기 발문<textarea id="pl-q" rows={2} value={lines(plan.questions)} onChange={(e) => set("questions", unlines(e.target.value))} /></label>
                <label className="field">확인 문제<textarea id="pl-as" rows={2} value={lines(plan.assessment)} onChange={(e) => set("assessment", unlines(e.target.value))} /></label>
              </div>
              <label className="field">준비물 <span className="hint">쉼표로 구분</span><input id="pl-mat" type="text" value={plan.materials.join(", ")} onChange={(e) => set("materials", e.target.value.split(",").map((x) => x.trim()).filter(Boolean))} /></label>
              <label className="row" style={{ fontWeight: 600 }}><input type="checkbox" checked={roles} onChange={(e) => setRoles(e.target.checked)} /> 모둠 활동이 있으면 ‘모둠 역할’ 슬라이드 넣기</label>
            </div>
          </section>
        </div>

        <div className="stack">
          <section className="panel" aria-labelledby="theme-h">
            <div className="panel-head"><h2 id="theme-h">③ 템플릿</h2><span className="meta">제목 글꼴: 페이퍼로지</span></div>
            <div className="panel-body">
              <div className="theme-grid" role="radiogroup" aria-label="슬라이드 템플릿">
                {THEMES.map((t) => (
                  <button key={t.id} role="radio" aria-checked={theme.id === t.id} className="theme-card" onClick={() => setTheme(t)}>
                    <SlideView html={html(0, t)} bg={t.bg} scale={0.13} />
                    <b>{t.name}</b>
                    <span className="meta">{t.desc}</span>
                  </button>
                ))}
              </div>
            </div>
          </section>

          <section className="panel" aria-labelledby="pv-h">
            <div className="panel-head"><h2 id="pv-h">미리보기</h2><span className="meta">{at + 1} / {slides.length}</span></div>
            <div className="panel-body stack">
              <div ref={stage} className="stage">
                <SlideView html={html(at)} bg={theme.bg} scale={Math.max(0.2, stageW / 1280)} />
              </div>
              <div className="strip" role="listbox" aria-label="슬라이드 목록">
                {slides.map((s, i) => (
                  <button key={i} role="option" aria-selected={i === at} className="strip-item" onClick={() => setCur(i)} title={s.title}>
                    <SlideView html={html(i)} bg={theme.bg} scale={0.1} />
                    <span className="meta">{i + 1}</span>
                  </button>
                ))}
              </div>
              <Notice kind="info">
                <b>HTML 발표 파일</b>은 글꼴까지 들어 있어 어느 PC에서나 똑같이 보입니다. → 키로 넘기고, T를 누르면 슬라이드의 활동 시간 타이머가 켜집니다.
                {" "}<b>PPTX</b>는 편집용입니다. 페이퍼로지가 설치되지 않은 PC에서는 다른 글꼴로 보입니다.
                {inFrame ? " 이 창에서는 파일 저장이 막혀 있을 수 있습니다." : ""}
              </Notice>
            </div>
          </section>
        </div>
      </div>
      {toast.node}
    </>
  );
}
