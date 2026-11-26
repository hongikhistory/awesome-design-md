import { ArrowLeft, ArrowRight, BookOpenCheck, Check, FileStack, GraduationCap, Lock, MessagesSquare, Presentation, ScrollText, ShieldCheck, Sparkles, Users, WifiOff } from "lucide-react";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { BRAND, DEMO_SCHOOL } from "../brand";
import { finishIntro, getMe, getSchool, saveMe, saveSchool, type IntroMode, type SchoolLevel } from "../core/profile";
import { ROOM } from "../core/seed";
import { useApp } from "../state";
import { Logo } from "../ui/Brand";
import { HeroClassroom } from "../ui/Illustrations";

const STEPS = ["환영", "문제", "하루", "시작"] as const;

export function Onboarding({ onDone }: { onDone: (mode: IntroMode) => void }) {
  const [step, setStep] = useState(0);
  const head = useRef<HTMLHeadingElement>(null);
  useEffect(() => head.current?.focus(), [step]);
  const next = () => setStep((s) => Math.min(STEPS.length - 1, s + 1));
  const back = () => setStep((s) => Math.max(0, s - 1));

  return (
    <div className="intro" role="dialog" aria-modal="true" aria-label={`${BRAND.name} 시작 안내`}>
      <div className="intro-card">
        <header className="intro-top">
          <div className="row nowrap"><Logo size={28} /><b>{BRAND.name}</b></div>
          <ol className="intro-dots" aria-label={`${STEPS.length}단계 중 ${step + 1}단계`}>
            {STEPS.map((s, i) => <li key={s} className={i === step ? "on" : i < step ? "done" : ""} aria-current={i === step ? "step" : undefined}><span className="sr">{s}</span></li>)}
          </ol>
          {step < STEPS.length - 1 && <button className="btn sm text" onClick={() => setStep(STEPS.length - 1)}>건너뛰기</button>}
        </header>

        <div className="intro-body" key={step}>
          {step === 0 && <Welcome head={head} />}
          {step === 1 && <Problems head={head} />}
          {step === 2 && <Day head={head} />}
          {step === 3 && <Start head={head} onDone={onDone} />}
        </div>

        {step < STEPS.length - 1 && (
          <footer className="intro-foot">
            {step > 0 ? <button className="btn" onClick={back}><ArrowLeft className="ico sm" aria-hidden /> 이전</button> : <span />}
            <button className="btn primary lg" onClick={next}>{step === 0 ? "시작하기" : "다음"} <ArrowRight className="ico sm" aria-hidden /></button>
          </footer>
        )}
      </div>
    </div>
  );
}

type HeadRef = { head: React.RefObject<HTMLHeadingElement | null> };

function Welcome({ head }: HeadRef) {
  return (
    <div className="intro-welcome">
      <div className="stack">
        <span className="intro-kicker"><Sparkles className="ico sm" aria-hidden /> 홍익인간, 널리 이롭게 하는 교육을 위해</span>
        <h1 ref={head} tabIndex={-1}>{BRAND.tagline}</h1>
        <p className="intro-lead">문서 정리, 통신문, 생기부, 결강 처리처럼 수업 밖의 일에 묶인 시간을 줄여, 선생님이 학생에게 돌아가도록 돕는 교사용 작업 공간입니다.</p>
        <ul className="intro-points">
          <li><Check className="ico sm" aria-hidden /> 설치 없이 브라우저에서, 인터넷이 끊겨도</li>
          <li><Check className="ico sm" aria-hidden /> 한글(HWPX)·엑셀·PDF를 그대로 읽고 다시 씀</li>
          <li><Check className="ico sm" aria-hidden /> 학생 정보는 이 기기 밖으로 나가지 않음</li>
        </ul>
      </div>
      <div className="intro-art"><HeroClassroom /></div>
    </div>
  );
}

