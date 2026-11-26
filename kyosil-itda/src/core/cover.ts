// Explainable cover-teacher recommendation.
// Pure, deterministic weighted scoring: every point in a score has a visible reason.
// The final decision always stays with people (consent + coordinator approval).

import { type Lesson, type Person, PERIODS, type Timetable } from "./school";

export interface Weights {
  fairness: number; // fewer recent covers -> higher
  load: number; // lighter day -> higher
  fatigue: number; // penalty for back-to-back lessons
  subject: number; // same subject / department
  familiarity: number; // already teaches this class / grade
}

export const DEFAULT_WEIGHTS: Weights = { fairness: 30, load: 20, fatigue: 15, subject: 20, familiarity: 15 };

export const WEIGHT_LABEL: Record<keyof Weights, string> = {
  fairness: "형평성",
  load: "당일 부담",
  fatigue: "연속 수업 피로",
  subject: "교과 연계",
  familiarity: "학급 친숙도",
};

export interface Factor {
  key: keyof Weights;
  points: number; // signed contribution after weighting
  max: number;
  reason: string;
}

export interface Candidate {
  personId: string;
  score: number; // 0-100 (clamped)
  factors: Factor[];
}

export interface Slot {
  absentId: string;
  day: number;
  period: number; // 0-based
  lesson: Lesson;
}

export interface CoverContext {
  people: Person[];
  timetable: Timetable;
  history: Record<string, number>;
  /** covers already assigned (accepted/applied) for the same week: personId -> [day, period][] */
  assigned?: Record<string, [number, number][]>;
  /** people unavailable that day (training, leave) */
  unavailable?: string[];
}

const busyAt = (ctx: CoverContext, id: string, day: number, period: number) =>
  !!ctx.timetable[id]?.[day]?.[period] ||
  !!ctx.assigned?.[id]?.some(([d, p]) => d === day && p === period);

const lessonsOn = (ctx: CoverContext, id: string, day: number) =>
  (ctx.timetable[id]?.[day] ?? []).filter(Boolean).length +
  (ctx.assigned?.[id]?.filter(([d]) => d === day).length ?? 0);

export function recommend(slot: Slot, ctx: CoverContext, w: Weights = DEFAULT_WEIGHTS): Candidate[] {
  const absent = ctx.people.find((p) => p.id === slot.absentId);
  const grade = Number(slot.lesson.classId[0]);
  const eligible = ctx.people.filter(
    (p) =>
      p.role !== "student-teacher" &&
      p.id !== slot.absentId &&
      !ctx.unavailable?.includes(p.id) &&
      !busyAt(ctx, p.id, slot.day, slot.period),
  );
  // School-wide scale (+1) so the least-busy candidate is not automatically 0 or 100.
  const maxHistory = Math.max(0, ...Object.values(ctx.history)) + 1;

  const out = eligible.map((p): Candidate => {
    const factors: Factor[] = [];
    const h = ctx.history[p.id] ?? 0;
    factors.push({
      key: "fairness",
      max: w.fairness,
      points: round(w.fairness * (1 - h / maxHistory)),
      reason: `최근 4주 대강 ${h}회`,
    });
    const load = lessonsOn(ctx, p.id, slot.day);
    factors.push({
      key: "load",
      max: w.load,
      points: round(w.load * (1 - load / PERIODS)),
      reason: `이날 수업 ${load}시간`,
    });
    const before = slot.period > 0 && busyAt(ctx, p.id, slot.day, slot.period - 1);
    const after = slot.period < PERIODS - 1 && busyAt(ctx, p.id, slot.day, slot.period + 1);
    const adjacent = Number(before) + Number(after);
    factors.push({
      key: "fatigue",
      max: 0,
      points: -round((w.fatigue * adjacent) / 2),
      reason: adjacent === 2 ? "앞뒤 교시 모두 수업" : adjacent === 1 ? (before ? "앞 교시 수업" : "뒤 교시 수업") : "앞뒤 교시 여유",
    });
    const sameSubject = p.subject === slot.lesson.subject;
    const sameDept = absent && p.department === absent.department;
    factors.push({
      key: "subject",
      max: w.subject,
      points: sameSubject ? w.subject : sameDept ? round(w.subject / 2) : 0,
      reason: sameSubject ? `같은 교과(${p.subject})` : sameDept ? `같은 교과군(${p.department})` : "다른 교과",
    });
    const teachesClass = ctx.timetable[p.id]?.some((day) => day.some((l) => l?.classId === slot.lesson.classId));
    const sameGrade = p.grades.includes(grade);
    factors.push({
      key: "familiarity",
      max: w.familiarity,
      points: teachesClass ? w.familiarity : sameGrade ? round(w.familiarity / 2) : 0,
      reason: teachesClass ? `${slot.lesson.classId} 수업 담당` : sameGrade ? `${grade}학년 수업 담당` : "이 학년 수업 없음",
    });
    const total = factors.reduce((s, f) => s + f.points, 0);
    const maxTotal = w.fairness + w.load + w.subject + w.familiarity || 1;
    return { personId: p.id, score: clamp(Math.round((total / maxTotal) * 100)), factors };
  });

  // Stable order: score desc, then fewer recent covers, then id.
  return out.sort(
    (a, b) => b.score - a.score || (ctx.history[a.personId] ?? 0) - (ctx.history[b.personId] ?? 0) || a.personId.localeCompare(b.personId),
  );
}

