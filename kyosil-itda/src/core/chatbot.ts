// 이음이: the app's helper character. It runs entirely in this browser with plain rules — no AI service,
// no network, nothing typed here is stored or sent. It answers how-to questions, opens screens, and
// starts the subject lesson packs; for anything it cannot do it says so instead of guessing.

import { neisBytes } from "./records";
import { findPack, PACKS, type Pack } from "./packs";
import { KEYWORDS, PAGE_LABEL } from "./pages";

export type Mood = "hi" | "happy" | "think" | "oops";
export type ChatAction =
  | { kind: "go"; page: string; label: string }
  | { kind: "pack"; pack: Pack; to: "slides" | "activities"; label: string }
  | { kind: "packs"; label: string }
  | { kind: "timer"; seconds: number; label: string }
  | { kind: "say"; text: string; label: string };
export interface Reply { text: string; actions: ChatAction[]; mood: Mood; pack?: Pack }
export interface ChatContext { name: string; next?: string; opener?: string; roster: string[]; pick: (n: number) => number }

const has = (t: string, ...ws: string[]) => ws.some((w) => t.includes(w));
export const SUGGESTIONS = ["수학 수업 만들어 줘", "발표할 학생 한 명 뽑아 줘", "5분 타이머", "다음 수업 알려 줘", "날짜는 어떻게 써?", "세특 바이트 세 줘"];

const packActions = (p: Pack): ChatAction[] => [
  { kind: "pack", pack: p, to: "slides", label: "슬라이드로 열기" },
  { kind: "pack", pack: p, to: "activities", label: "학생 활동으로 열기" },
];

