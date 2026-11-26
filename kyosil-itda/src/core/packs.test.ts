import { describe, expect, it } from "vitest";
import { parseEvidence, parseExit, parseQuiz } from "./activity";
import { reply } from "./chatbot";
import { parseLessonPlan } from "./lesson";
import { makePack, PACKS, withTeacher } from "./packs";
import { STUDIOS } from "./studio";

describe("과목별 수업 꾸러미", () => {
  it("covers every studio once", () => {
    expect(new Set(PACKS.map((p) => p.studio))).toEqual(new Set(Object.keys(STUDIOS)));
  });
  for (const p of PACKS) {
    it(`${p.subject} ‘${p.topic}’ parses in every tool without errors`, () => {
      const plan = parseLessonPlan(withTeacher(p.plan, "곽민혁"));
      expect(plan.title).toBeTruthy();
      expect(plan.objectives.length).toBe(2);
      expect(plan.steps.length).toBeGreaterThanOrEqual(3);
      const q = parseQuiz(p.quiz);
      expect(q.errors).toEqual([]);
      expect(q.items.length).toBe(3);
      const e = parseEvidence(p.evidence);
      expect(e.errors).toEqual([]);
      expect(e.sources.length).toBeGreaterThanOrEqual(4);
      const x = parseExit(p.exit);
      expect(x.prompts.length).toBe(2);
      expect(x.checks.length).toBe(2);
    });
  }
  it("a custom topic gives a skeleton that still parses", () => {
    const p = makePack("역사", "임진왜란", "곽민혁");
    expect(parseLessonPlan(p.plan).title).toContain("임진왜란");
    expect(parseQuiz(p.quiz).errors).toEqual([]);
    expect(parseEvidence(p.evidence).errors).toEqual([]);
  });
});

describe("이음이", () => {
  const ctx = { name: "곽민혁", next: "다음 수업은 3교시", opener: "질문", roster: ["가", "나", "다"], pick: () => 1 };
  it("makes a subject pack on request", () => {
    const r = reply("수학 수업 만들어 줘", ctx);
    expect(r.pack?.subject).toBe("수학");
    expect(r.actions.some((a) => a.kind === "pack")).toBe(true);
  });
  it("picks a student with the given random source", () => {
    expect(reply("발표할 학생 한 명 뽑아 줘", ctx).text).toContain("나");
  });
  it("sets a timer in seconds", () => {
    const a = reply("5분 타이머", ctx).actions[0];
    expect(a).toMatchObject({ kind: "timer", seconds: 300 });
  });
  it("counts NEIS bytes", () => {
    expect(reply("바이트: 가나다 ab", ctx).text).toContain("12바이트");
  });
  it("routes by keyword and admits what it cannot do", () => {
    expect(reply("세특 쓰는 곳", ctx).actions[0]).toMatchObject({ kind: "go", page: "students" });
    expect(reply("오늘 점심 메뉴", ctx).mood).toBe("oops");
  });
});
