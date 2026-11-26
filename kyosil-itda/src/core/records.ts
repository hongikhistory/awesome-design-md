// 학교생활기록부 기재 도우미: NEIS byte counting, per-item limits, and a rule-based checker.
//
// Sources and confidence are kept next to every rule so the UI can show them honestly.
// "official" = 학교생활기록부 종합지원포털 Q&A or a 시도교육청 기재요령 excerpt (checked via search
// excerpts, not the full PDF). "verify" = only secondary sources; the school must confirm.
// "custom" = common practice, not a written rule. A teacher always makes the final call.

export type Confidence = "official" | "verify" | "custom";

export type RecordItem = "subject" | "individual" | "behavior" | "autonomy" | "club" | "career";

export const ITEM_LABEL: Record<RecordItem, string> = {
  subject: "과목별 세특",
  individual: "개인별 세특",
  behavior: "행동특성 및 종합의견",
  autonomy: "자율·자치활동",
  club: "동아리활동",
  career: "진로활동",
};

export type SchoolYear = 2025 | 2026;

export interface Limit {
  chars: number;
  confidence: Confidence;
  note: string;
}

/** Maximum characters (Hangul) per item. NEIS stores 3 bytes per Hangul character. */
export const LIMITS: Record<SchoolYear, Record<RecordItem, Limit>> = {
  2025: {
    subject: { chars: 500, confidence: "official", note: "과목별 최대 500자(공통과목1·2 합산 500자)" },
    individual: { chars: 500, confidence: "verify", note: "2차 자료 기준, 원문 대조 필요" },
    behavior: { chars: 500, confidence: "official", note: "2026학년도에 300자로 축소 전 기준" },
    autonomy: { chars: 500, confidence: "verify", note: "원문 대조 필요" },
    club: { chars: 500, confidence: "verify", note: "원문 대조 필요" },
    career: { chars: 700, confidence: "official", note: "2026학년도에 500자로 축소 전 기준" },
  },
  2026: {
    subject: { chars: 500, confidence: "official", note: "과목별 최대 500자(공통과목1·2 합산 500자)" },
    individual: { chars: 500, confidence: "verify", note: "2차 자료 기준, 원문 대조 필요" },
    behavior: { chars: 300, confidence: "official", note: "2026학년도 고등학교 300자(포털 답변: 전 학년 적용, 일부 발췌는 고3은 2027.3.1. 적용으로 읽힘)" },
    autonomy: { chars: 500, confidence: "verify", note: "축소 대상 발표에 없음, 원문 대조 필요" },
    club: { chars: 500, confidence: "verify", note: "축소 대상 발표에 없음, 원문 대조 필요" },
    career: { chars: 500, confidence: "official", note: "2026학년도 고등학교 500자(포털 답변: 전 학년 적용, 일부 발췌는 고3은 2027.3.1. 적용으로 읽힘)" },
  },
};

export type SchoolLevel = "중" | "고";

/**
 * 중학교: the 2026 cut (행특 300자, 진로 500자) was announced for 고등학교. Whether the 중학교
 * 기재요령 applies the same numbers is not confirmed from the original, so 중학교 values are
 * shown with "verify" and the teacher can switch the 기준 학년도.
 */
export function limitFor(level: SchoolLevel, year: SchoolYear, item: RecordItem): Limit {
  const l = LIMITS[year][item];
  if (level === "고") return l;
  return { ...l, confidence: l.confidence === "custom" ? "custom" : "verify", note: `고등학교 기준 수치입니다. 중학교 기재요령 부록에서 확인하세요. (${l.note})` };
}

const isHangul = (cp: number) => (cp >= 0xac00 && cp <= 0xd7a3) || (cp >= 0x1100 && cp <= 0x11ff) || (cp >= 0x3130 && cp <= 0x318f);

/**
 * NEIS byte count: 한글 1자 3Byte, 영문·숫자 1Byte. Sources disagree on 엔터 (1Byte in one
 * 기재요령 excerpt, 2Byte in another), so a line break is counted as 2 bytes to stay on the safe side.
 * Spaces and ASCII punctuation are counted as 1 byte (secondary sources); other symbols as 3 bytes
 * (UTF-8 width) so the counter never under-counts.
 */
