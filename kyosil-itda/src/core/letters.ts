// 가정통신문: form data → Markdown (→ HWPX/DOCX) and a plain-language check.

export type Audience = "학부모" | "학생" | "학부모·학생";

export interface LetterData {
  school: string;
  docNo: string;
  date: string; // YYYY-MM-DD
  audience: Audience;
  title: string;
  body: string; // Markdown allowed
  schedule: { label: string; value: string }[];
  dept: string;
  teacher: string;
  phone: string;
  reply: { enabled: boolean; deadline: string; question: string; options: string[] };
  /** 개인정보 수집·이용 동의 (개인정보 보호법 제15조제2항 4개 고지 항목, 제22조 구분 동의) */
  consent?: Consent;
  /** where 학교장 직인 goes: an empty box the school stamps, or nothing (직인 생략) */
  seal?: "slot" | "none";
}

export interface ConsentItem {
  required: boolean;
  purpose: string;
  fields: string;
  period: string;
  /** 동의를 거부할 권리 + 거부 시 불이익 */
  refusal: string;
}

export interface Consent {
  items: ConsentItem[];
  /** 만 14세 미만이면 법정대리인 동의(제22조의2) */
  under14: boolean;
}

export const sampleLetter = (): LetterData => ({
  school: "홍익중학교",
  docNo: "홍익중 제2026-312호",
  date: new Date().toISOString().slice(0, 10),
  audience: "학부모",
  title: "2학년 현장체험학습 안내",
  body: "학부모님 가정에 건강과 행복이 가득하시기를 바랍니다.\n\n본교 2학년 학생들이 국립중앙박물관에서 현장체험학습을 실시합니다. 학생들이 교과서에서 배운 우리 역사를 직접 보고 느낄 수 있도록 다음과 같이 안내드리오니, 학생이 안전하게 참여할 수 있도록 지도해 주시기 바랍니다.",
  schedule: [
    { label: "일시", value: "2026. 12. 9.(수) 09:00~15:00" },
    { label: "장소", value: "국립중앙박물관(서울 용산구)" },
    { label: "준비물", value: "교복, 필기도구, 개인 물병, 점심 도시락" },
    { label: "비용", value: "없음(교육청 지원)" },
  ],
  dept: "2학년부",
  teacher: "김하늘",
  phone: "02-123-4567",
  reply: { enabled: true, deadline: "2026-12-03", question: "현장체험학습 참가 여부", options: ["참가", "불참(사유: )"] },
  seal: "slot",
});

export const fmtDate = (iso: string) => {
  const d = new Date(`${iso}T00:00:00`);
  return Number.isNaN(+d) ? iso : `${d.getFullYear()}. ${d.getMonth() + 1}. ${d.getDate()}.`;
};

const greeting = (a: Audience) => (a === "학생" ? "학생 여러분, 안녕하세요." : a === "학부모·학생" ? "학부모님과 학생 여러분께" : "학부모님께");

/** The letter as Markdown — the same text feeds the preview, HWPX (kordoc) and DOCX writers. */
export function letterMarkdown(l: LetterData): string {
  const lines: string[] = [];
  lines.push(`# ${l.title}`, "");
  lines.push(`| 발행 | ${l.docNo} | 발행일 | ${fmtDate(l.date)} |`, "| --- | --- | --- | --- |", `| 담당 | ${l.dept} ${l.teacher} | 문의 | ${l.phone} |`, "");
  lines.push(greeting(l.audience), "", l.body.trim(), "");
  if (l.schedule.length) {
    lines.push("| 구분 | 내용 |", "| --- | --- |");
    for (const r of l.schedule) lines.push(`| ${r.label} | ${r.value.replace(/\|/g, "\\|")} |`);
    lines.push("");
  }
  lines.push(`${fmtDate(l.date)}`, "", `**${l.school}장**${l.seal === "none" ? "" : " (직인)"}`, "");
  if (l.reply.enabled || l.consent) {
    lines.push("---", "", "✂ 자르는 선", "", `## ${l.title} ${l.consent ? "동의서" : "회신서"}`, "");
    if (l.consent) lines.push(...consentMarkdown(l.consent), "");
    if (l.reply.enabled) lines.push(`${l.reply.question}: ${l.reply.options.map((o) => `□ ${o}`).join("   ")}`, "");
    lines.push("| 학년 | 반 | 번호 | 학생 이름 | 보호자 이름 | 서명 |", "| --- | --- | --- | --- | --- | --- |", "|  |  |  |  |  |  |", "");
    lines.push(`회신 기한: ${fmtDate(l.reply.deadline)}까지 담임 선생님께 제출해 주십시오.`);
    if (l.consent?.under14) lines.push("", "※ 학생이 만 14세 미만이면 법정대리인(보호자)이 동의하고 서명합니다(개인정보 보호법 제22조의2).");
  }
  return lines.join("\n");
}

