import { ClipboardCopy, ExternalLink, FileDown, LoaderCircle, MonitorSmartphone, Sparkles, Tablet } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { activityHtml, activityMarkdown, KIND_LABEL, parseEvidence, parseExit, parseQuiz, quizPrompt, SAMPLE_EVIDENCE, SAMPLE_EXIT, SAMPLE_QUIZ, type Activity, type ActivityKind } from "../core/activity";
import { download, kordoc } from "../core/docs/engine";
import { markdownToDocx } from "../core/docs/writers";
import { useSchool } from "../core/profile";
import { useApp } from "../state";
import { inFrame, Notice, useToast } from "../ui/common";

const SAMPLE: Record<ActivityKind, { title: string; text: string }> = {
  quiz: { title: "비유 표현 확인 문제", text: SAMPLE_QUIZ },
  evidence: { title: "쉬는 시간, 늘려야 할까?", text: SAMPLE_EVIDENCE },
  exit: { title: "오늘의 출구 카드", text: SAMPLE_EXIT },
};

const HELP: Record<ActivityKind, string> = {
  quiz: "‘1. 질문’ 다음 줄에 보기(① ② …)와 ‘정답:’, ‘해설:’을 적습니다. OX는 ‘정답: O’, 단답은 ‘정답: 낱말 / 다른 표현’.",
  evidence: "‘질문:’, ‘선택지: A, B, C’ 다음에 ‘## 자료 1. 제목 (출처)’와 본문을 적습니다. 학생은 자료마다 어느 쪽을 뒷받침하는지 고르고, 결론과 반론까지 씁니다.",
  exit: "‘- ’로 시작하는 줄은 질문, ‘점검:’으로 시작하는 줄은 자기 점검 항목(학습 목표)입니다.",
};

const PURPOSE: Record<ActivityKind, string> = {
  quiz: "전개·정리 단계 형성평가. 바로 정답과 해설을 보여 주어 오개념을 그 자리에서 고칩니다.",
  evidence: "탐구 차시. 자료의 입장을 따져 근거를 분류하고, 결론을 정한 뒤 반론에 답합니다(1차 작품 ‘이 사건의 이름은?’의 구조를 교과 공통으로 넓힘).",
  exit: "정리 단계. 배운 것을 한 줄로 쓰고 학습 목표별로 스스로 점검합니다.",
};

