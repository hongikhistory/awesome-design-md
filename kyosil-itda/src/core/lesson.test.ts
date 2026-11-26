import { describe, expect, it } from "vitest";
import { buildSlides, parseLessonPlan } from "./lesson";

const TABLE_PLAN = `# 2학년 국어 교수·학습 지도안

| 단원 | 3. 시의 표현 |
| --- | --- |
| 대상 | 2학년 1반 |
| 학습 목표 | 비유의 뜻을 안다 |

| 단계 | 교수·학습 활동 | 시간 |
| --- | --- | --- |
| 도입 | 생활 속 비유 찾기 | 5분 |
| 전개 | 시 낭독하기 | 15분 |
|  | 모둠별 비유 찾기 활동 | 15분 |
| 정리 | 비유 만들기 출구 카드 | 10분 |

평가: 비유를 넣어 한 문장 쓰기
준비물: 활동지, 모둠 보드
`;

const FLOW_PLAN = `# 일차함수의 그래프
단원: 4. 일차함수
학습 목표: 기울기의 뜻을 설명할 수 있다
도입(5) 계단 사진 보기 → 전개(30) 기울기 구하기 모둠 활동 → 정리(10) 출구 카드
발문: 계단이 가파르다는 것은 무엇으로 알 수 있을까?
`;

const SCHOOL_PLAN = `| 단계 | 학습 요소 | 교사 활동 | 학생 활동 | 시간 | 자료 및 유의점 |
| --- | --- | --- | --- | --- | --- |
| 도입 | 동기 유발 | 계단 사진을 보여 주고 질문한다 | 사진을 보고 가파른 정도를 말한다 | 5' | PPT |
| 전개 | 기울기 | 기울기의 뜻을 설명한다 | 모둠별로 기울기를 구한다 | 20' | 활동지, 모눈종이 |
|  |  | 순회하며 피드백한다 | 구한 값을 발표한다 | 10' | ※ 부진 학생을 먼저 살핀다 |
| 정리 | 정리 | 핵심을 정리한다 | 출구 카드를 쓴다 | 10' | 출구 카드 |
`;

describe("lesson plan reader", () => {
  it("puts student activities on slides and teacher text in notes", () => {
    const p = parseLessonPlan(SCHOOL_PLAN);
    expect(p.steps.map((s) => s.phase)).toEqual(["도입", "전개", "정리"]);
    expect(p.steps[1].activities).toEqual(["모둠별로 기울기를 구한다", "구한 값을 발표한다"]);
    expect(p.steps[1].minutes).toBe(30);
    expect(p.steps[1].notes).toContain("기울기의 뜻을 설명한다");
    expect(p.steps[1].notes).toContain("부진 학생을 먼저 살핀다");
    expect(p.materials).toEqual(expect.arrayContaining(["PPT", "활동지", "모눈종이", "출구 카드"]));
    const text = buildSlides(p).flatMap((s) => [s.title, ...s.bullets]).join(" ");
    expect(text).not.toMatch(/설명한다|부진 학생|순회/);
  });

  it("reads table-style 지도안 including merged 단계 rows", () => {
    const p = parseLessonPlan(TABLE_PLAN);
    expect(p.title).toBe("2학년 국어");
    expect(p.unit).toBe("3. 시의 표현");
    expect(p.target).toBe("2학년 1반");
    expect(p.objectives).toEqual(["비유의 뜻을 안다"]);
    expect(p.steps.map((s) => s.phase)).toEqual(["도입", "전개", "정리"]);
    expect(p.steps[1].activities).toEqual(["시 낭독하기", "모둠별 비유 찾기 활동"]);
    expect(p.steps[0].minutes).toBe(5);
    expect(p.assessment).toEqual(["비유를 넣어 한 문장 쓰기"]);
    expect(p.materials).toEqual(["활동지", "모둠 보드"]);
  });
  it("reads arrow-style flow and 발문 lines", () => {
    const p = parseLessonPlan(FLOW_PLAN);
    expect(p.steps.map((s) => [s.phase, s.minutes])).toEqual([["도입", 5], ["전개", 30], ["정리", 10]]);
    expect(p.questions[0]).toContain("계단이 가파르다");
  });
});

describe("slides", () => {
  it("builds cover, goals, flow, activities, group roles, check and closing", () => {
    const kinds = buildSlides(parseLessonPlan(TABLE_PLAN)).map((s) => s.kind);
    expect(kinds).toEqual(["cover", "objectives", "flow", "activity", "activity", "groups", "check", "closing"]);
  });
  it("keeps every text box inside the slide (decorations may bleed)", async () => {
    const { layoutSlide, THEMES, SLIDE_W, SLIDE_H } = await import("./lesson");
    const plan = parseLessonPlan(TABLE_PLAN);
    for (const t of THEMES) for (const s of buildSlides(plan)) for (const sh of layoutSlide(s, t, plan.steps.map((x) => x.phase)).filter((x) => x.t === "text")) {
      expect(sh.x).toBeGreaterThanOrEqual(0); expect(sh.y).toBeGreaterThanOrEqual(0);
      expect(sh.x + sh.w).toBeLessThanOrEqual(SLIDE_W + 0.001); expect(sh.y + sh.h).toBeLessThanOrEqual(SLIDE_H + 0.001);
    }
  });
  it("reads 성취기준 codes and the ▣ 자료 / ※ 유의점 symbols", () => {
    const p = parseLessonPlan(`# 비유 표현\n학습 목표: [9국05-02] 비유의 효과를 설명할 수 있다\n## 전개 (30분)\n- 모둠별로 비유 찾기\n▣ 활동지, 모둠 보드\n※ 소외되는 학생이 없게 역할을 나눈다`);
    expect(p.standards).toEqual(["[9국05-02]"]);
    expect(p.objectives).toEqual(["비유의 효과를 설명할 수 있다"]);
    expect(p.materials).toEqual(["활동지", "모둠 보드"]);
    expect(p.steps[0].notes).toEqual(["소외되는 학생이 없게 역할을 나눈다"]);
    const s = buildSlides(p);
    expect(s.find((x) => x.kind === "objectives")?.kicker).toBe("[9국05-02]");
    expect(s.flatMap((x) => [x.title, ...x.bullets]).join(" ")).not.toContain("소외");
  });
});