export function neisBytes(text: string): number {
  let bytes = 0;
  for (const ch of text.replace(/\r\n/g, "\n")) {
    const cp = ch.codePointAt(0)!;
    if (ch === "\n") bytes += 2;
    else if (cp < 0x80) bytes += 1;
    else if (isHangul(cp)) bytes += 3;
    else bytes += 3;
  }
  return bytes;
}

export const limitBytes = (l: Limit) => l.chars * 3;

// ------------------------------------------------------------------ checker

export type Level = "금지" | "주의" | "문체";

export interface Finding {
  rule: string;
  level: Level;
  match: string;
  index: number;
  reason: string;
  confidence: Confidence;
}

interface Rule {
  rule: string;
  level: Level;
  re: RegExp;
  reason: string;
  confidence: Confidence;
  /** optional extra condition on the sentence that contains the match */
  sentence?: RegExp;
}

const RULES: Rule[] = [
  { rule: "공인어학시험", level: "금지", re: /TOEIC|TOEFL|TEPS|IELTS|OPIc|토익|토플|텝스|아이엘츠|오픽|HSK|JLPT|JPT|DELF|DELE|ZD/gi, reason: "공인어학시험의 참여 사실·성적·수상은 어떤 항목에도 쓸 수 없습니다.", confidence: "official" },
  { rule: "교외대회", level: "금지", re: /올림피아드|경시대회|교외\s?대회|전국\s?대회|국제\s?대회/g, reason: "교외대회 참여·성적·수상은 학교장 허락을 받았어도 쓸 수 없습니다.", confidence: "official" },
  { rule: "교외상", level: "금지", re: /(?:표창장|감사장|공로상)/g, reason: "교외 기관·단체가 준 상은 쓸 수 없습니다. 교내 수상은 ‘수상경력’ 항목에만 입력합니다.", confidence: "official", sentence: /교외|외부|기관|단체|시청|구청|협회|재단/ },
  { rule: "수상 언급", level: "주의", re: /(?:대상|금상|은상|동상|장려상|최우수상|우수상|입상|수상)/g, reason: "수상 실적은 서술형 항목이 아니라 ‘수상경력’ 항목에 입력합니다.", confidence: "official" },
  { rule: "인증시험", level: "금지", re: /한국사능력검정|컴퓨터활용능력|한자능력검정|정보처리기능사|ITQ|MOS|인증시험|자격증\s?(?:취득|합격)/gi, reason: "교내·외 인증시험의 참여 사실이나 성적은 쓸 수 없습니다.", confidence: "official" },
  { rule: "모의고사 성적", level: "금지", re: /모의고사|모의평가|전국연합학력평가|학력평가/g, reason: "모의고사·전국연합학력평가 성적(원점수, 석차 등)은 쓸 수 없습니다.", confidence: "official" },
  { rule: "부모의 사회·경제적 지위", level: "금지", re: /(?:아버지|어머니|부모님?|부친|모친|아빠|엄마|삼촌|이모|고모)(?:의|께서|가|는|와)?/g, reason: "부모(친인척 포함)의 직업·직장·직위 등 사회·경제적 지위를 암시하는 내용은 쓸 수 없습니다.", confidence: "official", sentence: /직업|직장|근무|회사|의사|변호사|교수|판사|검사|공무원|대표|사장|원장|임원|사업/ },
  { rule: "대학명", level: "금지", re: /[가-힣A-Za-z]{2,}대학교|(?:서울대|연세대|고려대|카이스트|KAIST|포스텍)/g, reason: "구체적인 대학명은 쓸 수 없습니다(교육관련기관 예외 제외).", confidence: "official" },
  { rule: "상호명", level: "금지", re: /\(주\)|㈜|주식회사|[가-힣]+(?:학원|교습소)/g, reason: "구체적인 기관명·상호명·강사명은 쓸 수 없습니다.", confidence: "official" },
  { rule: "사교육", level: "금지", re: /학원|과외|인강|인터넷\s?강의|사교육|컨설팅/g, reason: "사교육 유발 요인으로 어떤 항목에도 쓸 수 없습니다.", confidence: "official" },
  { rule: "논문·학회", level: "금지", re: /학회지?|학술지|학술대회|등재|투고/g, reason: "논문을 학회지에 투고·등재하거나 학회에서 발표한 사실은 쓸 수 없습니다.", confidence: "official" },
  { rule: "논문", level: "주의", re: /논문/g, reason: "소논문·연구보고서 기재 여부는 학교 기준을 확인하세요(공식 예외 조항 미확인).", confidence: "verify" },
  { rule: "도서 출간", level: "금지", re: /출간|출판|저서|책을\s?(?:펴냄|냄|발간)|발간/g, reason: "도서 출간 사실은 쓸 수 없습니다(2026 중학교 기재요령 확인, 고등학교는 원문 대조 필요).", confidence: "verify" },
  { rule: "지식재산권", level: "금지", re: /특허|실용신안|상표\s?(?:등록|출원)|디자인\s?(?:등록|출원)|출원/g, reason: "지식재산권의 출원·등록 사실은 쓸 수 없습니다(2023 기재요령 확인).", confidence: "verify" },
  { rule: "해외 활동", level: "금지", re: /어학연수|해외\s?(?:봉사|탐방|캠프|연수|활동)|국외\s?(?:봉사|연수)|유학/g, reason: "어학연수·해외 봉사 등 해외 활동실적은 쓸 수 없습니다.", confidence: "official" },
  { rule: "장학", level: "주의", re: /장학생|장학금/g, reason: "장학생·장학금 관련 내용은 기재 제한 대상일 수 있습니다(원문 미확인).", confidence: "verify" },
  { rule: "학교명", level: "금지", re: /[가-힣]{2,}(?:중학교|고등학교|여자중학교|여자고등학교)|[가-힣]{2,}(?:중|고)\s?축제/g, reason: "재학 학교를 알 수 있는 내용(학교명, 축제명 등)은 쓸 수 없습니다.", confidence: "official" },
  { rule: "번호·기호", level: "문체", re: /^\s*(?:[①-⑳]|\d+[.)]|[-•*·▶■□○●])\s*/gm, reason: "서술형 항목에는 특수문자와 문단 구분 기호(번호)를 쓰지 않는 것을 권장합니다.", confidence: "official" },
];

