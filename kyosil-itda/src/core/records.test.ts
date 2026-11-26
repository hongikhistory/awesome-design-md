import { describe, expect, it } from "vitest";
import { checkRecord, draftPrompt, LIMITS, neisBytes } from "./records";

describe("NEIS bytes", () => {
  it("counts Hangul 3, ASCII 1, newline 1", () => {
    expect(neisBytes("가")).toBe(3);
    expect(neisBytes("A1 ")).toBe(3);
    expect(neisBytes("가\n나")).toBe(7);
    expect(neisBytes("가\r\n나")).toBe(7);
  });
  it("matches the official 500자 = 1500바이트 conversion", () => {
    expect(neisBytes("가".repeat(500))).toBe(LIMITS[2026].subject.chars * 3);
  });
  it("2026 limits shrink 행특 and 진로", () => {
    expect([LIMITS[2025].behavior.chars, LIMITS[2026].behavior.chars]).toEqual([500, 300]);
    expect([LIMITS[2025].career.chars, LIMITS[2026].career.chars]).toEqual([700, 500]);
  });
});

describe("record checker", () => {
  const rules = (t: string, name?: string) => checkRecord(t, { studentName: name }).map((f) => f.rule);
  it("flags forbidden content", () => {
    expect(rules("TOEIC 900점을 받음.")).toContain("공인어학시험");
    expect(rules("수학 올림피아드에 참가함.")).toContain("교외대회");
    expect(rules("한빛중학교 축제에서 사회를 봄.")).toContain("학교명");
    expect(rules("서울대학교 캠프에 참여함.")).toContain("대학명");
    expect(rules("방학 중 어학연수를 다녀옴.")).toContain("해외 활동");
    expect(rules("아버지가 의사여서 생명과학에 관심을 가짐.")).toContain("부모의 사회·경제적 지위");
    expect(rules("수학 학원에서 배운 풀이를 소개함.")).toContain("사교육");
  });
  it("does not flag ordinary sentences", () => {
    expect(rules("모둠 토의에서 친구의 의견을 정리해 발표함. 비유의 효과를 예를 들어 설명함.")).toEqual([]);
    expect(rules("어머니와 함께 도서관을 찾아 독서 습관을 기름.")).toEqual([]); // parent, but no status
    expect(rules("참여 대상을 스스로 정해 설문을 설계함.")).toEqual([]);
  });
  it("checks style: 명사형 종결, numbering, student name", () => {
    expect(rules("발표를 잘했습니다.")).toContain("명사형 종결");
    expect(rules("1. 토의를 이끔.")).toContain("번호·기호");
    expect(rules("민수는 토의를 이끔.", "민수")).toContain("학생 이름");
  });
});

describe("AI draft prompt", () => {
  it("removes the student name and states the 2026 AI rule", () => {
    const p = draftPrompt({ item: "behavior", year: 2026, studentName: "김민수", observations: [{ date: "3/14", text: "김민수가 청소 당번을 대신함" }] });
    expect(p).not.toContain("김민수");
    expect(p).toContain("300자");
    expect(p).toContain("그대로 입력하는 것은");
  });
});