export function consentMarkdown(c: Consent): string[] {
  const out: string[] = [];
  c.items.forEach((it, i) => {
    out.push(`### ${i + 1}. ${it.required ? "[필수]" : "[선택]"} 개인정보 수집·이용 동의`, "");
    out.push("| 구분 | 내용 |", "| --- | --- |");
    out.push(`| 수집·이용 목적 | ${it.purpose} |`, `| 수집 항목 | ${it.fields} |`, `| 보유·이용 기간 | **${it.period}** |`, `| 동의 거부 권리와 불이익 | ${it.refusal} |`, "");
    out.push(`위와 같이 개인정보를 수집·이용하는 데 동의하십니까?   □ 동의함   □ 동의하지 않음`, "");
  });
  return out;
}

// ---------------------------------------------------------------- templates

export interface LetterTemplate {
  id: string;
  name: string;
  desc: string;
  make: (base: Pick<LetterData, "school" | "date" | "dept" | "teacher" | "phone">) => LetterData;
}

const addDays = (iso: string, n: number) => {
  const d = new Date(`${iso}T00:00:00`);
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
};


export const TEMPLATES: LetterTemplate[] = [
  {
    id: "trip", name: "현장체험학습 안내·참가 동의", desc: "일시·장소·경비·안전 수칙과 참가 동의",
    make: (b) => ({ ...sampleLetter(), ...b, docNo: "", seal: "slot" }),
  },
  {
    id: "privacy", name: "개인정보 수집·이용 동의서", desc: "제15조 4개 고지 항목, 필수·선택 구분, 14세 미만",
    make: (b) => ({
      ...b, docNo: "", audience: "학부모·학생", seal: "slot",
      title: `${b.date.slice(0, 4)}학년도 학생 개인정보 수집·이용 동의 안내`,
      body: "본교는 학생 교육활동과 안전한 학교생활을 위해 아래와 같이 개인정보를 수집·이용하고자 합니다.\n\n각 항목을 읽어 보시고 동의 여부를 표시해 주십시오. 선택 항목에 동의하지 않아도 학교생활에는 불이익이 없습니다.",
      schedule: [],
      reply: { enabled: true, deadline: addDays(b.date, 7), question: "제출 확인", options: ["학생과 함께 읽었음"] },
      consent: {
        under14: true,
        items: [
          { required: true, purpose: "학적 관리, 비상 연락, 가정통신문 발송", fields: "학생 이름, 학년·반·번호, 보호자 이름, 보호자 휴대전화 번호", period: "졸업 후 1년까지", refusal: "동의를 거부할 수 있습니다. 다만 거부하면 비상 연락과 가정통신문 안내를 받을 수 없습니다." },
          { required: false, purpose: "학교 누리집·소식지에 교육활동 사진 게시", fields: "학생 사진·영상(얼굴 포함), 학년·반", period: "해당 학년도 말까지", refusal: "동의하지 않아도 학교생활에 불이익이 없습니다." },
        ],
      },
    }),
  },
  {
    id: "fee", name: "수익자 부담 경비 안내", desc: "금액(금 표기), 납부 방법·기한, 공개 절차",
    make: (b) => ({
      ...b, docNo: "", audience: "학부모", seal: "slot",
      title: "2학기 수익자 부담 경비 납부 안내",
      body: "학부모님 가정에 평안을 빕니다.\n\n학교운영위원회 심의를 거친 수익자 부담 경비를 아래와 같이 안내드립니다. 집행 후에는 정산 결과를 학교 누리집과 가정통신문으로 공개합니다.",
      schedule: [
        { label: "항목", value: "2학년 현장체험학습 차량비·입장료" },
        { label: "금액", value: "금25,000원(금이만오천원)" },
        { label: "납부 방법", value: "스쿨뱅킹 자동 이체" },
        { label: "출금일", value: "2026. 12. 15.(화)" },
      ],
      reply: { enabled: false, deadline: addDays(b.date, 7), question: "", options: [] },
    }),
  },
  {
    id: "counsel", name: "학부모 상담주간 신청", desc: "기간·방법(대면·전화·온라인) 선택 회신",
    make: (b) => ({
      ...b, docNo: "", audience: "학부모", seal: "none",
      title: "학부모 상담주간 운영 안내",
      body: "학부모님, 안녕하십니까?\n\n자녀의 학교생활을 함께 살피고자 학부모 상담주간을 운영합니다. 원하시는 날짜와 상담 방법을 회신서에 적어 주시면 담임 선생님이 시간을 정해 다시 연락드립니다.",
      schedule: [
        { label: "기간", value: "2026. 12. 7.(월)~12. 11.(금) 15:30~17:30" },
        { label: "방법", value: "대면, 전화, 온라인 중 선택" },
        { label: "장소", value: "각 학급 교실(대면 상담)" },
      ],
      reply: { enabled: true, deadline: addDays(b.date, 5), question: "희망 상담 방법", options: ["대면", "전화", "온라인", "희망하지 않음"] },
    }),
  },
];