/** Sentences should end with a 명사형 어미 (…함/…임/…됨). Flags sentences ending in -다/-요. */
function styleFindings(text: string): Finding[] {
  const out: Finding[] = [];
  for (const m of text.matchAll(/[^.!?\n]*?(?:습니다|입니다|했다|한다|이다|된다|있다|였다|어요|아요|해요|예요|이에요)[.!?]?(?=\s|$)/g)) {
    const s = m[0].trim();
    if (!s) continue;
    out.push({ rule: "명사형 종결", level: "문체", match: s.slice(-12), index: (m.index ?? 0) + m[0].indexOf(s), reason: "서술형 문장은 명사형 어미(…함, …임, …됨)로 끝냅니다.", confidence: "official" });
  }
  return out;
}

export function checkRecord(text: string, opts: { studentName?: string } = {}): Finding[] {
  const out: Finding[] = [];
  const sentenceAt = (i: number) => {
    const start = Math.max(text.lastIndexOf(".", i - 1), text.lastIndexOf("\n", i - 1)) + 1;
    const endDot = text.indexOf(".", i);
    const endNl = text.indexOf("\n", i);
    const ends = [endDot, endNl].filter((x) => x >= 0);
    return text.slice(start, ends.length ? Math.min(...ends) : text.length);
  };
  for (const r of RULES) {
    for (const m of text.matchAll(r.re)) {
      const index = m.index ?? 0;
      if (r.sentence && !r.sentence.test(sentenceAt(index))) continue;
      // "대상" as a noun (참여 대상) is common; only flag it next to 수상 words
      if (r.rule === "수상 언급" && m[0] === "대상" && !/수상|받|차지/.test(sentenceAt(index))) continue;
      out.push({ rule: r.rule, level: r.level, match: m[0].trim(), index, reason: r.reason, confidence: r.confidence });
    }
  }
  // 학원 is caught by both 사교육 and 상호명; keep the more specific one
  const seen = new Set<string>();
  const dedup = out.filter((f) => {
    const k = `${f.index}:${f.match}`;
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
  if (opts.studentName && opts.studentName.length >= 2) {
    for (const m of text.matchAll(new RegExp(opts.studentName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "g")))
      dedup.push({ rule: "학생 이름", level: "문체", match: m[0], index: m.index ?? 0, reason: "학생 이름은 쓰지 않는 것이 일반적인 관례입니다(공식 조항은 미확인).", confidence: "custom" });
  }
  return [...dedup, ...styleFindings(text)].sort((a, b) => a.index - b.index);
}

// ------------------------------------------------------------------ AI draft prompt

export interface Observation {
  date: string;
  text: string;
}

/**
 * Builds a Markdown prompt a teacher can paste into an AI assistant.
 * The student's name is replaced, and the prompt reminds that the teacher must rewrite and verify:
 * the 2026 기재요령 forbids entering generative-AI output as-is.
 */
export function draftPrompt(o: { item: RecordItem; subject?: string; year: SchoolYear; level?: SchoolLevel; observations: Observation[]; studentName?: string; grade?: string; schoolName?: string; classmates?: string[] }) {
  const limit = limitFor(o.level ?? "고", o.year, o.item);
  // 가명 처리: the student, classmates (whole names and given names) and the school never leave the device.
  const swaps: [string, string][] = [];
  if (o.studentName) swaps.push([o.studentName, "학생"]);
  for (const n of o.classmates ?? []) if (n && n !== o.studentName && n.length >= 2) swaps.push([n, "다른 학생"]);
  if (o.schoolName) swaps.push([o.schoolName, "본교"], [o.schoolName.replace(/학교$/, ""), "본교"]);
  for (const n of [o.studentName, ...(o.classmates ?? [])]) if (n && n.length === 3) swaps.push([n.slice(1), n === o.studentName ? "학생" : "다른 학생"]);
  swaps.sort((a, b) => b[0].length - a[0].length);
  const scrub = (s: string) => swaps.reduce((t, [a, b]) => (a ? t.split(a).join(b) : t), s).replace(/01[016789]-?\d{3,4}-?\d{4}/g, "(전화번호)");
  const obs = o.observations.map((x) => `- ${x.date}: ${scrub(x.text)}`).join("\n") || "- (관찰 기록 없음)";
  return `# 학교생활기록부 초안 작성 요청

- 항목: ${ITEM_LABEL[o.item]}${o.subject ? ` (${o.subject})` : ""}
- 분량: 한글 ${limit.chars}자 이내 (NEIS ${limit.chars * 3}바이트)
- 학년: ${o.grade ?? "미입력"}

## 교사가 직접 관찰한 사실
${obs}

## 작성 규칙
1. 위 관찰 사실에 있는 내용만 쓴다. 없는 활동이나 성과를 만들지 않는다.
2. 문장은 명사형 어미(…함, …임, …됨)로 끝낸다.
3. 학생 이름, 학교명, 대학명, 기관·상호명, 강사명을 쓰지 않는다.
4. 공인어학시험, 교외대회·교외상, 인증시험, 모의고사 성적, 사교육, 논문·학회, 도서 출간, 특허, 해외 활동, 부모의 사회·경제적 지위를 쓰지 않는다.
5. 번호나 특수문자로 문단을 나누지 않는다.
6. 구체적인 행동과 변화가 드러나게 쓴다.

> 이 초안은 참고용입니다. 생성형 AI가 만든 문장을 그대로 입력하는 것은 2026학년도 기재요령에서 금지되므로, 교사가 직접 사실을 확인하고 고쳐 써야 합니다.
`;
}
