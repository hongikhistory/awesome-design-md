// Markdown → DOCX / XLSX written directly as OOXML with JSZip (no server, no Office needed).
import JSZip from "jszip";
import { parseBlocks, type Block, type Run } from "./markdown";

const x = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const FONT = "맑은 고딕";

// ---------------------------------------------------------------- DOCX
function docxRuns(runs: Run[], size?: number) {
  return runs
    .flatMap((r) =>
      r.text.split("\n").map((part, i) => {
        const pr = `<w:rPr><w:rFonts w:ascii="${FONT}" w:hAnsi="${FONT}" w:eastAsia="${FONT}"/>${r.bold ? "<w:b/>" : ""}${r.italic ? "<w:i/>" : ""}${size ? `<w:sz w:val="${size}"/>` : ""}</w:rPr>`;
        return `${i ? "<w:r><w:br/></w:r>" : ""}<w:r>${pr}<w:t xml:space="preserve">${x(part)}</w:t></w:r>`;
      }),
    )
    .join("");
}

const para = (inner: string, pPr = "") => `<w:p>${pPr ? `<w:pPr>${pPr}</w:pPr>` : ""}${inner}</w:p>`;

function docxTable(header: string[], rows: string[][]) {
  const width = Math.max(header.length, ...rows.map((r) => r.length), 1);
  const cell = (text: string, head: boolean) =>
    `<w:tc><w:tcPr><w:tcW w:w="${Math.floor(9000 / width)}" w:type="dxa"/>${head ? '<w:shd w:val="clear" w:color="auto" w:fill="F4F5F6"/>' : ""}</w:tcPr>${para(docxRuns([{ text, bold: head }]))}</w:tc>`;
  const tr = (cells: string[], head: boolean) => `<w:tr>${Array.from({ length: width }, (_, i) => cell(cells[i] ?? "", head)).join("")}</w:tr>`;
  const border = ["top", "left", "bottom", "right", "insideH", "insideV"].map((b) => `<w:${b} w:val="single" w:sz="4" w:space="0" w:color="8A949E"/>`).join("");
  return `<w:tbl><w:tblPr><w:tblW w:w="5000" w:type="pct"/><w:tblBorders>${border}</w:tblBorders></w:tblPr>${header.length ? tr(header, true) : ""}${rows.map((r) => tr(r, false)).join("")}</w:tbl>${para("")}`;
}

function docxBody(blocks: Block[]) {
  return blocks
    .map((b) => {
      switch (b.type) {
        case "heading":
          return para(docxRuns(b.runs), `<w:pStyle w:val="Heading${Math.min(b.level, 3)}"/>`);
        case "paragraph":
          return para(docxRuns(b.runs));
        case "list":
          return b.items.map((it) => para(docxRuns(it), `<w:numPr><w:ilvl w:val="0"/><w:numId w:val="${b.ordered ? 2 : 1}"/></w:numPr>`)).join("");
        case "table":
          return docxTable(b.header, b.rows);
        case "quote":
          return para(docxRuns(b.runs), '<w:ind w:left="567"/><w:pBdr><w:left w:val="single" w:sz="12" w:space="8" w:color="B1B8BE"/></w:pBdr>');
        case "code":
          return b.text.split("\n").map((l) => para(`<w:r><w:rPr><w:rFonts w:ascii="Consolas" w:hAnsi="Consolas"/></w:rPr><w:t xml:space="preserve">${x(l)}</w:t></w:r>`)).join("");
        case "rule":
          return para("", '<w:pBdr><w:bottom w:val="single" w:sz="6" w:space="1" w:color="CDD1D5"/></w:pBdr>');
      }
    })
    .join("");
}

