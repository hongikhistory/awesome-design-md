import { parse, markdownToHwpx } from "kordoc";
import { describe, expect, it } from "vitest";
import { letterMarkdown, plainHints, sampleLetter } from "./letters";

describe("letters", () => {
  it("renders header, body, schedule and reply slip", () => {
    const md = letterMarkdown(sampleLetter());
    expect(md).toContain("# 2학년 현장체험학습 안내");
    expect(md).toContain("| 장소 | 국립중앙박물관(서울 용산구) |");
    expect(md).toContain("**한빛중학교장**");
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
});
