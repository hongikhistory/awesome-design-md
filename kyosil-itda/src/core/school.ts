// Fictional demo school. Every name and number here is invented for the demo.

export type Role = "teacher" | "coordinator" | "student-teacher";

export interface Person {
  id: string;
  name: string;
  subject: string;
  department: string;
  role: Role;
  /** grades (1-3) this person usually teaches */
  grades: number[];
  room: string; // home office / building for proximity
  color: string;
}

export interface Lesson {
  classId: string; // "2-1"
  subject: string;
}

/** timetable[personId][day 0-4][period 0-6] */
export type Timetable = Record<string, (Lesson | null)[][]>;

export const DAYS = ["월", "화", "수", "목", "금"] as const;
export const PERIODS = 7;
export const CLASSES = ["1-1", "1-2", "2-1", "2-2", "3-1", "3-2"];

/** Middle-school bell schedule: 45-minute lessons, 10-minute breaks, lunch after 4th. */
export const PERIOD_TIMES = ["09:00", "09:55", "10:50", "11:45", "13:30", "14:25", "15:20"];

export const PEOPLE: Person[] = [
  { id: "t1", name: "곽민혁", subject: "역사", department: "인문", role: "teacher", grades: [2, 3], room: "본관 2층", color: "#0075de" },
  { id: "t2", name: "이서준", subject: "수학", department: "자연", role: "teacher", grades: [1, 2], room: "본관 3층", color: "#2a9d99" },
  { id: "t3", name: "박민지", subject: "영어", department: "인문", role: "coordinator", grades: [1, 3], room: "본관 2층", color: "#dd5b00" },
  { id: "t4", name: "최도윤", subject: "과학", department: "자연", role: "teacher", grades: [2, 3], room: "과학관", color: "#1aae39" },
  { id: "t5", name: "정유나", subject: "사회", department: "인문", role: "teacher", grades: [1, 2], room: "본관 2층", color: "#7b4fbf" },
  { id: "t6", name: "강지호", subject: "역사", department: "인문", role: "teacher", grades: [1], room: "본관 3층", color: "#c2185b" },
  { id: "t7", name: "윤채원", subject: "체육", department: "예체능", role: "teacher", grades: [1, 2, 3], room: "체육관", color: "#523410" },
  { id: "t8", name: "한지민", subject: "수학", department: "자연", role: "teacher", grades: [3], room: "본관 3층", color: "#213183" },
  { id: "s1", name: "오세린", subject: "역사", department: "인문", role: "student-teacher", grades: [2], room: "본관 2층", color: "#d63d4a" },
  { id: "s2", name: "윤다온", subject: "수학", department: "자연", role: "student-teacher", grades: [1], room: "본관 3층", color: "#9e6a00" },
];

export const ROLE_LABEL: Record<Role, string> = {
  teacher: "교사",
  coordinator: "교사 · 시간표 담당",
  "student-teacher": "교생",
};

export const person = (id: string) => PEOPLE.find((p) => p.id === id);
export const nameOf = (id: string) => person(id)?.name ?? id;

/** Recent cover duties in the last four weeks (fairness input). */
export const COVER_HISTORY: Record<string, number> = { t1: 2, t2: 3, t3: 1, t4: 1, t5: 0, t6: 2, t7: 4, t8: 1 };

function mulberry32(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Deterministic timetable: no teacher and no class is double-booked,
 * each teacher teaches only classes of their grades, ~14-20 periods a week.
 */
export function buildTimetable(seed = 20261126): Timetable {
  const rand = mulberry32(seed);
  const teachers = PEOPLE.filter((p) => p.role !== "student-teacher");
  const tt: Timetable = {};
  for (const t of teachers) tt[t.id] = DAYS.map(() => Array<Lesson | null>(PERIODS).fill(null));
  const weekly = new Map(teachers.map((t) => [t.id, 0]));
  for (let d = 0; d < DAYS.length; d++) {
    for (let p = 0; p < PERIODS; p++) {
      if (d === 4 && p === 6) continue; // Friday 7th: club time
      const busy = new Set<string>();
      for (const classId of CLASSES) {
        if (rand() < 0.12) continue; // self-study / homeroom period
        const grade = Number(classId[0]);
        const pool = teachers
          .filter((t) => t.grades.includes(grade) && !busy.has(t.id) && (weekly.get(t.id) ?? 0) < 20)
          .sort((a, b) => (weekly.get(a.id)! - weekly.get(b.id)!) || rand() - 0.5);
        const pick = pool[0];
        if (!pick) continue;
        busy.add(pick.id);
        weekly.set(pick.id, (weekly.get(pick.id) ?? 0) + 1);
        tt[pick.id][d][p] = { classId, subject: pick.subject };
      }
    }
  }
  return tt;
}

export const TIMETABLE = buildTimetable();
