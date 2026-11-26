// 수업 지도안(Markdown) → lesson outline → slide specs → PPTX.
import { blocksText, parseBlocks, type Block } from "./docs/markdown";

export interface Step {
  phase: string; // 도입 / 전개 / 정리 / 활동명
  minutes?: number;
  activities: string[];
}

export interface LessonPlan {
  title: string;
  unit: string;
  target: string; // 학년·학급
  teacher: string;
  objectives: string[];
  steps: Step[];
  questions: string[]; // 핵심 발문
  assessment: string[];
  materials: string[];
}

export const emptyPlan = (): LessonPlan => ({ title: "", unit: "", target: "", teacher: "", objectives: [], steps: [], questions: [], assessment: [], materials: [] });

const PHASES = /^(도입|전개|정리|활동\s?\d*|마무리|탐구|확인|평가)/;
const minutesOf = (s: string) => {
  const m = /(\d{1,3})\s*(?:분|')/.exec(s) ?? /^\s*(\d{1,3})\s*$/.exec(s);
  return m ? Number(m[1]) : undefined;
};
const splitItems = (s: string) => s.split(/\n|(?:\s*[•·▪◦○●]\s*)|(?:^|\s)-\s/).map((x) => x.replace(/^[-*\d.)\s]+/, "").trim()).filter((x) => x.length > 1);
const after = (s: string) => s.replace(/^[^:：]*[:：]\s*/, "").trim();

