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

describe("lesson plan reader", () => {
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
});
