// Markdown → a small block model shared by the DOCX/XLSX/PPTX writers and the preview.
import MarkdownIt from "markdown-it";

export interface Run {
  text: string;
  bold?: boolean;
  italic?: boolean;
}

export type Block =
  | { type: "heading"; level: number; runs: Run[] }
  | { type: "paragraph"; runs: Run[] }
  | { type: "list"; ordered: boolean; items: Run[][] }
  | { type: "table"; header: string[]; rows: string[][] }
  | { type: "quote"; runs: Run[] }
  | { type: "code"; text: string }
  | { type: "rule" };

// html:false — raw HTML in user documents is shown as text, never rendered.
const md = new MarkdownIt({ html: false, linkify: true, breaks: false });

type Token = ReturnType<typeof md.parse>[number];

function runsOf(inline: Token | undefined): Run[] {
  const runs: Run[] = [];
  let bold = false, italic = false;
  for (const t of inline?.children ?? []) {
    if (t.type === "strong_open") bold = true;
    else if (t.type === "strong_close") bold = false;
    else if (t.type === "em_open") italic = true;
    else if (t.type === "em_close") italic = false;
    else if (t.type === "text" || t.type === "code_inline") runs.push({ text: t.content, bold, italic });
    else if (t.type === "softbreak" || t.type === "hardbreak") runs.push({ text: "\n" });
  }
  // merge neighbours with the same style
  return runs.reduce<Run[]>((acc, r) => {
    const last = acc.at(-1);
    if (last && !!last.bold === !!r.bold && !!last.italic === !!r.italic) last.text += r.text;
    else acc.push({ ...r });
    return acc;
  }, []);
}

const plain = (runs: Run[]) => runs.map((r) => r.text).join("");

/** Kordoc emits merged-cell tables as HTML; read them as plain grids so every writer gets a table. */
function htmlTables(src: string): { header: string[]; rows: string[][] }[] {
  const out: { header: string[]; rows: string[][] }[] = [];
  for (const m of src.matchAll(/<table[\s\S]*?<\/table>/gi)) {
    const rows = [...m[0].matchAll(/<tr[\s\S]*?<\/tr>/gi)].map((tr) =>
      [...tr[0].matchAll(/<t[hd][^>]*>([\s\S]*?)<\/t[hd]>/gi)].map((c) => decode(c[1].replace(/<br\s*\/?>/gi, "\n").replace(/<[^>]+>/g, "")).trim()),
    );
    if (rows.length) out.push({ header: rows[0], rows: rows.slice(1) });
  }
  return out;
}
const decode = (s: string) => s.replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&amp;/g, "&");

export function parseBlocks(source: string): Block[] {
  // Swap kordoc's HTML tables for placeholders, parse, then put them back in order.
  const tables = htmlTables(source);
  let n = 0;
  const text = source.replace(/<table[\s\S]*?<\/table>/gi, () => `\n\nKYOSIL_TABLE_${n++}\n\n`);
  const tokens = md.parse(text, {});
  const blocks: Block[] = [];
  for (let i = 0; i < tokens.length; i++) {
    const t = tokens[i];
    if (t.type === "heading_open") {
      blocks.push({ type: "heading", level: Number(t.tag.slice(1)), runs: runsOf(tokens[i + 1]) });
      i += 2;
    } else if (t.type === "paragraph_open" && !t.hidden) {
      const runs = runsOf(tokens[i + 1]);
      const ph = /^KYOSIL_TABLE_(\d+)$/.exec(plain(runs).trim());
      if (ph && tables[Number(ph[1])]) blocks.push({ type: "table", ...tables[Number(ph[1])] });
      else blocks.push({ type: "paragraph", runs });
      i += 2;
    } else if (t.type === "bullet_list_open" || t.type === "ordered_list_open") {
      const ordered = t.type === "ordered_list_open";
      const items: Run[][] = [];
      let depth = 0;
      for (i++; i < tokens.length; i++) {
        const u = tokens[i];
        if (u.type === "bullet_list_open" || u.type === "ordered_list_open") depth++;
        else if ((u.type === "bullet_list_close" || u.type === "ordered_list_close") && depth-- === 0) break;
        else if (u.type === "inline") items.push(runsOf(u));
      }
      blocks.push({ type: "list", ordered, items });
    } else if (t.type === "table_open") {
      const header: string[] = [], rows: string[][] = [];
      let cur: string[] | null = null, inHead = false;
      for (i++; i < tokens.length && tokens[i].type !== "table_close"; i++) {
        const u = tokens[i];
        if (u.type === "thead_open") inHead = true;
        else if (u.type === "thead_close") inHead = false;
        else if (u.type === "tr_open") cur = [];
        else if (u.type === "tr_close" && cur) { if (inHead) header.push(...cur); else rows.push(cur); cur = null; }
        else if (u.type === "inline" && cur) cur.push(plain(runsOf(u)));
      }
      blocks.push({ type: "table", header, rows });
    } else if (t.type === "blockquote_open") {
      const runs: Run[] = [];
      for (i++; i < tokens.length && tokens[i].type !== "blockquote_close"; i++) if (tokens[i].type === "inline") runs.push(...runsOf(tokens[i]), { text: "\n" });
      blocks.push({ type: "quote", runs: runs.slice(0, -1) });
    } else if (t.type === "fence" || t.type === "code_block") {
      blocks.push({ type: "code", text: t.content.replace(/\n$/, "") });
    } else if (t.type === "hr") blocks.push({ type: "rule" });
  }
  return blocks;
}

/** Safe HTML preview (markdown-it escapes raw HTML because html:false). */
export function renderPreview(source: string): string {
  // Kordoc's merged-cell tables are HTML; render them through the same safe table path.
  const tables = htmlTables(source);
  let n = 0;
  const text = source.replace(/<table[\s\S]*?<\/table>/gi, () => `\n\nKYOSIL_TABLE_${n++}\n\n`);
  const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  return md.render(text).replace(/<p>KYOSIL_TABLE_(\d+)<\/p>/g, (_, k) => {
    const t = tables[Number(k)];
    if (!t) return "";
    const tr = (cells: string[], tag: string) => `<tr>${cells.map((c) => `<${tag}>${esc(c).replace(/\n/g, "<br>")}</${tag}>`).join("")}</tr>`;
    return `<table><thead>${tr(t.header, "th")}</thead><tbody>${t.rows.map((r) => tr(r, "td")).join("")}</tbody></table>`;
  });
}

export const blocksText = plain;