/** Heuristic reader for common Korean 수업 지도안 layouts (표·제목·목록). Everything stays editable. */
export function parseLessonPlan(markdown: string): LessonPlan {
  const plan = emptyPlan();
  const blocks = parseBlocks(markdown);
  let section = "";
  const push = (list: string[], items: string[]) => items.forEach((i) => !list.includes(i) && list.push(i));

  const onLine = (raw: string) => {
    const line = raw.trim();
    if (!line) return;
    if (/^(?:단원|대단원|소단원)\s*[:：]/.test(line)) plan.unit ||= after(line);
    else if (/^(?:대상|학년|학급|대상 학급)\s*[:：]/.test(line)) plan.target ||= after(line);
    else if (/^(?:지도\s?교사|수업자|교사)\s*[:：]/.test(line)) plan.teacher ||= after(line);
    else if (/^(?:학습\s?목표|성취\s?기준|목표)\s*[:：]/.test(line)) push(plan.objectives, splitItems(after(line)));
    else if (/^(?:준비물|수업\s?자료|자료)\s*[:：]/.test(line)) push(plan.materials, splitItems(after(line)).flatMap((x) => x.split(/,\s*/)));
    else if (/^(?:평가|형성\s?평가|평가\s?계획)\s*[:：]/.test(line)) push(plan.assessment, splitItems(after(line)));
    else if (/^(?:핵심\s?)?발문\s*[:：]/.test(line)) push(plan.questions, splitItems(after(line)));
    else if (/[→>]/.test(line) && /(도입|전개|정리)\s*\(?\d/.test(line)) {
      // "도입(5) 생활 속 비유 → 전개(30) 모둠 활동 → 정리(10) 출구 카드"
      for (const part of line.split(/→|->|>/)) {
        const m = /(도입|전개|정리|활동\s?\d*)\s*\(?(\d+)?\)?\s*(.*)/.exec(part.trim());
        if (m) plan.steps.push({ phase: m[1], minutes: m[2] ? Number(m[2]) : undefined, activities: splitItems(m[3]) });
      }
    } else if (section === "objectives") push(plan.objectives, splitItems(line));
    else if (section === "assessment") push(plan.assessment, splitItems(line));
    else if (section === "materials") push(plan.materials, splitItems(line).flatMap((x) => x.split(/,\s*/)));
    else if (section === "questions") push(plan.questions, splitItems(line));
    else if (section.startsWith("phase:")) {
      const step = plan.steps.at(-1);
      if (step) step.activities.push(...splitItems(line));
    } else if (/\?$/.test(line)) push(plan.questions, [line]);
  };

  const sectionOf = (title: string) => {
    if (/목표|성취기준/.test(title)) return "objectives";
    if (/평가/.test(title)) return "assessment";
    if (/준비물|자료/.test(title)) return "materials";
    if (/발문/.test(title)) return "questions";
    const p = PHASES.exec(title);
    if (p) {
      plan.steps.push({ phase: p[1], minutes: minutesOf(title), activities: [] });
      return `phase:${p[1]}`;
    }
    return "";
  };

  for (const b of blocks as Block[]) {
    if (b.type === "heading") {
      const t = blocksText(b.runs).trim();
      if (!plan.title) plan.title = t;
      section = sectionOf(t);
    } else if (b.type === "paragraph" || b.type === "quote") blocksText(b.runs).split("\n").forEach(onLine);
    else if (b.type === "list") b.items.forEach((it) => onLine(section ? blocksText(it) : `${blocksText(it)}`));
    else if (b.type === "table") readTable(b.header, b.rows, plan, onLine);
  }
  plan.title = plan.title.replace(/\s*(?:교수[·ㆍ]?학습\s?)?지도안\s*$/, "").trim() || plan.unit || "수업";
  plan.steps = plan.steps.filter((s) => s.activities.length || s.minutes);
  return plan;
}

function readTable(header: string[], rows: string[][], plan: LessonPlan, onLine: (l: string) => void) {
  const h = header.map((x) => x.replace(/\s/g, ""));
  const iPhase = h.findIndex((x) => /단계|과정|구분/.test(x));
  const iAct = h.findIndex((x) => /활동|교수|학습|내용/.test(x));
  const iTime = h.findIndex((x) => /시간|분/.test(x));
  if (iPhase >= 0 && iAct >= 0) {
    for (const r of rows) {
      const phase = (r[iPhase] ?? "").trim();
      const acts = splitItems(r.filter((_, i) => i !== iPhase && i !== iTime).join("\n"));
      const minutes = iTime >= 0 ? minutesOf(r[iTime] ?? "") : minutesOf(phase);
      const last = plan.steps.at(-1);
      if (!phase && last) last.activities.push(...acts); // continuation row of a merged 단계 cell
      else plan.steps.push({ phase: phase.replace(/\(.*\)/, "").trim() || "활동", minutes, activities: acts });
    }
    return;
  }
  // key-value tables (단원 | …, 학습 목표 | …)
  for (const r of [header, ...rows]) if (r.length >= 2) onLine(`${r[0]}: ${r.slice(1).join(" ")}`);
}

// ------------------------------------------------------------------ slides

export type SlideKind = "cover" | "objectives" | "flow" | "question" | "activity" | "groups" | "check" | "closing";

export interface SlideSpec {
  kind: SlideKind;
  title: string;
  kicker?: string;
  bullets: string[];
  minutes?: number;
  notes?: string;
  /** index into the lesson's phases for the progress bar (-1 = none) */
  phase?: number;
  footer?: string;
}

export function buildSlides(p: LessonPlan, o: { groupRoles?: boolean } = {}): SlideSpec[] {
  const slides: SlideSpec[] = [];
  const phaseIdx = (s: Step) => p.steps.indexOf(s);
  const materials = p.materials.length ? `준비물: ${p.materials.join(", ")}` : undefined;
  slides.push({ kind: "cover", title: p.title, kicker: p.unit, bullets: [p.target, p.teacher].filter(Boolean) });
  if (p.objectives.length) slides.push({ kind: "objectives", title: "학습 목표", bullets: p.objectives, footer: materials });
  if (p.steps.length) slides.push({ kind: "flow", title: "오늘의 수업 흐름", bullets: p.steps.map((s) => `${s.phase}|${s.minutes ?? ""}|${s.activities[0] ?? ""}`) });
  if (p.questions.length) slides.push({ kind: "question", kicker: "생각 열기", title: p.questions[0], bullets: p.questions.slice(1, 3), phase: 0 });
  for (const s of p.steps) {
    if (/정리|마무리/.test(s.phase)) continue;
    slides.push({ kind: "activity", kicker: s.phase, title: s.activities[0] ?? s.phase, bullets: s.activities.slice(1, 5), minutes: s.minutes, notes: s.activities.join("\n"), phase: phaseIdx(s), footer: materials });
    if (o.groupRoles !== false && s.activities.some((a) => /모둠|조별|짝/.test(a)))
      slides.push({ kind: "groups", kicker: s.phase, title: "모둠 역할", bullets: ["이끔이|순서를 정하고 모두가 말하게 해요", "기록이|나온 생각을 적어요", "발표이|모둠의 생각을 전해요", "지킴이|시간과 약속을 챙겨요"], phase: phaseIdx(s) });
  }
  const close = p.steps.find((s) => /정리|마무리/.test(s.phase));
  slides.push({ kind: "check", kicker: close?.phase ?? "확인", title: "확인 문제", bullets: p.assessment.length ? p.assessment : ["오늘 배운 내용을 한 문장으로 써 봅시다."], phase: close ? phaseIdx(close) : -1 });
  const closing = close?.activities.length ? close.activities.slice(0, 3) : ["오늘 배운 것 한 가지"];
  if (closing.length === 1) closing.push("더 알고 싶은 것 한 가지");
  slides.push({ kind: "closing", kicker: close?.phase ?? "정리", title: "오늘 배운 것", bullets: closing, minutes: close?.minutes, phase: close ? phaseIdx(close) : -1 });
  return slides;
}

// ------------------------------------------------------------------ themes
// Five original themes following current Korean classroom-template trends (bold display type,
// rounded cards, pill labels, soft decorative shapes). Display type is Paperlogy (OFL).

export interface SlideTheme {
  id: string;
  name: string;
  desc: string;
  bg: string;
  fg: string;
  muted: string;
  accent: string;
  accent2: string;
  onAccent: string;
  card: string;
  line: string;
  highlight?: string; // highlighter bar behind titles
  shadow: boolean;
  decor: "dots" | "circles" | "chalk" | "grid" | "none";
}

export const THEMES: SlideTheme[] = [
  { id: "pastel", name: "파스텔 노트", desc: "크림색 바탕과 둥근 흰 카드, 코랄·민트 포인트", bg: "F7F3EC", fg: "22223B", muted: "6B6880", accent: "E85A38", accent2: "2A9D86", onAccent: "22223B", card: "FFFFFF", line: "E6DFD3", shadow: true, decor: "dots" },
  { id: "marker", name: "형광펜", desc: "흰 종이에 굵은 검정 글씨와 노란 형광펜", bg: "FFFFFF", fg: "111111", muted: "5C5C5C", accent: "111111", accent2: "D6246E", onAccent: "FFFFFF", card: "F5F5F2", line: "E3E3DE", highlight: "FFE45C", shadow: false, decor: "grid" },
  { id: "chalk", name: "칠판", desc: "짙은 초록 칠판과 분필 노랑, 판서 느낌", bg: "223D36", fg: "F3F0E6", muted: "A9BDB5", accent: "F7D154", accent2: "8FD3C1", onAccent: "223D36", card: "2C4C44", line: "3B5D55", shadow: false, decor: "chalk" },
  { id: "blue", name: "블루 미니멀", desc: "흰 바탕과 파란 숫자, 어느 교과에나 깔끔하게", bg: "FFFFFF", fg: "1A1F36", muted: "5B6478", accent: "256EF4", accent2: "0B50D0", onAccent: "FFFFFF", card: "F1F5FE", line: "DCE3F1", shadow: false, decor: "none" },
  { id: "lavender", name: "라벤더", desc: "연보라 바탕과 큰 원 장식, 부드러운 분위기", bg: "EFEBFF", fg: "2A2350", muted: "5F5888", accent: "6C5CE7", accent2: "C93D73", onAccent: "FFFFFF", card: "FFFFFF", line: "DAD3FA", shadow: true, decor: "circles" },
];

export const FONT_HEAD = "Paperlogy 8 ExtraBold";
export const FONT_SEMI = "Paperlogy 6 SemiBold";
export const FONT_BODY = "Paperlogy 4 Regular";

// ------------------------------------------------------------------ layout (shared by preview, HTML and PPTX)

export const SLIDE_W = 13.333;
export const SLIDE_H = 7.5;

export type Weight = 400 | 600 | 800;

export interface TextRun {
  text: string;
  size: number;
  weight?: Weight;
  color?: string;
  breakAfter?: boolean;
}

export type Shape =
  | { t: "rect"; x: number; y: number; w: number; h: number; fill?: string; line?: string; lineW?: number; radius?: number; shadow?: boolean; alpha?: number }
  | { t: "ellipse"; x: number; y: number; w: number; h: number; fill: string; alpha?: number; line?: string; lineW?: number }
  | { t: "line"; x: number; y: number; w: number; h: number; color: string; width: number; dash?: boolean }
  | { t: "text"; x: number; y: number; w: number; h: number; runs: TextRun[]; align?: "left" | "center" | "right"; valign?: "top" | "middle" | "bottom"; lineHeight?: number };

const pad2 = (n: number) => String(n).padStart(2, "0");

/** Absolute layout in inches on a 13.333 × 7.5 slide. Body text is 26pt+ so the back row can read it. */
export function layoutSlide(s: SlideSpec, th: SlideTheme, phases: string[], page = 1, total = 1): Shape[] {
  const out: Shape[] = [];
  const W = SLIDE_W, H = SLIDE_H, L = 0.8, R = W - 0.8;
  const T = (x: number, y: number, w: number, h: number, runs: TextRun[], o: Partial<Extract<Shape, { t: "text" }>> = {}) => out.push({ t: "text", x, y, w, h, runs, ...o });
  const card = (x: number, y: number, w: number, h: number, fill = th.card, radius = 0.22) => out.push({ t: "rect", x, y, w, h, fill, radius, shadow: th.shadow, line: th.shadow ? undefined : th.line, lineW: 1 });
  const pill = (x: number, y: number, text: string, fill = th.accent, color = th.onAccent, size = 15) => {
    const em = [...text].reduce((a, c) => a + (/[가-힣]/.test(c) ? 1 : 0.62), 0);
    const w = 0.5 + (em * size) / 72;
    out.push({ t: "rect", x, y, w, h: 0.42, fill, radius: 0.21 });
    T(x, y, w, 0.42, [{ text, size, weight: 800, color }], { align: "center", valign: "middle" });
    return w;
  };
  const decorate = (strong: boolean) => {
    if (th.decor === "dots") for (let r = 0; r < 4; r++) for (let c = 0; c < 6; c++) out.push({ t: "ellipse", x: R - 1.6 + c * 0.28, y: 0.35 + r * 0.28, w: 0.07, h: 0.07, fill: th.accent2, alpha: 45 });
    if (th.decor === "circles") {
      out.push({ t: "ellipse", x: W - (strong ? 4.6 : 2.2), y: strong ? -1.2 : -1.0, w: strong ? 6 : 3.2, h: strong ? 6 : 3.2, fill: th.accent, alpha: strong ? 85 : 90 });
      if (strong) out.push({ t: "ellipse", x: W - 6.2, y: 4.4, w: 2.6, h: 2.6, fill: th.accent2, alpha: 70 });
    }
    if (th.decor === "chalk") out.push({ t: "line", x: L, y: H - 0.32, w: R - L, h: 0, color: th.line, width: 2 });
    if (th.decor === "grid") {
      for (let x = 0.5; x < W; x += 0.5) out.push({ t: "line", x, y: 0, w: 0, h: H, color: "F1F1EC", width: 0.5 });
      for (let y = 0.5; y < H; y += 0.5) out.push({ t: "line", x: 0, y, w: W, h: 0, color: "F1F1EC", width: 0.5 });
    }
  };
  const title = (text: string, y: number, size = 40, w = R - L) => {
    if (th.highlight) out.push({ t: "rect", x: L - 0.05, y: y + size / 72 * 0.62, w: Math.min(w, (size / 72) * [...text].reduce((a, c) => a + (/[가-힣]/.test(c) ? 1.02 : 0.58), 0) + 0.2), h: size / 72 * 0.5, fill: th.highlight });
    T(L, y, w, size / 72 * 1.45, [{ text, size, weight: 800 }], { valign: "top" });
  };

  if (s.kind === "cover") {
    decorate(true);
    if (th.decor === "dots") out.push({ t: "ellipse", x: R - 3.0, y: 2.6, w: 3.0, h: 3.0, fill: th.accent2, alpha: 80 });
    if (s.kicker) pill(L, 2.0, s.kicker, th.accent, th.onAccent, 18);
    title(s.title, 2.7, 60, R - L - (th.decor === "none" ? 0 : 3.6));
    if (th.decor === "none") out.push({ t: "rect", x: L, y: 4.25, w: 1.2, h: 0.12, fill: th.accent });
    s.bullets.forEach((b, i) => T(L, 4.6 + i * 0.5, 7, 0.5, [{ text: b, size: 22, weight: 600, color: th.muted }]));
    return out;
  }

  decorate(false);
  // header
  const top = 0.6;
  let hx = L;
  if (s.kicker) hx += pill(L, top, s.kicker, th.accent, th.onAccent) + 0.2;
  if (s.minutes) {
    out.push({ t: "rect", x: R - 1.9, y: top - 0.05, w: 1.9, h: 0.9, fill: th.accent2, radius: 0.45 });
    T(R - 1.9, top - 0.05, 1.9, 0.9, [{ text: `${s.minutes}분`, size: 28, weight: 800, color: th.onAccent }], { align: "center", valign: "middle" });
  }
  const titleY = s.kicker ? top + 0.65 : top;
  title(s.title, titleY, s.kind === "question" ? 44 : 40, R - L - (s.minutes ? 2.3 : 0));
  void hx;

  // footer: page chip + phase tracker
  const fy = H - 0.75;
  T(L, fy, 1.4, 0.4, [{ text: `${pad2(page)} / ${pad2(total)}`, size: 14, weight: 600, color: th.muted }], { valign: "middle" });
  if (s.footer) T(L + 1.5, fy, 6, 0.4, [{ text: s.footer, size: 15, color: th.muted }], { valign: "middle" });
  if (phases.length > 1 && s.phase !== undefined && s.phase >= 0) {
    const cw = 1.35, gap = 0.1, tot = phases.length * cw + (phases.length - 1) * gap;
    phases.forEach((ph, i) => {
      const x = R - tot + i * (cw + gap), on = i === s.phase;
      out.push({ t: "rect", x, y: fy, w: cw, h: 0.4, fill: on ? th.accent : th.card, radius: 0.2, line: on ? undefined : th.line, lineW: 1 });
      T(x, fy, cw, 0.4, [{ text: ph, size: 14, weight: 800, color: on ? th.onAccent : th.muted }], { align: "center", valign: "middle" });
    });
  }

  const bodyY = titleY + 1.25;
  const bodyH = fy - 0.35 - bodyY;
  switch (s.kind) {
    case "objectives": {
      const n = s.bullets.length, gap = 0.25, h = Math.min(1.3, (bodyH - gap * (n - 1)) / Math.max(n, 1));
      s.bullets.forEach((b, i) => {
        const y = bodyY + i * (h + gap);
        card(L, y, R - L, h);
        out.push({ t: "ellipse", x: L + 0.3, y: y + h / 2 - 0.36, w: 0.72, h: 0.72, fill: th.accent });
        T(L + 0.3, y + h / 2 - 0.36, 0.72, 0.72, [{ text: pad2(i + 1), size: 20, weight: 800, color: th.onAccent }], { align: "center", valign: "middle" });
        T(L + 1.3, y, R - L - 1.6, h, [{ text: b, size: n > 3 ? 24 : 28, weight: 600 }], { valign: "middle" });
      });
      break;
    }
    case "flow": {
      const items = s.bullets.map((b) => b.split("|"));
      const n = items.length, gap = 0.45, w = (R - L - gap * (n - 1)) / Math.max(n, 1);
      items.forEach(([phase, min, first], i) => {
        const x = L + i * (w + gap);
        card(x, bodyY, w, bodyH);
        T(x + 0.35, bodyY + 0.25, w - 0.7, 1.0, [{ text: pad2(i + 1), size: 48, weight: 800, color: i % 2 ? th.accent2 : th.accent }]);
        T(x + 0.35, bodyY + 1.25, w - 0.7, 0.7, [{ text: phase, size: 32, weight: 800 }]);
        if (min) { out.push({ t: "rect", x: x + 0.35, y: bodyY + 2.0, w: 1.0, h: 0.38, fill: th.bg, radius: 0.19, line: th.line, lineW: 1 }); T(x + 0.35, bodyY + 2.0, 1.0, 0.38, [{ text: `${min}분`, size: 14, weight: 800, color: th.muted }], { align: "center", valign: "middle" }); }
        if (first) T(x + 0.35, bodyY + 2.6, w - 0.7, bodyH - 2.8, [{ text: first, size: 18, color: th.muted }], { valign: "top", lineHeight: 1.35 });
        if (i < n - 1) out.push({ t: "line", x: x + w + 0.08, y: bodyY + bodyH / 2, w: gap - 0.16, h: 0, color: th.accent, width: 2 });
      });
      break;
    }
    case "question": {
      T(L, bodyY - 0.2, 1.4, 1.4, [{ text: "“", size: 110, weight: 800, color: th.accent }]);
      card(L + 1.4, bodyY + 0.2, R - L - 1.4, bodyH - 0.2, th.card, 0.3);
      if (s.bullets.length) T(L + 1.8, bodyY + 0.5, R - L - 2.2, bodyH - 0.8, s.bullets.map((b, i) => ({ text: `· ${b}`, size: 26, weight: 600, breakAfter: i < s.bullets.length - 1 })), { valign: "top", lineHeight: 1.5 });
      else T(L + 1.8, bodyY + 0.5, R - L - 2.2, 0.5, [{ text: "내 생각 적기", size: 18, weight: 600, color: th.muted }]);
      break;
    }
    case "activity": {
      const side = s.footer ? 3.2 : 0;
      const w = R - L - (side ? side + 0.3 : 0);
      if (s.bullets.length) {
        const n = s.bullets.length, gap = 0.2, h = Math.min(1.15, (bodyH - gap * (n - 1)) / n);
        s.bullets.forEach((b, i) => {
          const y = bodyY + i * (h + gap);
          card(L, y, w, h);
          T(L + 0.3, y, 0.8, h, [{ text: `${i + 1}`, size: 28, weight: 800, color: th.accent }], { valign: "middle" });
          T(L + 1.0, y, w - 1.3, h, [{ text: b, size: 24, weight: 600 }], { valign: "middle" });
        });
      } else {
        card(L, bodyY, w, bodyH);
        T(L + 0.4, bodyY + 0.3, 3, 0.5, [{ text: "활동 방법", size: 18, weight: 800, color: th.accent }]);
        for (let k = 0; k < 3; k++) {
          const y = bodyY + 1.05 + k * ((bodyH - 1.3) / 3);
          out.push({ t: "ellipse", x: L + 0.4, y, w: 0.5, h: 0.5, fill: th.bg, line: th.line, lineW: 1 });
          T(L + 0.4, y, 0.5, 0.5, [{ text: `${k + 1}`, size: 16, weight: 800, color: th.muted }], { align: "center", valign: "middle" });
          out.push({ t: "line", x: L + 1.1, y: y + 0.45, w: w - 1.5, h: 0, color: th.line, width: 1.25, dash: true });
        }
      }
      if (side) {
        card(R - side, bodyY, side, bodyH, th.accent2, 0.22);
        T(R - side + 0.3, bodyY + 0.3, side - 0.6, 0.5, [{ text: "준비물", size: 18, weight: 800, color: th.onAccent }]);
        T(R - side + 0.3, bodyY + 0.9, side - 0.6, bodyH - 1.2, (s.footer ?? "").replace(/^준비물:\s*/, "").split(/,\s*/).map((m, i, a) => ({ text: `· ${m}`, size: 20, weight: 600, color: th.onAccent, breakAfter: i < a.length - 1 })), { valign: "top", lineHeight: 1.5 });
      }
      break;
    }
    case "groups": {
      const cw = (R - L - 0.3 * 3) / 4;
      s.bullets.forEach((b, i) => {
        const [role, desc] = b.split("|");
        const x = L + i * (cw + 0.3);
        card(x, bodyY, cw, bodyH);
        out.push({ t: "ellipse", x: x + cw / 2 - 0.6, y: bodyY + 0.45, w: 1.2, h: 1.2, fill: i % 2 ? th.accent2 : th.accent });
        T(x + cw / 2 - 0.6, bodyY + 0.45, 1.2, 1.2, [{ text: role.slice(0, 1), size: 34, weight: 800, color: th.onAccent }], { align: "center", valign: "middle" });
        T(x + 0.25, bodyY + 1.9, cw - 0.5, 0.6, [{ text: role, size: 26, weight: 800 }], { align: "center" });
        T(x + 0.25, bodyY + 2.6, cw - 0.5, bodyH - 2.8, [{ text: desc ?? "", size: 18, color: th.muted }], { align: "center", valign: "top", lineHeight: 1.4 });
      });
      break;
    }
    case "check": {
      const n = Math.min(s.bullets.length, 3), gap = 0.25, h = (bodyH - gap * (n - 1)) / n;
      s.bullets.slice(0, 3).forEach((b, i) => {
        const y = bodyY + i * (h + gap);
        card(L, y, R - L, h);
        T(L + 0.35, y + 0.2, 1.2, 0.5, [{ text: `Q${i + 1}`, size: 22, weight: 800, color: th.accent }]);
        T(L + 1.3, y + 0.15, R - L - 1.7, 0.6, [{ text: b, size: 26, weight: 600 }]);
        if (h > 1.3) out.push({ t: "line", x: L + 1.3, y: y + h - 0.4, w: R - L - 1.7, h: 0, color: th.line, width: 1.25, dash: true });
      });
      break;
    }
    default: {
      // closing: sticky-note cards
      const n = Math.max(s.bullets.length, 1), gap = 0.35, w = (R - L - gap * (n - 1)) / n;
      s.bullets.forEach((b, i) => {
        const x = L + i * (w + gap);
        out.push({ t: "rect", x, y: bodyY, w, h: bodyH, fill: i % 2 ? th.accent2 : th.accent, radius: 0.22 });
        T(x + 0.35, bodyY + 0.3, w - 0.7, bodyH - 0.6, [{ text: b, size: 28, weight: 800, color: th.onAccent }], { valign: "top", lineHeight: 1.35 });
      });
    }
  }
  return out;
}

// ------------------------------------------------------------------ PPTX

const hexAlpha = (a?: number) => (a === undefined ? undefined : a);

/** PPTX via pptxgenjs (loaded on demand). Same layout as the preview and the HTML deck. */
export async function exportPptx(slides: SlideSpec[], theme: SlideTheme, phases: string[], fileName: string) {
  const { default: PptxGenJS } = await import("pptxgenjs");
  const pptx = new PptxGenJS();
  pptx.layout = "LAYOUT_WIDE";
  pptx.title = slides[0]?.title ?? "수업";
  pptx.author = "교실잇다";
  const face = (w?: Weight) => (w === 800 ? FONT_HEAD : w === 600 ? FONT_SEMI : FONT_BODY);
  slides.forEach((s, idx) => {
    const slide = pptx.addSlide();
    slide.background = { color: theme.bg };
    if (s.notes) slide.addNotes(s.notes);
    for (const sh of layoutSlide(s, theme, phases, idx + 1, slides.length)) {
      if (sh.t === "rect")
        slide.addShape(sh.radius ? "roundRect" : "rect", {
          x: sh.x, y: sh.y, w: sh.w, h: sh.h,
          rectRadius: sh.radius ? Math.min(0.5, sh.radius / Math.min(sh.w, sh.h)) : undefined,
          fill: sh.fill ? { color: sh.fill, transparency: hexAlpha(sh.alpha) } : { type: "none" },
          line: sh.line ? { color: sh.line, width: sh.lineW ?? 1 } : { type: "none" },
          shadow: sh.shadow ? { type: "outer", color: "000000", opacity: 0.08, blur: 8, offset: 2, angle: 90 } : undefined,
        });
      else if (sh.t === "ellipse")
        slide.addShape("ellipse", { x: sh.x, y: sh.y, w: sh.w, h: sh.h, fill: { color: sh.fill, transparency: hexAlpha(sh.alpha) }, line: sh.line ? { color: sh.line, width: sh.lineW ?? 1 } : { type: "none" } });
      else if (sh.t === "line") slide.addShape("line", { x: sh.x, y: sh.y, w: sh.w, h: sh.h, line: { color: sh.color, width: sh.width, dashType: sh.dash ? "dash" : "solid" } });
      else
        slide.addText(
          sh.runs.map((r) => ({ text: r.text, options: { fontSize: r.size, fontFace: face(r.weight), color: r.color ?? theme.fg, breakLine: r.breakAfter } })),
          { x: sh.x, y: sh.y, w: sh.w, h: sh.h, align: sh.align ?? "left", valign: sh.valign ?? "top", margin: 0, lineSpacingMultiple: sh.lineHeight ?? 1.15, fit: "shrink" },
        );
    }
  });
  await pptx.writeFile({ fileName });
}
