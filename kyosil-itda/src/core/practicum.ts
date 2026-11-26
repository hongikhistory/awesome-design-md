// Teaching-practicum observation and feedback model.
// The rubric is an original, generic five-domain scale written for this demo.

export const TAGS = [
  { key: "question", label: "발문", color: "#0075de" },
  { key: "board", label: "판서·자료", color: "#2a9d99" },
  { key: "interaction", label: "상호작용", color: "#7b4fbf" },
  { key: "time", label: "시간 운영", color: "#dd5b00" },
  { key: "engagement", label: "학생 참여", color: "#1aae39" },
] as const;

export type TagKey = (typeof TAGS)[number]["key"];

export interface RubricDomain {
  key: string;
  label: string;
  levels: [string, string, string, string]; // 1..4
}

export const RUBRIC: RubricDomain[] = [
  { key: "design", label: "수업 설계", levels: ["목표가 드러나지 않음", "목표는 있으나 활동과 연결이 약함", "목표와 활동이 연결됨", "목표·활동·평가가 일관됨"] },
  { key: "question", label: "발문과 상호작용", levels: ["확인형 질문 위주", "열린 질문이 가끔 있음", "사고를 여는 발문과 기다림이 있음", "학생 답을 이어 받아 사고를 확장함"] },
  { key: "material", label: "판서·자료 활용", levels: ["자료가 수업을 방해함", "자료가 보조 역할에 그침", "자료가 이해를 도움", "자료가 핵심 개념을 구조화함"] },
  { key: "engagement", label: "학생 참여 관리", levels: ["일부 학생만 참여", "참여를 요청하나 반응이 낮음", "대부분이 참여함", "모든 학생이 역할을 가지고 참여함"] },
  { key: "time", label: "시간 운영", levels: ["계획과 크게 어긋남", "후반이 급하게 마무리됨", "계획대로 진행됨", "상황에 맞춰 유연하게 조정함"] },
];

export type Scores = Record<string, number>; // domain key -> 1..4

export interface Note {
  noteId: string;
  sessionId: string;
  t: number; // seconds since lesson start
  tag: TagKey;
  text: string;
  author: string;
}

export interface Session {
  sessionId: string;
  title: string;
  date: string;
  classId: string;
  plan: string;
  durationMin: number;
  createdBy: string;
}

export interface GapRow {
  key: string;
  label: string;
  self?: number;
  mentor?: number;
  gap?: number; // self - mentor
}

/** Self vs mentor rubric comparison; the largest |gap| becomes the debrief topic. */
export function gapAnalysis(self: Scores | undefined, mentor: Scores | undefined) {
  const rows: GapRow[] = RUBRIC.map((d) => {
    const s = self?.[d.key];
    const m = mentor?.[d.key];
    return { key: d.key, label: d.label, self: s, mentor: m, gap: s !== undefined && m !== undefined ? s - m : undefined };
  });
  const comparable = rows.filter((r) => r.gap !== undefined);
  const focus = [...comparable].sort((a, b) => Math.abs(b.gap!) - Math.abs(a.gap!) || a.key.localeCompare(b.key))[0];
  let topic: string | undefined;
  if (focus && focus.gap !== 0) {
    topic =
      focus.gap! > 0
        ? `‘${focus.label}’에서 교생 자기평가(${focus.self})가 지도교사 평가(${focus.mentor})보다 높습니다. 수업 장면을 근거로 함께 확인해 보세요.`
        : `‘${focus.label}’에서 교생이 스스로를 낮게(${focus.self}) 봤지만 지도교사는 ${focus.mentor}로 평가했습니다. 강점으로 인정해 주세요.`;
  } else if (comparable.length === RUBRIC.length) {
    topic = "자기평가와 지도교사 평가가 모든 영역에서 일치합니다. 다음 목표를 함께 정해 보세요.";
  }
  return { rows, focus: focus && focus.gap !== 0 ? focus : undefined, topic };
}

/** Distribution of observation tags over lesson time, for the timeline view. */
export function tagSummary(notes: Note[]) {
  const counts = Object.fromEntries(TAGS.map((t) => [t.key, 0])) as Record<TagKey, number>;
  for (const n of notes) counts[n.tag]++;
  return counts;
}

export const fmtClock = (sec: number) => `${String(Math.floor(sec / 60)).padStart(2, "0")}:${String(Math.floor(sec % 60)).padStart(2, "0")}`;
