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
}

export const sampleLetter = (): LetterData => ({
  school: "한빛중학교",
  docNo: "한빛중 제2026-312호",
  date: new Date().toISOString().slice(0, 10),
  audience: "학부모",
  title: "2학년 현장체험학습 안내",
  body: "학부모님 가정에 건강과 행복이 가득하시기를 바랍니다.\n\n본교 2학년 학생들이 국립중앙박물관에서 현장체험학습을 실시합니다. 학생들이 교과서에서 배운 우리 역사를 직접 보고 느낄 수 있도록 다음과 같이 안내드리오니, 학생이 안전하게 참여할 수 있도록 지도해 주시기 바랍니다.",
  schedule: [
    { label: "일시", value: "2026년 12월 9일(수) 09:00 ~ 15:00" },
    { label: "장소", value: "국립중앙박물관(서울 용산구)" },
    { label: "준비물", value: "교복, 필기도구, 개인 물병, 점심 도시락" },
    { label: "비용", value: "없음(교육청 지원)" },
  ],
  dept: "2학년부",
  teacher: "김하늘",
  phone: "02-123-4567",
  reply: { enabled: true, deadline: "2026-12-03", question: "현장체험학습 참가 여부", options: ["참가", "불참(사유: )"] },
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
  lines.push(`${fmtDate(l.date)}`, "", `**${l.school}장**`, "");
  if (l.reply.enabled) {
    lines.push("---", "", "✂ 자르는 선", "", `## ${l.title} 회신서`, "");
    lines.push(`${l.reply.question}: ${l.reply.options.map((o) => `□ ${o}`).join("   ")}`, "");
    lines.push("| 학년 | 반 | 번호 | 학생 이름 | 보호자 이름 | 서명 |", "| --- | --- | --- | --- | --- | --- |", "|  |  |  |  |  |  |", "");
    lines.push(`회신 기한: ${fmtDate(l.reply.deadline)}까지 담임 선생님께 제출해 주십시오.`);
  }
  return lines.join("\n");
}

// ---------------------------------------------------------------- plain language

export interface PlainHint {
  match: string;
  index: number;
  suggestion: string;
  reason: string;
}

// Common administrative words with easier alternatives (국립국어원 다듬은 말 / 공공언어 권고에서 흔히 쓰는 예).
const PLAIN: [RegExp, string, string][] = [
  [/송부/g, "보냄", "쉬운 말"],
  [/익일/g, "다음 날", "쉬운 말"],
  [/금일/g, "오늘", "쉬운 말"],
  [/명일/g, "내일", "쉬운 말"],
  [/상기/g, "위", "쉬운 말"],
  [/하기(?=의|와|와 같이)/g, "아래", "쉬운 말"],
  [/요망/g, "바람(…해 주십시오)", "쉬운 말"],
  [/필히/g, "꼭", "쉬운 말"],
  [/지참/g, "챙겨 옴", "쉬운 말"],
  [/수령/g, "받음", "쉬운 말"],
  [/기재/g, "적음", "쉬운 말"],
  [/제반/g, "여러", "쉬운 말"],
  [/만전을 기하/g, "빈틈없이 준비하", "쉬운 말"],
  [/회람/g, "돌려 봄", "쉬운 말"],
  [/~/g, "～ 대신 ‘부터 … 까지’", "읽기 쉬움"],
];

export function plainHints(text: string): PlainHint[] {
  const out: PlainHint[] = [];
  for (const [re, suggestion, reason] of PLAIN) {
    if (re.source === "~") continue; // ranges in schedules are fine
    for (const m of text.matchAll(re)) out.push({ match: m[0], index: m.index ?? 0, suggestion, reason });
  }
  // long sentences are hard to read on a phone
  for (const m of text.matchAll(/[^.!?\n]{90,}[.!?]?/g)) out.push({ match: `${m[0].trim().slice(0, 18)}…`, index: m.index ?? 0, suggestion: "두 문장으로 나누기", reason: `한 문장이 ${m[0].trim().length}자입니다` });
  return out.sort((a, b) => a.index - b.index);
}