export function Activities() {
  const { handoff, setHandoff } = useApp();
  const school = useSchool();
  const [kind, setKind] = useState<ActivityKind>("quiz");
  const [title, setTitle] = useState(SAMPLE.quiz.title);
  const [texts, setTexts] = useState<Record<ActivityKind, string>>({ quiz: SAMPLE_QUIZ, evidence: SAMPLE_EVIDENCE, exit: SAMPLE_EXIT });
  const [titles, setTitles] = useState<Record<ActivityKind, string>>({ quiz: SAMPLE.quiz.title, evidence: SAMPLE.evidence.title, exit: SAMPLE.exit.title });
  const [lesson, setLesson] = useState({ subject: "국어", content: "비유의 뜻과 종류(직유, 은유, 의인)를 알고, 시에서 비유가 주는 효과를 말한다.", objectives: ["비유의 뜻을 알고 종류를 구별할 수 있다", "비유의 효과를 설명할 수 있다"] });
  const [device, setDevice] = useState<"phone" | "tablet">("phone");
  const [busy, setBusy] = useState("");
  const toast = useToast();

  // 수업 슬라이드에서 넘어온 지도안: 학습 목표 → 출구 카드 점검 항목, 수업 내용 → AI 요청문
  useEffect(() => {
    if (handoff?.to !== "activities") return;
    const lines = handoff.markdown.split("\n");
    const obj = (lines.find((l) => l.startsWith("학습 목표:")) ?? "").replace("학습 목표:", "").split("/").map((x) => x.trim()).filter(Boolean);
    setLesson((x) => ({ ...x, content: lines.filter((l) => !l.startsWith("#")).join("\n"), objectives: obj.length ? obj : x.objectives }));
    if (obj.length) setTexts((t) => ({ ...t, exit: `- 오늘 배운 것을 한 문장으로 정리해 보세요.\n- 아직 헷갈리는 점을 적어 보세요.\n${obj.map((o) => `점검: ${o}`).join("\n")}` }));
    setTitles((t) => ({ ...t, exit: `${handoff.name} 출구 카드`, quiz: `${handoff.name} 확인 문제` }));
    setHandoff(null);
    toast.show("지도안의 학습 목표를 출구 카드와 문항 요청문에 넣었습니다.");
  }, [handoff, setHandoff, toast]);

  useEffect(() => setTitle(titles[kind]), [kind, titles]);
  const text = texts[kind];

  const parsed = useMemo((): { activity: Activity | null; errors: string[] } => {
    if (kind === "quiz") { const r = parseQuiz(text); return { activity: r.items.length ? { kind, title, items: r.items } : null, errors: r.errors }; }
    if (kind === "evidence") { const r = parseEvidence(text); return { activity: r.errors.length ? null : { kind, title, question: r.question, claims: r.claims, sources: r.sources }, errors: r.errors }; }
    const r = parseExit(text);
    return { activity: r.prompts.length ? { kind, title, prompts: r.prompts, checks: r.checks } : null, errors: r.prompts.length ? [] : ["‘- ’로 시작하는 질문이 하나 이상 필요합니다."] };
  }, [kind, text, title]);

  const html = useMemo(() => (parsed.activity ? activityHtml(parsed.activity, { school: school.school, subject: lesson.subject }) : ""), [parsed.activity, school.school, lesson.subject]);
  const count = parsed.activity?.kind === "quiz" ? `${parsed.activity.items.length}문항` : parsed.activity?.kind === "evidence" ? `자료 ${parsed.activity.sources.length}개` : parsed.activity?.kind === "exit" ? `질문 ${parsed.activity.prompts.length}개` : "";

  const save = async (fmt: "html" | "hwpx" | "docx") => {
    if (!parsed.activity) return;
    setBusy(fmt);
    try {
      if (fmt === "html") download(`${title}.html`, html, "text/html;charset=utf-8");
      else {
        const md = activityMarkdown(parsed.activity);
        if (fmt === "docx") download(`${title}_활동지.docx`, (await markdownToDocx(md, { title })) as BlobPart);
        else download(`${title}_활동지.hwpx`, await (await kordoc()).markdownToHwpx(md));
      }
    } catch (e) {
      toast.show(`저장하지 못했습니다: ${(e as Error).message}`);
    } finally {
      setBusy("");
    }
  };

  const openTab = () => {
    const url = URL.createObjectURL(new Blob([html], { type: "text/html" }));
    window.open(url, "_blank", "noopener");
    setTimeout(() => URL.revokeObjectURL(url), 60_000);
  };

  const copyPrompt = async () => {
    const p = quizPrompt({ subject: lesson.subject, grade: school.level === "중" ? "중학교" : "고등학교", objectives: lesson.objectives, content: lesson.content, count: 5 });
    try { await navigator.clipboard.writeText(p); toast.show("문항 초안 요청문을 복사했습니다. 학생 정보는 들어 있지 않습니다. AI 답을 아래 칸에 붙여 넣고 사실을 꼭 확인하세요."); } catch { toast.show("복사하지 못했습니다."); }
  };

  return (
    <>
      <div className="page-head">
        <div>
          <div className="crumb">수업·문서 · 학생 활동</div>
          <h1>학생 활동 만들기</h1>
          <p className="lead">확인 문제, 근거 판단, 출구 카드를 글 몇 줄로 만들고, 학생이 휴대폰이나 태블릿으로 바로 푸는 웹 활동으로 내보냅니다. 로그인도 서버도 없고, 학생 답은 어디에도 저장되지 않습니다.</p>
        </div>
      </div>

      <div className="tabs" role="tablist" aria-label="활동 종류" style={{ marginBottom: 16 }}>
        {(Object.keys(KIND_LABEL) as ActivityKind[]).map((k) => (
          <button key={k} role="tab" aria-selected={kind === k} onClick={() => setKind(k)}>{KIND_LABEL[k]}</button>
        ))}
      </div>

      <div className="act-layout">
        <section className="panel" aria-labelledby="act-h">
          <div className="panel-head"><h2 id="act-h">{KIND_LABEL[kind]} 내용</h2><span className="meta">{count}</span></div>
          <div className="panel-body stack">
            <p className="act-purpose">{PURPOSE[kind]}</p>
            <label className="field">활동 제목<input id="act-title" type="text" value={title} onChange={(e) => setTitles((t) => ({ ...t, [kind]: e.target.value }))} /></label>
            {kind === "quiz" && (
              <details className="panel sub">
                <summary className="act-summary"><Sparkles className="ico sm" aria-hidden /> AI로 문항 초안 받기 (수업 내용만, 학생 정보 없음)</summary>
                <div className="panel-body stack tight">
                  <div className="grid two">
                    <label className="field">교과<input id="act-subj" type="text" value={lesson.subject} onChange={(e) => setLesson({ ...lesson, subject: e.target.value })} /></label>
                    <label className="field">학습 목표 <span className="hint">/ 로 구분</span><input id="act-obj" type="text" value={lesson.objectives.join(" / ")} onChange={(e) => setLesson({ ...lesson, objectives: e.target.value.split("/").map((x) => x.trim()).filter(Boolean) })} /></label>
                  </div>
                  <label className="field">수업 내용<textarea id="act-content" rows={3} value={lesson.content} onChange={(e) => setLesson({ ...lesson, content: e.target.value })} /></label>
                  <div className="row"><button className="btn sm" onClick={() => void copyPrompt()}><ClipboardCopy className="ico sm" aria-hidden /> 요청문 복사</button><span className="meta">AI 답을 아래 칸에 그대로 붙여 넣으면 됩니다.</span></div>
                </div>
              </details>
            )}
            <label className="field">{kind === "evidence" ? "질문·선택지·자료" : kind === "quiz" ? "문항" : "질문과 점검 항목"} <span className="hint">{HELP[kind]}</span>
              <textarea id="act-text" className="act-editor" rows={14} value={text} onChange={(e) => setTexts((t) => ({ ...t, [kind]: e.target.value }))} spellCheck={false} />
            </label>
            {parsed.errors.length > 0 && <Notice kind="warn" role="alert">{parsed.errors.slice(0, 3).join(" ")}</Notice>}
            {kind === "evidence" && <Notice kind="plain">역사 사료나 통계를 넣을 때는 원문과 출처를 직접 확인한 것만 쓰세요. 예시 자료는 모두 지어낸 가상 자료입니다.</Notice>}
            <div className="row">
              <button className="btn sm text" onClick={() => { setTexts((t) => ({ ...t, [kind]: SAMPLE[kind].text })); setTitles((t) => ({ ...t, [kind]: SAMPLE[kind].title })); }}>예시로 되돌리기</button>
            </div>
          </div>
        </section>

        <section className="stack" aria-label="학생 화면">
          <div className="row between">
            <div className="seg" role="radiogroup" aria-label="미리보기 기기">
              <button role="radio" aria-checked={device === "phone"} onClick={() => setDevice("phone")}><MonitorSmartphone className="ico sm" aria-hidden /> 휴대폰</button>
              <button role="radio" aria-checked={device === "tablet"} onClick={() => setDevice("tablet")}><Tablet className="ico sm" aria-hidden /> 태블릿</button>
            </div>
            <div className="row">
              <button className="btn primary" disabled={!parsed.activity} onClick={() => void save("html")}><FileDown className="ico sm" aria-hidden /> 학생용 웹 파일</button>
              {!inFrame && <button className="btn" disabled={!parsed.activity} onClick={openTab}><ExternalLink className="ico sm" aria-hidden /> 새 탭</button>}
              {(["hwpx", "docx"] as const).map((f) => (
                <button key={f} className="btn" disabled={!parsed.activity || !!busy} onClick={() => void save(f)}>{busy === f ? <LoaderCircle className="ico sm spin" aria-hidden /> : <FileDown className="ico sm" aria-hidden />} 활동지 {f.toUpperCase()}</button>
              ))}
            </div>
          </div>
          <div className={`device ${device}`}>
            {html ? <iframe title={`학생 화면 미리보기: ${title}`} sandbox="allow-scripts" srcDoc={html} /> : <div className="device-empty">내용을 고치면 학생 화면이 여기에 나타납니다.</div>}
          </div>
          <p className="meta">학생용 웹 파일은 한 파일로 열리고 인터넷이 없어도 동작합니다. 학급 게시판·클래스룸에 올리거나 학교 누리집에 게시해 링크를 나누세요. 학생은 ‘내 답 복사’로 답을 제출합니다.</p>
        </section>
      </div>
      {toast.node}
    </>
  );
}
