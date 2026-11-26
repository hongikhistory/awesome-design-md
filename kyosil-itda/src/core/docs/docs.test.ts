import { parse, markdownToHwpx } from "kordoc";
import { describe, expect, it } from "vitest";
import { csvToMarkdown, formatOf } from "./engine";
import { parseBlocks, renderPreview } from "./markdown";
import { markdownToDocx, markdownToXlsx } from "./writers";

const SAMPLE = `# 2학년 국어 수업 지도안

단원: **3. 시의 표현**

- 비유의 뜻을 안다
- 비유의 효과를 설명한다

## 수업 흐름

| 단계 | 활동 | 시간 |
| --- | --- | --- |
| 도입 | 생활 속 비유 찾기 | 5 |
| 전개 | 모둠별 비유 찾기 | 30 |
`;

const md = async (bytes: Uint8Array) => {
  const r = await parse(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer);
  if (!r.success) throw Error(r.error);
  return r.markdown;
};

describe("markdown blocks", () => {
  it("reads headings, lists, tables and inline bold", () => {
    const b = parseBlocks(SAMPLE);
    expect(b.map((x) => x.type)).toEqual(["heading", "paragraph", "list", "heading", "table"]);
    const p = b[1];
    expect(p.type === "paragraph" && p.runs.some((r) => r.bold && r.text.includes("시의 표현"))).toBe(true);
  });
  it("reads kordoc's merged-cell HTML tables as tables", () => {
    const b = parseBlocks("<table><tr><th>구분</th><th>내용</th></tr><tr><td>일시</td><td>12월 5일</td></tr></table>");
    expect(b).toEqual([{ type: "table", header: ["구분", "내용"], rows: [["일시", "12월 5일"]] }]);
  });
  it("never renders raw HTML from documents", () => {
    expect(renderPreview("<script>alert(1)</script>\n\n<img src=x onerror=alert(1)>")).not.toMatch(/<script|<img/);
  });
});

describe("writers round-trip through kordoc", () => {
  it("DOCX keeps headings, list items and the table", async () => {
    const back = await md(await markdownToDocx(SAMPLE));
    expect(back).toContain("2학년 국어 수업 지도안");
    expect(back).toContain("비유의 효과를 설명한다");
    expect(back).toMatch(/\|\s*전개\s*\|\s*모둠별 비유 찾기\s*\|\s*30\s*\|/);
  });
  it("XLSX turns each table into a sheet named after its heading", async () => {
    const back = await md(await markdownToXlsx(SAMPLE));
    expect(back).toContain("수업 흐름");
    expect(back).toMatch(/\|\s*도입\s*\|\s*생활 속 비유 찾기\s*\|\s*5\s*\|/);
  });
  it("HWPX (kordoc writer) round-trips", async () => {
    const back = await md(new Uint8Array(await markdownToHwpx(SAMPLE)));
    expect(back).toContain("모둠별 비유 찾기");
  });
});

describe("helpers", () => {
  it("converts CSV with quotes and commas", () => {
    expect(csvToMarkdown('번호,이름,비고\n1,"학생A, 반장",\n')).toBe("| 번호 | 이름 | 비고 |\n| --- | --- | --- |\n| 1 | 학생A, 반장 |  |");
  });
  it("detects formats from file names", () => {
    expect(["a.HWP", "b.hwpx", "c.xlsx", "d.markdown", "e.png", "f.zip"].map(formatOf)).toEqual(["hwp", "hwpx", "xlsx", "md", "image", "unknown"]);
  });
});
