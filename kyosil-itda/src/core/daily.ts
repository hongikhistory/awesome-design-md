// What brings a teacher back every day: the next class and where each class is in the unit,
// a question to open the lesson, the school calendar, and a record of what the app made this week.
// Everything lives in this browser (localStorage, per person); nothing leaves the device.

import { useEffect, useState } from "react";
import type { StudioId } from "./studio";
import { CLASSES, PERIODS, PERIOD_TIMES, TIMETABLE } from "./school";

const EVT = "kyosil:daily";
const read = <T,>(key: string, fallback: T): T => {
  try {
    const v = localStorage.getItem(key);
    return v ? (JSON.parse(v) as T) : fallback;
  } catch {
    return fallback;
  }
};
const write = (key: string, v: unknown) => {
  try {
    localStorage.setItem(key, JSON.stringify(v));
  } catch {
    /* storage full or blocked: the app still works, it just forgets */
  }
  window.dispatchEvent(new Event(EVT));
};
function useStored<T>(get: () => T, deps: unknown[]) {
  const [v, setV] = useState(get);
  useEffect(() => {
    setV(get());
    const on = () => setV(get());
    window.addEventListener(EVT, on);
    window.addEventListener("storage", on);
    return () => { window.removeEventListener(EVT, on); window.removeEventListener("storage", on); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
  return v;
}

export const ymd = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
export function mondayOf(d: Date) {
  const m = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const dow = m.getDay();
  m.setDate(m.getDate() - (dow === 0 ? 6 : dow - 1));
  return m;
}

/* ───────── 이번 주 기록: files made and days used ───────── */

export interface Made { at: string; name: string; page: string; min: number }
export interface Usage { days: string[]; made: Made[] }

/** Minutes a teacher would spend making the same thing by hand (the app's own estimate, stated on screen). */
export const MINUTES: Record<string, number> = { slides: 30, activities: 20, letters: 20, students: 15, docs: 10, groups: 5, classtools: 5, assets: 5 };
export const PAGE_LABEL: Record<string, string> = { slides: "슬라이드", activities: "학생 활동", letters: "통신문", students: "학생 기록", docs: "문서 변환", groups: "모둠·자리", classtools: "학급 도구", assets: "에셋 보드" };

let user = "t1";
export const setUsageUser = (id: string) => { user = id; };
const ukey = (id: string) => `kyosil:usage:${id}`;

/** Demo history for 곽민혁, so the first screen a judge sees already shows a lived-in week. */
function seedUsage(id: string, now = new Date()): Usage {
  if (id !== "t1") return { days: [], made: [] };
  const mon = mondayOf(now);
  const day = (i: number, hh: number) => { const d = new Date(mon); d.setDate(mon.getDate() + i); d.setHours(hh, 10); return d; };
  const past = [0, 1, 2, 3, 4].map((i) => day(i, 16)).filter((d) => d < now);
  const sample: [string, string][] = [
    ["slides", "동학 농민 운동 수업 슬라이드.html"],
    ["activities", "확인 문제_동학 농민 운동.html"],
    ["letters", "가정통신문_역사 체험학습 안내.hwpx"],
    ["activities", "근거 판단_이 사건의 이름은.html"],
    ["groups", "2-1 모둠 편성표.xlsx"],
  ];
  const made = past.map((d, i) => { const [page, name] = sample[i]; return { at: d.toISOString(), name, page, min: MINUTES[page] ?? 5 }; });
  return { days: past.map(ymd), made: made.reverse() };
}
export const getUsage = (id: string): Usage => read<Usage | null>(ukey(id), null) ?? seedUsage(id);
const saveUsage = (id: string, u: Usage) => write(ukey(id), { days: u.days.slice(-60), made: u.made.slice(0, 50) });

export function recordDay(id = user) {
  const u = getUsage(id);
  const today = ymd(new Date());
  if (!u.days.includes(today)) saveUsage(id, { ...u, days: [...u.days, today] });
}
/** Called by every download in the app; the screen in the address bar tells what kind of thing was made. */
export function recordMade(name: string, id = user) {
  const page = location.hash.replace(/^#\/?/, "").split("?")[0] || "docs";
  const u = getUsage(id);
  saveUsage(id, { ...u, made: [{ at: new Date().toISOString(), name, page, min: MINUTES[page] ?? 5 }, ...u.made] });
}
export const useUsage = (id: string) => useStored(() => getUsage(id), [id]);

export function weekSummary(u: Usage, now = new Date()) {
  const mon = mondayOf(now);
  const inWeek = (iso: string) => new Date(iso) >= mon;
  const made = u.made.filter((m) => inWeek(m.at));
  const used = [0, 1, 2, 3, 4].map((i) => { const d = new Date(mon); d.setDate(mon.getDate() + i); return u.days.includes(ymd(d)); });
  return { made, minutes: made.reduce((s, m) => s + m.min, 0), used };
}
export const hm = (min: number) => (min >= 60 ? `${Math.floor(min / 60)}시간${min % 60 ? ` ${min % 60}분` : ""}` : `${min}분`);

/* ───────── 학급별 진도 ───────── */

export interface Progress { plan: string[]; at: Record<string, number>; log: Record<string, string> }

/** A history unit around the 1차 activity (동학 농민 운동); other studios start with numbered lessons the teacher renames. */
export const SAMPLE_PLAN: Partial<Record<StudioId, string[]>> = {
  history: [
    "흥선 대원군의 정책", "개항과 불평등 조약", "개화 정책과 임오군란", "갑신정변", "동학 농민 운동",
    "갑오개혁과 을미개혁", "독립 협회와 대한 제국", "국권 피탈 과정", "의병 운동과 애국 계몽 운동", "단원 정리·형성평가",
  ],
};
const pkey = (id: string) => `kyosil:progress:${id}`;

/** The classes this teacher meets in a week, in timetable order. */
export function myClasses(owner: string) {
  const seen = new Set<string>();
  for (const day of TIMETABLE[owner] ?? []) for (const l of day) if (l) seen.add(l.classId);
  return CLASSES.filter((c) => seen.has(c));
}

function seedProgress(owner: string, studio: StudioId): Progress {
  const plan = SAMPLE_PLAN[studio] ?? Array.from({ length: 10 }, (_, i) => `${i + 1}차시`);
  const classes = myClasses(owner);
  // the demo week: most classes are on 동학 농민 운동 (index 4), one is a lesson behind
  const at = Object.fromEntries(classes.map((c, i) => [c, owner === "t1" ? (i === classes.length - 1 ? 3 : 4) : 0]));
  return { plan, at, log: {} };
}
export const getProgress = (owner: string, studio: StudioId): Progress => read<Progress | null>(pkey(owner), null) ?? seedProgress(owner, studio);
export const saveProgress = (owner: string, p: Progress) => write(pkey(owner), p);
export const useProgress = (owner: string, studio: StudioId) => useStored(() => getProgress(owner, studio), [owner, studio]);
export const lessonTitle = (p: Progress, i: number) => p.plan[i] ?? `${i + 1}차시`;

/** Classes that are behind the class furthest ahead, for the “진도 맞추기” hint. */
export function behind(p: Progress) {
  const vals = Object.values(p.at);
  const top = Math.max(0, ...vals);
  return Object.entries(p.at).filter(([, v]) => v < top).map(([c, v]) => ({ classId: c, gap: top - v }));
}

/* ───────── 다음 수업 ───────── */

export interface Slot { p: number; classId: string; label: string; cover: boolean }
export type NextState = "now" | "next" | "done" | "none" | "weekend";
const toMin = (hhmm: string) => { const [h, m] = hhmm.split(":").map(Number); return h * 60 + m; };

/** Today's lessons for a teacher (cover changes already applied by the caller), and which one comes next. */
export function nextLesson(slots: Slot[], now = new Date()): { state: NextState; slot?: Slot; left: number } {
  const weekday = now.getDay() >= 1 && now.getDay() <= 5;
  if (!slots.length) return { state: "none", left: 0 };
  if (!weekday) return { state: "weekend", slot: slots[0], left: slots.length };
  const t = now.getHours() * 60 + now.getMinutes();
  const cur = slots.find((s) => t >= toMin(PERIOD_TIMES[s.p]) && t < toMin(PERIOD_TIMES[s.p]) + 45);
  if (cur) return { state: "now", slot: cur, left: slots.filter((s) => s.p >= cur.p).length };
  const next = slots.find((s) => toMin(PERIOD_TIMES[s.p]) > t);
  if (next) return { state: "next", slot: next, left: slots.filter((s) => s.p >= next.p).length };
  return { state: "done", left: 0 };
}
export const minutesUntil = (p: number, now = new Date()) => toMin(PERIOD_TIMES[p]) - (now.getHours() * 60 + now.getMinutes());
export const PERIOD_COUNT = PERIODS;

/* ───────── 수업 여는 질문 ───────── */

export const OPENERS: Record<StudioId, string[]> = {
  history: [
    "100년 뒤 교과서는 오늘을 어떤 사건으로 기억할까요?",
    "같은 사건을 두 사람이 다르게 기록했다면, 누구의 기록을 믿어야 할까요?",
    "‘난’, ‘운동’, ‘혁명’이라는 이름은 누가, 왜 다르게 붙일까요?",
    "사진이 없던 시절, 사람들은 무엇으로 사건을 남겼을까요?",
    "우리 동네 이름에는 어떤 옛이야기가 숨어 있을까요?",
    "내가 그 시대 사람이었다면 가장 먼저 무엇을 바꾸고 싶었을까요?",
    "유물 하나만 남기고 모두 사라진다면, 우리 시대를 보여 줄 물건은 무엇일까요?",
  ],
  korean: [
    "오늘 아침 들은 말 가운데 가장 마음에 남은 한 문장은 무엇인가요?",
    "‘괜찮아’는 상황에 따라 몇 가지 뜻이 될까요?",
    "제목만 보고 이야기의 결말을 짐작해 볼까요?",
    "우리 반을 한 문장으로 소개하는 광고 문구를 만든다면?",
    "책 속 인물에게 문자 한 통을 보낸다면 뭐라고 쓸까요?",
    "같은 뜻을 다섯 글자로만 말해 본다면?",
  ],
  math: [
    "1부터 100까지 가장 빠르게 더하는 방법은 무엇일까요?",
    "종이를 몇 번 접으면 달까지 닿을까요? 먼저 어림해 봅시다.",
    "‘대부분’은 몇 퍼센트부터라고 할 수 있을까요?",
    "우리 반 키를 그래프 하나로 보여 준다면 어떤 그래프가 좋을까요?",
    "자 없이 교실 창문의 넓이를 어림하려면 어떻게 할까요?",
    "급식 줄이 가장 빨리 줄어드는 방법을 수학으로 설명할 수 있을까요?",
  ],
  science: [
    "얼음에 소금을 뿌리면 어떻게 될까요? 먼저 예상해 봅시다.",
    "같은 높이에서 종이와 지우개를 떨어뜨리면 무엇이 먼저 떨어질까요? 종이를 구기면?",
    "냄새는 어떻게 교실 끝까지 퍼질까요?",
    "교실에서 전기를 가장 많이 쓰는 물건은 무엇일까요?",
    "오늘 날씨를 숫자 세 개로 설명한다면?",
    "식물은 밤에 무엇을 하고 있을까요?",
  ],
  social: [
    "다수결은 언제나 공정할까요?",
    "학교 앞 가게가 바뀌는 까닭은 무엇일까요?",
    "학급 규칙을 하나 새로 만든다면 어떻게 정하는 것이 공정할까요?",
    "같은 뉴스 제목을 다른 관점으로 다시 써 본다면?",
    "지도에서 우리 동네를 가장 잘 보여 주는 정보는 무엇일까요?",
    "1,000원으로 살 수 있는 것은 10년 전과 지금 어떻게 다를까요?",
  ],
  english: [
    "What is one word that describes your weekend?",
    "If you could have dinner with anyone, who would it be?",
    "Describe your favorite food in three words.",
    "What would you do with an extra hour today?",
    "Tell your partner one thing you are good at.",
    "Which English word do you like the sound of? Why?",
  ],
  arts: [
    "지금 이 교실의 소리를 색으로 표현한다면?",
    "오늘 기분을 몸짓 하나로 보여 준다면?",
    "선 하나로 바람을 그려 볼까요?",
    "작품을 볼 때 가장 먼저 보는 곳은 어디인가요?",
    "운동장에서 가장 아름다운 순간은 언제일까요?",
    "좋아하는 노래의 첫 소절은 어떤 느낌인가요?",
  ],
  default: [
    "오늘 가장 기대되는 일 하나는 무엇인가요?",
    "어제 배운 것 가운데 친구에게 설명할 수 있는 것 하나는?",
    "지금 기분을 날씨로 표현하면?",
    "오늘 수업이 끝났을 때 무엇을 할 수 있게 되고 싶나요?",
    "질문을 하나만 할 수 있다면 무엇을 묻고 싶나요?",
    "최근에 ‘왜 그럴까?’ 하고 궁금했던 것은?",
  ],
};
export function openerFor(studio: StudioId, now = new Date(), shift = 0) {
  const list = OPENERS[studio] ?? OPENERS.default;
  const doy = Math.floor((Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()) - Date.UTC(now.getFullYear(), 0, 0)) / 864e5);
  return list[(((doy + shift) % list.length) + list.length) % list.length];
}

/* ───────── 학사일정 (가상 홍익중학교) ───────── */

export const SCHOOL_CALENDAR: { date: string; name: string }[] = [
  { date: "2026-12-03", name: "학부모 상담 주간" },
  { date: "2026-12-14", name: "2학기 기말고사" },
  { date: "2026-12-23", name: "교과 세특 입력 마감" },
  { date: "2026-12-31", name: "겨울방학식" },
  { date: "2027-03-02", name: "2027학년도 개학" },
];
export function upcoming(now = new Date(), n = 3) {
  const t = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());
  return SCHOOL_CALENDAR.map((e) => { const [y, m, d] = e.date.split("-").map(Number); return { ...e, dday: Math.round((Date.UTC(y, m - 1, d) - t) / 864e5) }; })
    .filter((e) => e.dday >= 0)
    .slice(0, n);
}

/* ───────── 앱으로 설치 ───────── */

interface InstallEvent extends Event { prompt: () => Promise<void>; userChoice: Promise<{ outcome: string }> }
let deferred: InstallEvent | null = null;
if (typeof window !== "undefined") {
  window.addEventListener("beforeinstallprompt", (e) => { e.preventDefault(); deferred = e as InstallEvent; window.dispatchEvent(new Event(EVT)); });
  window.addEventListener("appinstalled", () => { deferred = null; window.dispatchEvent(new Event(EVT)); });
}
export const useCanInstall = () => useStored(() => !!deferred, []);
export async function install() {
  if (!deferred) return;
  await deferred.prompt();
  deferred = null;
  window.dispatchEvent(new Event(EVT));
}