/** All lessons of the absent teacher on a day, as cover slots. */
export function slotsFor(absentId: string, day: number, tt: Timetable): Slot[] {
  return (tt[absentId]?.[day] ?? [])
    .map((lesson, period) => (lesson ? { absentId, day, period, lesson } : null))
    .filter((s): s is Slot => s !== null);
}

const round = (n: number) => Math.round(n * 10) / 10;
const clamp = (n: number) => Math.max(0, Math.min(100, n));

// ---- Swap-first suggestions ----------------------------------------------
// Schools try a lesson swap before a cover: the class loses no lesson and nobody
// teaches an extra period. A swap with teacher T works when T is free at the absent
// slot AND T teaches the same class on another day at a time the absent teacher is free.

export interface SwapOption {
  personId: string;
  day: number; // T's lesson the absent teacher takes over (on a day they are present)
  period: number;
  lesson: Lesson;
}

export function swapOptions(slot: Slot, ctx: CoverContext): SwapOption[] {
  const out: SwapOption[] = [];
  for (const p of ctx.people) {
    if (p.role === "student-teacher" || p.id === slot.absentId || ctx.unavailable?.includes(p.id)) continue;
    if (busyAt(ctx, p.id, slot.day, slot.period)) continue;
    (ctx.timetable[p.id] ?? []).forEach((day, d) =>
      day.forEach((l, per) => {
        if (!l || d === slot.day || l.classId !== slot.lesson.classId) return;
        if (busyAt(ctx, slot.absentId, d, per)) return;
        out.push({ personId: p.id, day: d, period: per, lesson: l });
      }),
    );
  }
  // Prefer swaps later in the same week (the absent teacher makes it up after returning).
  const dist = (o: SwapOption) => (o.day > slot.day ? o.day - slot.day : 10 + slot.day - o.day);
  return out.sort((a, b) => dist(a) - dist(b) || a.period - b.period || a.personId.localeCompare(b.personId));
}

// ---- Handoff card privacy check -------------------------------------------

export interface PrivacyWarning {
  kind: "phone" | "rrn" | "named-student" | "health";
  match: string;
  hint: string;
}

const NOT_NAMES = new Set([
  "모든", "일부", "전체", "해당", "결석", "지각", "우리", "다른", "몇몇", "담당", "대상", "개별", "남학", "여학",
  "참여", "발표", "모둠", "희망", "도움", "질문", "조퇴", "전학", "신입", "재학", "선도", "학급", "반장", "부반장",
]);

/** Heuristic warnings before a handoff card leaves the author. Not a guarantee. */
export function privacyCheck(text: string): PrivacyWarning[] {
  const out: PrivacyWarning[] = [];
  const push = (kind: PrivacyWarning["kind"], re: RegExp, hint: string) => {
    for (const m of text.matchAll(re)) out.push({ kind, match: m[0], hint });
  };
  push("phone", /01[016789][-.\s]?\d{3,4}[-.\s]?\d{4}/g, "연락처는 카드에 적지 마세요.");
  push("rrn", /\d{6}[-\s]?[1-4]\d{6}/g, "주민등록번호 형태가 있습니다.");
  for (const m of text.matchAll(/([가-힣]{2,4})\s?(?:학생|군|양)(?:은|는|이|가|을|를|에게|과|와|도|의)?(?=[\s,.!?]|$)/g)) {
    if (!NOT_NAMES.has(m[1])) out.push({ kind: "named-student", match: m[0], hint: "학생 이름 대신 '학생 A'처럼 적어 주세요." });
  }
  push("health", /(?:ADHD|우울|진단|약 복용|투약|장애)/g, "건강·민감 정보는 담임과 직접 공유하세요.");
  return out;
}