const STYLES = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
<w:docDefaults><w:rPrDefault><w:rPr><w:rFonts w:ascii="${FONT}" w:hAnsi="${FONT}" w:eastAsia="${FONT}"/><w:sz w:val="22"/><w:lang w:val="ko-KR" w:eastAsia="ko-KR"/></w:rPr></w:rPrDefault><w:pPrDefault><w:pPr><w:spacing w:after="120" w:line="300" w:lineRule="auto"/></w:pPr></w:pPrDefault></w:docDefaults>
<w:style w:type="paragraph" w:default="1" w:styleId="Normal"><w:name w:val="Normal"/></w:style>
${[1, 2, 3].map((l) => `<w:style w:type="paragraph" w:styleId="Heading${l}"><w:name w:val="heading ${l}"/><w:basedOn w:val="Normal"/><w:next w:val="Normal"/><w:pPr><w:keepNext/><w:spacing w:before="${l === 1 ? 240 : 180}" w:after="120"/><w:outlineLvl w:val="${l - 1}"/></w:pPr><w:rPr><w:b/><w:sz w:val="${[36, 28, 24][l - 1]}"/></w:rPr></w:style>`).join("\n")}
</w:styles>`;

const NUMBERING = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:numbering xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
<w:abstractNum w:abstractNumId="0"><w:lvl w:ilvl="0"><w:start w:val="1"/><w:numFmt w:val="bullet"/><w:lvlText w:val="•"/><w:lvlJc w:val="left"/><w:pPr><w:ind w:left="567" w:hanging="283"/></w:pPr></w:lvl></w:abstractNum>
<w:abstractNum w:abstractNumId="1"><w:lvl w:ilvl="0"><w:start w:val="1"/><w:numFmt w:val="decimal"/><w:lvlText w:val="%1."/><w:lvlJc w:val="left"/><w:pPr><w:ind w:left="567" w:hanging="340"/></w:pPr></w:lvl></w:abstractNum>
<w:num w:numId="1"><w:abstractNumId w:val="0"/></w:num><w:num w:numId="2"><w:abstractNumId w:val="1"/></w:num>
</w:numbering>`;

export async function markdownToDocx(markdown: string, opts: { title?: string } = {}): Promise<Uint8Array> {
  const zip = new JSZip();
  zip.file("[Content_Types].xml", `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/><Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/><Override PartName="/word/numbering.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.numbering+xml"/><Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/></Types>`);
  zip.file("_rels/.rels", `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/></Relationships>`);
  zip.file("docProps/core.xml", `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/"><dc:title>${x(opts.title ?? "")}</dc:title><dc:creator>교실잇다</dc:creator></cp:coreProperties>`);
  zip.file("word/_rels/document.xml.rels", `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/numbering" Target="numbering.xml"/></Relationships>`);
  zip.file("word/styles.xml", STYLES);
  zip.file("word/numbering.xml", NUMBERING);
  zip.file("word/document.xml", `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body>${docxBody(parseBlocks(markdown))}<w:sectPr><w:pgSz w:w="11906" w:h="16838"/><w:pgMar w:top="1418" w:right="1134" w:bottom="1418" w:left="1134" w:header="851" w:footer="851" w:gutter="0"/></w:sectPr></w:body></w:document>`);
  return zip.generateAsync({ type: "uint8array", compression: "DEFLATE" });
}

// ---------------------------------------------------------------- XLSX
const colName = (i: number): string => (i < 26 ? String.fromCharCode(65 + i) : colName(Math.floor(i / 26) - 1) + String.fromCharCode(65 + (i % 26)));
const width = (s: string) => [...s].reduce((w, ch) => w + (/[ᄀ-ᇿ㄰-㆏가-힣一-鿿]/.test(ch) ? 2 : 1), 0);
const sheetName = (s: string, used: Set<string>) => {
  let base = s.replace(/[\\/?*[\]:]/g, " ").trim().slice(0, 28) || "표";
  let name = base, k = 2;
  while (used.has(name)) name = `${base.slice(0, 25)} ${k++}`;
  used.add(name);
  return name;
};