export function reply(input: string, ctx: ChatContext): Reply {
  const raw = input.trim();
  const t = raw.toLowerCase().replace(/\s+/g, " ");
  if (!t || /\bhi\b/.test(t) || has(t, "안녕", "hello", "도움", "뭐 할", "무엇을 할", "할 수 있")) {
    return { mood: "hi", text: `안녕하세요, ${ctx.name} 선생님! 저는 이음이예요. 과목별 수업 꾸러미를 만들고, 학생을 뽑고, 타이머를 맞추고, 필요한 화면을 열어 드려요. 이 기기 안에서만 동작해서 적은 내용은 어디로도 보내지 않아요.`, actions: SUGGESTIONS.slice(0, 4).map((s) => ({ kind: "say", text: s, label: s })) };
  }

  // timer: “5분 타이머”, “타이머 3분”, “90초”
  const tm = /(\d{1,3})\s*(분|초)/.exec(t);
  if (has(t, "타이머", "알람", "재 줘", "재줘") && tm) {
    const sec = Math.min(Number(tm[1]) * (tm[2] === "분" ? 60 : 1), 3600);
    return { mood: "happy", text: `${tm[1]}${tm[2]} 타이머를 시작할게요. 끝나면 알려 드릴게요.`, actions: [{ kind: "timer", seconds: sec, label: "시작" }] };
  }
  if (has(t, "타이머")) return { mood: "think", text: "몇 분으로 맞출까요? 예: ‘5분 타이머’", actions: [3, 5, 10].map((m) => ({ kind: "say", text: `${m}분 타이머`, label: `${m}분` })) };

  // pick a student
  if (has(t, "뽑아", "뽑기", "추첨", "발표자", "누가 발표", "한 명")) {
    if (!ctx.roster.length) return { mood: "oops", text: "학급 명렬표가 비어 있어요. 학급 도구함에서 이름을 넣어 주세요.", actions: [{ kind: "go", page: "classtools", label: "학급 도구함" }] };
    const who = ctx.roster[ctx.pick(ctx.roster.length)];
    return { mood: "happy", text: `두구두구… ${who} 학생! 🎉 공정하게 뽑으려고 브라우저의 암호 난수를 썼어요.`, actions: [{ kind: "say", text: "한 명 더 뽑아 줘", label: "한 명 더" }, { kind: "go", page: "classtools", label: "룰렛으로 크게" }] };
  }

  // lesson packs
  const wantsMake = has(t, "만들", "생성", "준비", "꾸러미", "체험", "수업");
  const p = findPack(t);
  if (p && (wantsMake || has(t, "퀴즈", "문제", "활동"))) {
    return { mood: "happy", pack: p, text: `${p.subject} 수업 꾸러미를 준비했어요. ‘${p.topic}’(${p.grade}) 지도안, 확인 문제 3개, 근거 판단 활동, 출구 카드가 들어 있어요. 내용은 교과서 수준으로 정리한 예시라 수업 전에 한 번 확인해 주세요.`, actions: [...packActions(p), { kind: "packs", label: "다른 과목 보기" }] };
  }
  if (wantsMake && has(t, "만들", "생성")) {
    return { mood: "think", text: `어떤 과목으로 만들까요? 바로 체험할 수 있는 꾸러미가 ${PACKS.length}개 있어요. 다른 주제는 ‘과목별 수업 만들기’에서 뼈대와 AI 요청문을 만들어 드려요.`, actions: [...PACKS.slice(0, 5).map((x) => ({ kind: "say" as const, text: `${x.subject} 수업 만들어 줘`, label: x.subject })), { kind: "packs", label: "모든 과목" }] };
  }

  if (has(t, "다음 수업", "몇 교시", "시간표")) return { mood: "hi", text: ctx.next || "오늘 남은 수업이 없어요.", actions: [{ kind: "go", page: "today", label: "오늘 화면" }] };
  if (has(t, "여는 질문", "발문", "도입 질문")) return { mood: "happy", text: `오늘의 수업 여는 질문이에요.\n“${ctx.opener ?? "오늘 가장 기대되는 일 하나는 무엇인가요?"}”`, actions: [{ kind: "go", page: "today", label: "교실 화면에 띄우러 가기" }] };

  // NEIS bytes: “바이트 세 줘: …”
  if (has(t, "바이트", "글자 수", "글자수")) {
    const body = raw.split(/[:：]/).slice(1).join(":").trim();
    if (!body) return { mood: "think", text: "‘바이트: ’ 뒤에 문장을 붙여 주세요. 한글 한 글자는 3바이트, 영문·숫자·공백은 1바이트로 셉니다.", actions: [{ kind: "go", page: "students", label: "학생 기록에서 점검" }] };
    const b = neisBytes(body);
    return { mood: "happy", text: `${body.length}자, NEIS 기준 ${b.toLocaleString()}바이트예요. 교과 세특 한도 1,500바이트(500자)의 ${Math.round((b / 1500) * 100)}%예요.`, actions: [{ kind: "go", page: "students", label: "금지 표현까지 점검" }] };
  }

  if (has(t, "날짜", "표기", "금액", "공문")) {
    return { mood: "hi", text: "공문서 표기는 이렇게 써요.\n· 날짜: 2026. 11. 26.(목)\n· 시각: 14:30 (24시각제)\n· 금액: 금15,000원(금일만오천원)\n가정통신문 화면에서 자동으로 점검해 드려요.", actions: [{ kind: "go", page: "letters", label: "가정통신문" }] };
  }
  if (has(t, "개인정보", "안전", "보안", "저장", "ai")) {
    return { mood: "hi", text: "저는 인터넷 AI를 쓰지 않는 규칙 기반 도우미예요. 학생 기록은 담임 기기에서만 열리고, 외부 AI에 넘길 요청문은 이름·학교·연락처를 가린 뒤 복사만 해 드려요.", actions: [{ kind: "go", page: "trust", label: "보안 확인" }] };
  }

  // navigation by keyword
  const hits = Object.entries(KEYWORDS).filter(([, w]) => w.split(" ").some((k) => k.length > 1 && t.includes(k)));
  if (hits.length) {
    return { mood: "hi", text: hits.length === 1 ? `‘${PAGE_LABEL[hits[0][0]]}’ 화면에서 할 수 있어요.` : "이 화면들에서 할 수 있어요.", actions: hits.slice(0, 3).map(([k]) => ({ kind: "go", page: k, label: PAGE_LABEL[k] })) };
  }

  return { mood: "oops", text: "앗, 아직 그 말은 잘 몰라요. 저는 정해진 일만 할 줄 아는 도우미예요. 이런 건 바로 할 수 있어요!", actions: SUGGESTIONS.map((s) => ({ kind: "say", text: s, label: s })) };
}