function Problems({ head }: HeadRef) {
  const rows: { icon: ReactNode; wall: string; now: string; fix: string }[] = [
    { icon: <FileStack className="ico" aria-hidden />, wall: "문서의 벽", now: "HWP·엑셀·PDF로 흩어진 자료를 손으로 옮겨 적고, AI 도구는 한글 파일을 제대로 읽지 못합니다.", fix: "어떤 파일이든 AI가 잘 읽는 Markdown으로 바꾸고, 다시 HWPX·DOCX·XLSX로. 지도안은 슬라이드로, 내용은 통신문으로 이어집니다." },
    { icon: <Lock className="ico" aria-hidden />, wall: "개인정보의 벽", now: "학생 정보를 AI나 메신저에 넣기 어렵고, 2026 기재요령은 AI 문장을 그대로 생기부에 넣는 것을 금지합니다.", fix: "학생 기록은 담임 기기에서만 열리게 암호화합니다. AI에 넘길 때는 이름·학교·연락처를 자동으로 가리고, 점검은 교사가 합니다." },
    { icon: <Users className="ico" aria-hidden />, wall: "협업의 벽", now: "결강·보결 조율과 교생 지도가 메신저와 종이로 흩어져, 누가 무엇을 맡았는지 기록이 남지 않습니다.", fix: "교체 우선 보결 추천과 결재란, 관찰 초점에 맞춘 교생 피드백이 암호화된 기록으로 남습니다." },
  ];
  return (
    <div className="stack">
      <h1 ref={head} tabIndex={-1}>선생님의 시간을 빼앗는 세 가지 벽</h1>
      <p className="intro-lead">수업 준비보다 문서와 연락에 더 오래 붙잡히는 하루. 교육부도 2024년 행정업무 경감 방안과 2026년 ‘학교 현장 가짜 일 줄이기’로 같은 문제를 짚었습니다.</p>
      <div className="walls">
        {rows.map((r) => (
          <article key={r.wall} className="wall">
            <div className="wall-ico">{r.icon}</div>
            <h2>{r.wall}</h2>
            <p className="wall-now"><span className="badge">지금</span> {r.now}</p>
            <p className="wall-fix"><span className="badge info">{BRAND.name}</span> {r.fix}</p>
          </article>
        ))}
      </div>
    </div>
  );
}

function Day({ head }: HeadRef) {
  const items = [
    { t: "07:50", icon: <MessagesSquare className="ico sm" aria-hidden />, what: "출근길 알림: 강지호 선생님 출장으로 1교시 보결 요청. 인수인계서를 읽고 동의하면 시간표 담당 결재까지 한 번에." },
    { t: "08:40", icon: <Presentation className="ico sm" aria-hidden />, what: "어젯밤 쓴 한글 지도안을 올리면 수업 슬라이드가 나옵니다. 성취기준 코드와 활동 시간 타이머까지." },
    { t: "12:40", icon: <ScrollText className="ico sm" aria-hidden />, what: "현장체험학습 통신문과 개인정보 동의서. 날짜·금액 표기와 쉬운 말을 점검하고, 학년 협의방에 검토를 부탁합니다." },
    { t: "16:30", icon: <GraduationCap className="ico sm" aria-hidden />, what: "오늘 눈에 띈 장면을 누가기록으로 한 줄. 학기 말에는 이 기록으로 세특을 쓰고 NEIS 바이트와 금지 표현을 확인합니다." },
    { t: "17:10", icon: <BookOpenCheck className="ico sm" aria-hidden />, what: "교생 오세린 선생님의 수업 관찰 기록을 정리하고, 자기평가와 다른 영역을 다음 협의 주제로 잡습니다." },
  ];
  return (
    <div className="stack">
      <h1 ref={head} tabIndex={-1}>{DEMO_SCHOOL} 2학년 1반 담임, 김하늘 선생님의 하루</h1>
      <p className="intro-lead">시연은 가상 학교인 {DEMO_SCHOOL}를 무대로 합니다. 사람과 학생은 모두 지어낸 인물입니다.</p>
      <ol className="day">
        {items.map((x, i) => (
          <li key={x.t} style={{ animationDelay: `${i * 0.07}s` }}>
            <span className="day-t">{x.t}</span>
            <span className="day-ico">{x.icon}</span>
            <p>{x.what}</p>
          </li>
        ))}
      </ol>
    </div>
  );
}

