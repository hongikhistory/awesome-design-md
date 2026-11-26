// Document engine facade. Everything runs in this browser tab: files are never uploaded.
import type * as KordocModule from "./kordoc-entry";

type Kordoc = typeof KordocModule;
let loading: Promise<Kordoc> | null = null;

/** kordoc (HWP·HWPX·DOCX·XLSX·PPTX·PDF parser, HWPX writer, form filler) — ~MBs, so loaded lazily. */
export function kordoc(): Promise<Kordoc> {
  loading ??= import("./kordoc-entry");
  return loading;
}

export type DocFormat = "hwp" | "hwpx" | "docx" | "xlsx" | "xls" | "pptx" | "pdf" | "csv" | "md" | "txt" | "image" | "unknown";

export const FORMAT_LABEL: Record<DocFormat, string> = {
  hwp: "한글(HWP)", hwpx: "한글(HWPX)", docx: "워드", xlsx: "엑셀", xls: "엑셀(구버전)", pptx: "파워포인트",
  pdf: "PDF", csv: "CSV", md: "Markdown", txt: "텍스트", image: "이미지", unknown: "알 수 없음",
};

export function formatOf(name: string): DocFormat {
  const ext = name.toLowerCase().split(".").pop() ?? "";
  if (["hwp", "hwpx", "docx", "xlsx", "xls", "pptx", "pdf", "csv", "md", "txt"].includes(ext)) return ext as DocFormat;
  if (ext === "markdown") return "md";
  if (["png", "jpg", "jpeg", "webp"].includes(ext)) return "image";
  return "unknown";
}

export interface Converted {
  markdown: string;
  format: DocFormat;
  ms: number;
  warnings: string[];
}

const MAX_BYTES = 50 * 1024 * 1024;

/** Any supported file → Markdown. Text formats are read directly; office/PDF formats go through kordoc. */
export async function toMarkdown(file: { name: string; arrayBuffer(): Promise<ArrayBuffer>; size: number }): Promise<Converted> {
  const t0 = performance.now();
  const format = formatOf(file.name);
  if (file.size > MAX_BYTES) throw Error("50MB보다 큰 파일은 변환하지 않습니다.");
  const buf = await file.arrayBuffer();
  if (format === "md" || format === "txt") {
    return { markdown: new TextDecoder().decode(buf), format, ms: performance.now() - t0, warnings: [] };
  }
  if (format === "csv") {
    return { markdown: csvToMarkdown(new TextDecoder().decode(buf)), format, ms: performance.now() - t0, warnings: [] };
  }
  if (format === "image") throw Error("이미지 글자 인식(OCR)은 브라우저 판에서 지원하지 않습니다. PDF나 한글 문서로 저장해 올려 주세요.");
  const k = await kordoc();
  const r = await k.parse(buf);
  if (!r.success) {
    const hint = format === "hwp" ? " 한글에서 HWPX로 저장한 뒤 다시 올리면 대부분 해결됩니다." : "";
    throw Error(`${r.error}.${hint}`);
  }
  const warnings = (r.warnings ?? []).map((w: { message?: string } | string) => (typeof w === "string" ? w : w.message ?? "")).filter(Boolean);
  return { markdown: r.markdown.trim(), format: format === "unknown" ? "unknown" : format, ms: performance.now() - t0, warnings };
}

export function csvToMarkdown(csv: string): string {
  const rows: string[][] = [];
  let row: string[] = [], cell = "", quoted = false;
  for (let i = 0; i < csv.length; i++) {
    const c = csv[i];
    if (quoted) {
      if (c === '"' && csv[i + 1] === '"') { cell += '"'; i++; }
      else if (c === '"') quoted = false;
      else cell += c;
    } else if (c === '"') quoted = true;
    else if (c === ",") { row.push(cell); cell = ""; }
    else if (c === "\n" || c === "\r") {
      if (c === "\r" && csv[i + 1] === "\n") i++;
      row.push(cell); rows.push(row); row = []; cell = "";
    } else cell += c;
  }
  if (cell || row.length) { row.push(cell); rows.push(row); }
  const body = rows.filter((r) => r.some((x) => x.trim()));
  if (!body.length) return "";
  const width = Math.max(...body.map((r) => r.length));
  const line = (r: string[]) => `| ${Array.from({ length: width }, (_, i) => (r[i] ?? "").replace(/\|/g, "\\|").trim()).join(" | ")} |`;
  return [line(body[0]), `| ${Array(width).fill("---").join(" | ")} |`, ...body.slice(1).map(line)].join("\n");
}

/** Wraps Markdown with a short header so an AI assistant knows what it is reading. */
export function aiReady(markdown: string, meta: { name: string; format: DocFormat }) {
  return `<!-- 출처: ${meta.name} (${FORMAT_LABEL[meta.format]}), 널리잇다에서 Markdown으로 변환 -->\n\n${markdown}\n`;
}

export function download(name: string, data: BlobPart, type = "application/octet-stream") {
  const url = URL.createObjectURL(new Blob([data], { type }));
  const a = Object.assign(document.createElement("a"), { href: url, download: name });
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}
