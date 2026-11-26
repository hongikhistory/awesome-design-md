import { describe, expect, it } from "vitest";
import { activityHtml, activityMarkdown, parseEvidence, parseExit, parseQuiz, SAMPLE_EVIDENCE, SAMPLE_EXIT, SAMPLE_QUIZ } from "./activity";
import { makeGroups, makeSeating } from "./groups";

describe("activity text formats", () => {
  it("reads choice, OX and short-answer items", () => {
    const { items, errors } = parseQuiz(SAMPLE_QUIZ);
    expect(errors).toEqual([]);
    expect(items.map((i) => i.type)).toEqual(["choice", "ox", "short"]);
    expect(items[0]).toMatchObject({ answer: 1, options: ["직유", "은유", "의인", "과장"] });
    expect(items[1]).toMatchObject({ answer: true });
    expect(items[2]).toMatchObject({ answers: ["의인법", "의인"] });
  });
  it("reports missing answers and out-of-range choices", () => {
    expect(parseQuiz("1. 질문\n① 가 ② 나").errors[0]).toMatch(/정답/);
    expect(parseQuiz("1. 질문\n① 가 ② 나\n정답: ⑤").errors[0]).toMatch(/범위/);
  });
  it("reads evidence sources with their origin", () => {
    const e = parseEvidence(SAMPLE_EVIDENCE);
    expect(e.errors).toEqual([]);
    expect(e.claims).toHaveLength(3);
    expect(e.sources).toHaveLength(4);
    expect(e.sources[1]).toMatchObject({ title: "교무부 안내", from: "가상 자료, 교무부" });
  });
  it("reads exit prompts and self-checks", () => {
    const x = parseExit(SAMPLE_EXIT);
    expect(x.prompts).toHaveLength(2);
    expect(x.checks).toHaveLength(2);
  });
});

describe("student page", () => {
  it("keeps teacher text as data, never as markup", () => {
    const html = activityHtml({ kind: "quiz", title: "<img src=x onerror=alert(1)>", items: [{ type: "ox", q: "</script><script>alert(1)</script>", answer: true }] });
    expect(html).not.toContain("<img src=x");
    expect(html).not.toContain("</script><script>alert(1)");
    expect(html.match(/<script/g)).toHaveLength(2);
  });
  it("makes a printable worksheet", () => {
    const e = parseEvidence(SAMPLE_EVIDENCE);
    const md = activityMarkdown({ kind: "evidence", title: "쉬는 시간", question: e.question, claims: e.claims, sources: e.sources });
    expect(md).toContain("## 자료 4.");
    expect(md).toContain("□ 판단 보류");
  });
});

describe("groups and seating", () => {
  const kids = Array.from({ length: 25 }, (_, i) => ({ no: i + 1, name: `학생${i + 1}` }));
  it("balances group sizes and keeps apart pairs separated", () => {
    const g = makeGroups(kids, 4, [[1, 2], [3, 4], [5, 6]], 7);
    const sizes = g.groups.map((x) => x.members.length);
    expect(Math.max(...sizes) - Math.min(...sizes)).toBeLessThanOrEqual(1);
    expect(sizes.reduce((a, b) => a + b)).toBe(25);
    expect(g.broken).toEqual([]);
    expect(g.groups[0].roles[0]).toBe("이끔이");
  });
  it("is reproducible from the seed", () => {
    expect(makeGroups(kids, 4, [], 42)).toEqual(makeGroups(kids, 4, [], 42));
  });
  it("puts front-row students in the first row and separates desk partners", () => {
    const s = makeSeating(kids, 6, [10, 20], [[1, 2]], 3);
    expect(s.seats.slice(0, 6).map((m) => m?.no)).toEqual(expect.arrayContaining([10, 20]));
    expect(s.broken).toEqual([]);
    expect(s.seats.filter(Boolean)).toHaveLength(25);
  });
});