/** Every Markdown table becomes a sheet named after the nearest heading; other text goes to a "본문" sheet. */
export async function markdownToXlsx(markdown: string): Promise<Uint8Array> {
  const blocks = parseBlocks(markdown);
  const sheets: { name: string; rows: string[][]; header: boolean }[] = [];
  const used = new Set<string>();
  let lastHeading = "";
  const text: string[][] = [];
  for (const b of blocks) {
    if (b.type === "heading") { lastHeading = b.runs.map((r) => r.text).join(""); text.push([lastHeading]); }
    else if (b.type === "table") sheets.push({ name: sheetName(lastHeading || `표 ${sheets.length + 1}`, used), rows: [b.header, ...b.rows], header: b.header.length > 0 });
    else if (b.type === "paragraph" || b.type === "quote") text.push([b.runs.map((r) => r.text).join("")]);
    else if (b.type === "list") b.items.forEach((it, i) => text.push([`${b.ordered ? `${i + 1}.` : "•"} ${it.map((r) => r.text).join("")}`]));
  }
  if (!sheets.length || text.length) sheets.push({ name: sheetName("본문", used), rows: text.length ? text : [[""]], header: false });

  const cell = (v: string, ref: string, head: boolean) => {
    const num = /^-?\d+(\.\d+)?$/.test(v.trim()) && v.trim().length < 15;
    const s = head ? ' s="1"' : "";
    return num ? `<c r="${ref}"${s}><v>${v.trim()}</v></c>` : `<c r="${ref}" t="inlineStr"${s}><is><t xml:space="preserve">${x(v)}</t></is></c>`;
  };
  const zip = new JSZip();
  zip.file("[Content_Types].xml", `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>${sheets.map((_, i) => `<Override PartName="/xl/worksheets/sheet${i + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`).join("")}</Types>`);
  zip.file("_rels/.rels", `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>`);
  zip.file("xl/workbook.xml", `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets>${sheets.map((s, i) => `<sheet name="${x(s.name)}" sheetId="${i + 1}" r:id="rId${i + 1}"/>`).join("")}</sheets></workbook>`);
  zip.file("xl/_rels/workbook.xml.rels", `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${sheets.map((_, i) => `<Relationship Id="rId${i + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${i + 1}.xml"/>`).join("")}<Relationship Id="rId${sheets.length + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>`);
  zip.file("xl/styles.xml", `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><fonts count="2"><font><sz val="11"/><name val="${FONT}"/></font><font><b/><sz val="11"/><name val="${FONT}"/></font></fonts><fills count="3"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill><fill><patternFill patternType="solid"><fgColor rgb="FFF4F5F6"/></patternFill></fill></fills><borders count="2"><border/><border><left style="thin"><color rgb="FFCDD1D5"/></left><right style="thin"><color rgb="FFCDD1D5"/></right><top style="thin"><color rgb="FFCDD1D5"/></top><bottom style="thin"><color rgb="FFCDD1D5"/></bottom></border></borders><cellStyleXfs count="1"><xf/></cellStyleXfs><cellXfs count="2"><xf fontId="0" fillId="0" borderId="0" xfId="0"/><xf fontId="1" fillId="2" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1"/></cellXfs><cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles></styleSheet>`);
  sheets.forEach((s, i) => {
    const cols = Math.max(...s.rows.map((r) => r.length), 1);
    const widths = Array.from({ length: cols }, (_, c) => Math.min(60, Math.max(6, ...s.rows.map((r) => width(r[c] ?? "") + 2))));
    zip.file(`xl/worksheets/sheet${i + 1}.xml`, `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">${s.header ? '<sheetViews><sheetView workbookViewId="0"><pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews>' : ""}<cols>${widths.map((w, c) => `<col min="${c + 1}" max="${c + 1}" width="${w}" customWidth="1"/>`).join("")}</cols><sheetData>${s.rows.map((r, ri) => `<row r="${ri + 1}">${r.map((v, ci) => cell(v, `${colName(ci)}${ri + 1}`, s.header && ri === 0)).join("")}</row>`).join("")}</sheetData></worksheet>`);
  });
  return zip.generateAsync({ type: "uint8array", compression: "DEFLATE" });
}