function Start({ head, onDone }: HeadRef & { onDone: (mode: IntroMode) => void }) {
  const { ready, send, setMe } = useApp();
  const [mode, setMode] = useState<IntroMode>("demo");
  const school = getSchool();
  const [f, setF] = useState({ name: "", school: school.school === DEMO_SCHOOL ? "" : school.school, level: school.level as SchoolLevel, homeroom: "" });
  const [err, setErr] = useState("");

  const enter = async () => {
    if (mode === "real") {
      if (!f.name.trim() || !f.school.trim()) return setErr("이름과 학교 이름을 적어 주세요.");
      saveSchool({ ...getSchool(), school: f.school.trim(), level: f.level, logo: undefined });
      saveMe("t1", { ...getMe("t1"), displayName: f.name.trim(), homeroom: f.homeroom.trim(), photo: undefined });
      setMe("t1");
      // the demo class records stay encrypted on the device but are hidden: a new, empty class
      if (ready) await send(ROOM.class21, { type: "rec.reset", reason: "fresh" });
    } else {
      setMe("t1");
    }
    finishIntro(mode);
    onDone(mode);
  };

  return (
    <div className="stack">
      <h1 ref={head} tabIndex={-1}>어떻게 시작할까요?</h1>
      <div className="choose" role="radiogroup" aria-label="시작 방법">
        <button role="radio" aria-checked={mode === "demo"} className="choice-card" onClick={() => setMode("demo")}>
          <b>시연으로 둘러보기</b>
          <span>{DEMO_SCHOOL}(가상) 김하늘 선생님이 되어 모든 기능을 봅니다. 왼쪽 아래에서 시간표 담당·교생으로 바꿀 수 있습니다.</span>
        </button>
        <button role="radio" aria-checked={mode === "real"} className="choice-card" onClick={() => setMode("real")}>
          <b>우리 학교에서 쓰기</b>
          <span>문서 변환·수업 슬라이드·가정통신문·학생 기록을 바로 씁니다. 빈 학급으로 시작하고, 정보는 이 기기에만 저장됩니다.</span>
        </button>
      </div>
      {mode === "real" && (
        <div className="grid two intro-form">
          <label className="field">내 이름<input id="in-name" type="text" autoComplete="name" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} /></label>
          <label className="field">학교 이름<input id="in-school" type="text" value={f.school} onChange={(e) => setF({ ...f, school: e.target.value })} placeholder="예: ○○중학교" /></label>
          <label className="field">학교급<select id="in-level" value={f.level} onChange={(e) => setF({ ...f, level: e.target.value as SchoolLevel })}><option value="중">중학교</option><option value="고">고등학교</option></select></label>
          <label className="field">담임 학급 <span className="hint">없으면 비움</span><input id="in-home" type="text" value={f.homeroom} onChange={(e) => setF({ ...f, homeroom: e.target.value })} placeholder="예: 2-1" /></label>
        </div>
      )}
      <ul className="promise" aria-label="약속">
        <li><ShieldCheck className="ico sm" aria-hidden /> 학생 기록과 대화는 기기에서 암호화하고, 서버는 내용을 볼 수 없습니다.</li>
        <li><Lock className="ico sm" aria-hidden /> AI에 넘길 때는 이름·학교·연락처를 가리고, 최종 판단은 선생님이 합니다.</li>
        <li><WifiOff className="ico sm" aria-hidden /> 한 번 열면 인터넷이 끊겨도 동작하고, 결과는 HWPX·XLSX 파일로 학교 업무망에 옮길 수 있습니다.</li>
      </ul>
      {err && <p className="meta" role="alert" style={{ color: "var(--danger)" }}>{err}</p>}
      <div className="intro-foot" style={{ padding: 0, border: 0 }}>
        <span />
        <button className="btn primary lg" onClick={() => void enter()} disabled={mode === "real" && !ready}>{mode === "demo" ? "시연 시작" : `${BRAND.name} 시작`} <ArrowRight className="ico sm" aria-hidden /></button>
      </div>
    </div>
  );
}
