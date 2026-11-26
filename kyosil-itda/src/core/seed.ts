// First-run demo content. Each event is sealed with its author's own device keys,
// exactly as if those people had typed it on their own devices.

import { recommend, slotsFor, DEFAULT_WEIGHTS } from "./cover";
import { createRoom, enrol, seal, type AppEvent } from "./engine";
import { relay } from "./relay";
import { COVER_HISTORY, PEOPLE, TIMETABLE } from "./school";

export const ROOM = {
  staff: "room_staff",
  grade2: "room_grade2",
  workflow: "room_workflow",
  practicum: "room_practicum",
};

const MIN = 60_000;
const DAY = 24 * 60 * MIN;

export async function ensureSeed(): Promise<boolean> {
  const ids = PEOPLE.map((p) => p.id);
  await enrol(ids);
  if (relay.snapshot().rooms.length) return false;

  const teachers = PEOPLE.filter((p) => p.role !== "student-teacher").map((p) => p.id);
  const now = Date.now();
  const t0 = now - 3 * 60 * MIN;
  const at = (m: number) => t0 + m * MIN;

  await createRoom({ roomId: ROOM.staff, name: "교무실 · 전체", kind: "chat", members: ids, by: "t3" });
  await createRoom({ roomId: ROOM.grade2, name: "2학년 협의", kind: "chat", members: ["t1", "t2", "t4", "t5", "s1"], by: "t1" });
  await createRoom({ roomId: ROOM.workflow, name: "결강 처리 (교직원)", kind: "workflow", members: teachers, by: "t3" });
  await createRoom({
    roomId: ROOM.practicum,
    name: "교육실습 · 김하늘 × 오세린",
    kind: "practicum",
    members: ["t1", "s1"],
    by: "t1",
    expiresAt: now + 60 * DAY, // auto-delete 60 days after practicum
  });

  const events: [string, string, AppEvent, number][] = [
    [ROOM.staff, "t3", { type: "msg", text: "안녕하세요. 이번 주 금요일 체육대회 준비물 체크리스트를 방에 올려 둡니다. 맡을 수 있는 항목에 체크해 주세요." }, at(0)],
    [ROOM.staff, "t3", { type: "widget.create", widgetId: "w_sports", kind: "checklist", title: "체육대회 준비물" }, at(1)],
    [ROOM.staff, "t3", { type: "widget.item", widgetId: "w_sports", itemId: "i1", text: "학년별 조끼 120벌" }, at(1)],
    [ROOM.staff, "t3", { type: "widget.item", widgetId: "w_sports", itemId: "i2", text: "응급처치 키트 · 보건실 협조" }, at(1)],
    [ROOM.staff, "t3", { type: "widget.item", widgetId: "w_sports", itemId: "i3", text: "앰프·마이크 점검" }, at(1)],
    [ROOM.staff, "t3", { type: "widget.item", widgetId: "w_sports", itemId: "i4", text: "우천 시 강당 사용 신청" }, at(1)],
    [ROOM.staff, "t7", { type: "widget.check", widgetId: "w_sports", itemId: "i1", done: true }, at(8)],
    [ROOM.staff, "t7", { type: "msg", text: "조끼는 체육관 창고에 있어서 제가 챙기겠습니다." }, at(9)],
    [ROOM.staff, "s1", { type: "msg", text: "교생 오세린입니다. 앰프 점검을 도와드릴 수 있습니다!" }, at(15)],
    [ROOM.staff, "s1", { type: "widget.check", widgetId: "w_sports", itemId: "i3", done: true }, at(15)],
    [ROOM.grade2, "t1", { type: "msg", text: "다음 주 2학년 수업 공개 일정 정해요. 가능한 날짜에 투표 부탁드립니다." }, at(30)],
    [ROOM.grade2, "t1", { type: "widget.create", widgetId: "w_open", kind: "poll", title: "수업 공개 날짜", options: ["화요일 5교시", "수요일 3교시", "목요일 6교시"] }, at(31)],
    [ROOM.grade2, "t2", { type: "widget.vote", widgetId: "w_open", option: 1 }, at(40)],
    [ROOM.grade2, "t4", { type: "widget.vote", widgetId: "w_open", option: 1 }, at(41)],
    [ROOM.grade2, "s1", { type: "widget.vote", widgetId: "w_open", option: 0 }, at(44)],
  ];

  // A pending cover request created by the actual recommender (so the demo is live).
  const slot = slotsFor("t6", 2, TIMETABLE)[0];
  if (slot) {
    const list = recommend(slot, { people: PEOPLE, timetable: TIMETABLE, history: COVER_HISTORY }, DEFAULT_WEIGHTS);
    const best = list.find((c) => c.personId === "t1") ?? list[0]; // the demo tour expects 김하늘
    if (best)
      events.push([
        ROOM.workflow,
        "t6",
        {
          type: "cover.request",
          kind: "cover",
          reqId: "req_seed",
          absentId: "t6",
          day: slot.day,
          period: slot.period,
          classId: slot.lesson.classId,
          subject: slot.lesson.subject,
          candidateId: best.personId,
          score: best.score,
          factors: best.factors,
          card: {
            goal: "비유와 상징의 차이를 예시로 설명할 수 있다.",
            progress: "교과서 84쪽 ‘시의 표현’ 1차시까지 진행",
            activity: "활동지 2번(모둠별 비유 찾기) 20분 → 발표 2모둠",
            materials: "활동지는 교무실 제 책상 오른쪽 서랍, 모둠 번호는 칠판 왼쪽",
            notes: "모둠 4는 발표를 부담스러워해요. 지목 대신 자원 발표로 진행해 주세요.",
          },
        },
        at(60),
      ]);
  }

  // Practicum: one observed lesson with notes, both rubric scores and feedback.
  const sid = "sess_1";
  const prac: [string, AppEvent, number][] = [
    ["t1", { type: "prac.session", sessionId: sid, title: "2-1 국어 · 시의 비유 표현", date: new Date(now - DAY).toISOString().slice(0, 10), classId: "2-1", durationMin: 45, createdBy: "t1", plan: "도입(5) 생활 속 비유 → 전개(30) 시 낭독, 비유 찾기 모둠 활동 → 정리(10) 비유 만들기 출구 카드" }, at(-600)],
    ["s1", { type: "prac.focus", sessionId: sid, tags: ["question", "engagement"], question: "학생 답을 받은 뒤 이어서 묻는 발문이 자연스러운지, 뒤쪽 모둠까지 참여가 고르게 되는지 봐 주세요." }, at(-599.5)],
    ["t1", { type: "prac.note", noteId: "n1", sessionId: sid, t: 95, tag: "question", text: "‘마음이 호수다’ 예시로 시작. 학생 반응 좋음.", author: "t1" }, at(-599)],
    ["t1", { type: "prac.note", noteId: "n2", sessionId: sid, t: 410, tag: "question", text: "‘왜 그렇게 생각했니?’ 후속 발문 없이 다음 학생으로 넘어감. 대기 시간 2초.", author: "t1" }, at(-598)],
    ["t1", { type: "prac.note", noteId: "n3", sessionId: sid, t: 780, tag: "board", text: "판서 구조(원관념 → 보조관념) 명확. 뒤쪽 학생도 잘 보임.", author: "t1" }, at(-597)],
    ["t1", { type: "prac.note", noteId: "n4", sessionId: sid, t: 1320, tag: "engagement", text: "모둠 활동 중 순회가 앞쪽 모둠에 집중됨. 뒤 두 모둠 대화가 과제와 무관.", author: "t1" }, at(-596)],
    ["t1", { type: "prac.note", noteId: "n5", sessionId: sid, t: 2280, tag: "time", text: "정리 활동 시작이 7분 늦어 출구 카드 생략.", author: "t1" }, at(-595)],
    ["t1", { type: "prac.score", sessionId: sid, by: "mentor", scores: { design: 3, question: 2, material: 4, engagement: 2, time: 2 } }, at(-590)],
    ["s1", { type: "prac.score", sessionId: sid, by: "self", scores: { design: 3, question: 3, material: 3, engagement: 3, time: 2 } }, at(-500)],
    ["s1", { type: "prac.reflect", sessionId: sid, text: "모둠 활동이 생각보다 길어져서 정리를 못 했다. 학생들이 비유를 잘 찾았다고 느꼈는데, 뒤쪽 모둠은 확인하지 못했다." }, at(-499)],
    ["t1", { type: "prac.feedback", sessionId: sid, glow: "판서가 개념 구조를 그대로 보여 줘서 학생들이 원관념과 보조관념을 쉽게 구분했습니다.", grow: "학생 답에 ‘왜?’로 한 번 더 묻고 3초 이상 기다려 보세요. 순회 동선을 미리 정하면 뒤쪽 모둠도 챙길 수 있습니다.", next: "다음 수업에서 후속 발문 3회 이상, 정리 활동 10분 확보" }, at(-480)],
  ];

  const sealed = [];
  for (const [room, by, ev, t] of events) sealed.push(await seal(room, by, ev, t));
  for (const [by, ev, t] of prac) sealed.push(await seal(ROOM.practicum, by, ev, t));
  relay.appendMany(sealed);
  return true;
}