// ---------------------------------------------------------------- 공문서 표기

const DIGIT = ["", "일", "이", "삼", "사", "오", "육", "칠", "팔", "구"];
/** 113560 → 일십일만삼천오백육십 (행정업무규정 시행규칙 제2조제2항 예시 형식) */
export function koreanAmount(n: number): string {
  if (!Number.isFinite(n) || n <= 0) return "영";
  const units = ["", "만", "억", "조"];
  let out = "", u = 0;
  while (n > 0) {
    const part = n % 10000;
    if (part) {
      const d = String(part).padStart(4, "0").split("").map(Number);
      const s = d.map((x, i) => (x ? DIGIT[x] + ["천", "백", "십", ""][i] : "")).join("");
      out = s + units[u] + out;
    }
    n = Math.floor(n / 10000);
    u++;
  }
  return out;
}

/** Date, time and money notation from 「행정업무의 운영 및 혁신에 관한 규정」 제7조 and 시행규칙 제2조. */
export function notationHints(text: string): PlainHint[] {
  const out: PlainHint[] = [];
  const add = (m: RegExpMatchArray, suggestion: string) => out.push({ match: m[0], index: m.index ?? 0, suggestion, reason: "공문서 표기(행정업무규정 제7조)" });
  for (const m of text.matchAll(/(\d{4})\s*년\s*(\d{1,2})\s*월\s*(\d{1,2})\s*일/g)) add(m, `${m[1]}. ${+m[2]}. ${+m[3]}.`);
  for (const m of text.matchAll(/(?<![\d.])(\d{4})[.\-/](\d{1,2})[.\-/](\d{1,2})(?![\d])\.?/g)) {
    const want = `${m[1]}. ${+m[2]}. ${+m[3]}.`;
    if (m[0] !== want) add(m, want);
  }
  for (const m of text.matchAll(/(\d{4})\.\s(0\d)\.\s(0?\d{1,2})\./g)) add(m, `${m[1]}. ${+m[2]}. ${+m[3]}.`);
  for (const m of text.matchAll(/(오전|오후)\s*(\d{1,2})\s*시(?:\s*(\d{1,2})\s*분|\s*반)?/g)) {
    let h = +m[2];
    if (m[1] === "오후" && h < 12) h += 12;
    if (m[1] === "오전" && h === 12) h = 0;
    const min = m[3] ? +m[3] : /반$/.test(m[0]) ? 30 : 0;
    add(m, `${String(h).padStart(2, "0")}:${String(min).padStart(2, "0")}`);
  }
  for (const m of text.matchAll(/(?<![오전후\d:])\b(\d{1,2})\s*시\s*(\d{1,2})\s*분/g)) add(m, `${m[1].padStart(2, "0")}:${m[2].padStart(2, "0")}`);
  for (const m of text.matchAll(/(?<![금\d,])(\d{1,3}(?:,\d{3})+|\d{4,})\s*원(?!\()/g)) {
    const n = Number(m[1].replace(/,/g, ""));
    out.push({ match: m[0], index: m.index ?? 0, suggestion: `금${n.toLocaleString("ko-KR")}원(금${koreanAmount(n)}원)`, reason: "금액 표기(시행규칙 제2조제2항)" });
  }
  // keep the longest match where two patterns hit the same text ("오후 3시 30분" vs "3시 30분")
  out.sort((a, b) => a.index - b.index || b.match.length - a.match.length);
  return out.filter((h, i) => !out.some((o, j) => j !== i && o.index <= h.index && o.index + o.match.length >= h.index + h.match.length && (o.match.length > h.match.length || j < i)));
}

// ---------------------------------------------------------------- plain language

export interface PlainHint {
  match: string;
  index: number;
  suggestion: string;
  reason: string;
}

// Easier words. "국립국어원" = 『한눈에 알아보는 공공언어 바로 쓰기』(2022) 필수 개선 행정용어 등 공식 자료,
// "다듬은 말" = 국립국어원·교육청 순화어 보도 자료, "관례" = 흔히 권하는 바꿔 쓰기.
const PLAIN: [RegExp, string, string][] = [
  [/금번|금회/g, "이번", "국립국어원"],
  [/익일/g, "다음 날", "국립국어원"],
  [/익월/g, "다음 달", "국립국어원"],
  [/익년|차년도/g, "다음 해", "국립국어원"],
  [/적기에/g, "제때", "국립국어원"],
  [/수범\s?사례/g, "모범 사례", "경기도교육청"],
  [/내역서/g, "명세서", "행정안전부"],
  [/별첨/g, "붙임", "다듬은 말"],
  [/구좌/g, "계좌", "다듬은 말"],
  [/잔고/g, "잔액", "다듬은 말"],
  [/가일층/g, "한층 더", "국립국어원"],
  [/감안하/g, "고려하", "국립국어원"],
  [/만전을 기하/g, "최선을 다하", "다듬은 말"],
  [/홈페이지/g, "누리집", "다듬은 말"],
  [/명기/g, "기록", "다듬은 말"],
  [/송부/g, "보냄", "관례"],
  [/금일/g, "오늘", "관례"],
  [/명일/g, "내일", "관례"],
  [/상기/g, "위", "관례"],
  [/하기(?=의|와|와 같이)/g, "아래", "관례"],
  [/요망/g, "바람(…해 주십시오)", "관례"],
  [/필히/g, "꼭", "관례"],
  [/지참/g, "챙겨 옴", "관례"],
  [/수령/g, "받음", "관례"],
  [/제반/g, "여러", "관례"],
  [/회람/g, "돌려 봄", "관례"],
];

export function plainHints(text: string): PlainHint[] {
  const out: PlainHint[] = [];
  for (const [re, suggestion, reason] of PLAIN) {
    for (const m of text.matchAll(re)) out.push({ match: m[0], index: m.index ?? 0, suggestion, reason });
  }
  // long sentences are hard to read on a phone
  for (const m of text.matchAll(/[^.!?\n]{90,}[.!?]?/g)) out.push({ match: `${m[0].trim().slice(0, 18)}…`, index: m.index ?? 0, suggestion: "두 문장으로 나누기", reason: `한 문장이 ${m[0].trim().length}자입니다` });
  return [...out, ...notationHints(text)].sort((a, b) => a.index - b.index);
}
