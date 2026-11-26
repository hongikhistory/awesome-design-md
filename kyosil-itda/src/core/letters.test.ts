import { parse, markdownToHwpx } from "kordoc";
import { describe, expect, it } from "vitest";
import { koreanAmount, letterMarkdown, notationHints, plainHints, sampleLetter, TEMPLATES } from "./letters";

describe("letters", () => {
  it("renders header, body, schedule and reply slip", () => {
    const md = letterMarkdown(sampleLetter());
    expect(md).toContain("# 2학년 현장체험학습 안내");
    expect(md).toContain("| 장소 | 국립중앙박물관(서울 용산구) |");
    expect(md).toContain("**홍익중학교장**");
    expect(md).toContain("회신서");
  });
  it("omits the reply slip when disabled", () => {
    const l = sampleLetter();
    l.reply.enabled = false;
    expect(letterMarkdown(l)).not.toContain("회신서");
  });
  it("survives the HWPX round trip", async () => {
    const r = await parse(await markdownToHwpx(letterMarkdown(sampleLetter())));
    expect(r.success && r.markdown).toContain("현장체험학습");
  });
  it("suggests plain words and flags long sentences", () => {
    const h = plainHints("안내문을 송부하오니 금일까지 필히 회신 바랍니다.");
    expect(h.map((x) => x.match)).toEqual(["송부", "금일", "필히"]);
    expect(plainHints("가".repeat(95) + ".")[0].suggestion).toBe("두 문장으로 나누기");
  });
  it("checks 공문서 date, time and money notation", () => {
    const h = notationHints("2026년 12월 9일 오후 3시 30분에 모여 2026.9.1 회비 25,000원을 냅니다. 오전 9시 출발.");
    expect(h.map((x) => x.suggestion)).toEqual(expect.arrayContaining(["2026. 12. 9.", "15:30", "2026. 9. 1.", "금25,000원(금이만오천원)", "09:00"]));
    expect(notationHints("2026. 12. 9.(수) 09:00~15:00 금25,000원(금이만오천원)")).toEqual([]);
    expect(notationHints("오후 3시 30분").map((x) => x.suggestion)).toEqual(["15:30"]);
    expect(koreanAmount(113560)).toBe("일십일만삼천오백육십");
  });
  it("privacy template carries the four 제15조 notice items and 14세 미만 note", () => {
    const l = TEMPLATES.find((t) => t.id === "privacy")!.make({ school: "홍익중학교", date: "2026-03-02", dept: "교무부", teacher: "김하늘", phone: "02-1" });
    const md = letterMarkdown(l);
    for (const k of ["수집·이용 목적", "수집 항목", "보유·이용 기간", "동의 거부 권리와 불이익", "[필수]", "[선택]", "제22조의2"]) expect(md).toContain(k);
  });
});
