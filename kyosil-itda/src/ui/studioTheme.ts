// Turns the studio table into CSS custom properties. The <style> goes FIRST in <head>, so the
// high-contrast and dark themes in styles.css (same or higher specificity, later in the cascade)
// always win over a studio's colours.
import { STUDIOS, type StudioId } from "../core/studio";

const svg = (body: string, size: number) =>
  `url("data:image/svg+xml,${encodeURIComponent(`<svg xmlns='http://www.w3.org/2000/svg' width='${size}' height='${size}' viewBox='0 0 ${size} ${size}'>${body}</svg>`)}")`;

function pattern(id: StudioId, c: string): string {
  switch (id) {
    case "history": // 한지 섬유
      return svg(`<g fill='none' stroke='${c}' stroke-width='1' stroke-linecap='round' opacity='.55'><path d='M12 20c14 4 22-2 34 3'/><path d='M70 48c10-6 22-4 30 2'/><path d='M24 92c12 2 20-6 30-3'/><path d='M84 104c8 3 14 1 22-4'/><path d='M100 18c-6 8-4 14 2 20'/></g>`, 128);
    case "korean": // 원고지
      return svg(`<rect x='.5' y='.5' width='31' height='31' fill='none' stroke='${c}' opacity='.45'/>`, 32);
    case "math": // 모눈
      return svg(`<path d='M0 .5H96M.5 0V96' stroke='${c}' opacity='.7'/><path d='M0 24.5H96M0 48.5H96M0 72.5H96M24.5 0V96M48.5 0V96M72.5 0V96' stroke='${c}' opacity='.3'/>`, 96);
    case "science": // 분자
      return svg(`<g fill='${c}' opacity='.5'><circle cx='20' cy='20' r='3'/><circle cx='60' cy='44' r='2.5'/><circle cx='36' cy='70' r='3'/></g><path d='M20 20L60 44L36 70' fill='none' stroke='${c}' opacity='.35'/>`, 88);
    case "social": // 등고선
      return svg(`<g fill='none' stroke='${c}' opacity='.4'><ellipse cx='60' cy='60' rx='44' ry='30'/><ellipse cx='60' cy='60' rx='28' ry='18'/><ellipse cx='60' cy='60' rx='12' ry='7'/></g>`, 120);
    case "english": // 공책 줄
      return svg(`<path d='M0 31.5H64' stroke='${c}' opacity='.5'/>`, 64);
    case "arts": // 물감 점
      return svg(`<g fill='${c}' opacity='.45'><circle cx='14' cy='18' r='4'/><circle cx='58' cy='40' r='6'/><circle cx='30' cy='66' r='3'/></g>`, 80);
    default:
      return "none";
  }
}

const hex = (h: string) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
const toHex = (c: number[]) => "#" + c.map((v) => Math.round(Math.max(0, Math.min(255, v))).toString(16).padStart(2, "0")).join("");
/** a over b by t (0..1) */
export const mix = (a: string, b: string, t: number) => { const x = hex(a), y = hex(b); return toHex(x.map((v, i) => v * t + y[i] * (1 - t))); };

/**
 * Studio colours for a dark screen (the phone or computer set to dark mode). The accent stays the studio's own
 * colour; text in the accent becomes the light tint, tinted panels become a deep shade. The in-app 고대비 switch
 * (data-contrast="high") is excluded on purpose: it keeps the fixed KRDS high-contrast palette.
 */
export function darkStudioVars(s: (typeof STUDIOS)[StudioId]) {
  return { primary: s.colors.primary, hover: s.colors.hover, pressed: s.colors.pressed, text: s.colors.line, bg: mix(s.colors.primary, "#000000", 0.2), line: mix(s.colors.primary, "#000000", 0.6) };
}

export function studioCss() {
  const light = Object.values(STUDIOS)
    .map((s) => `:root[data-studio="${s.id}"]{--primary:${s.colors.primary};--primary-hover:${s.colors.hover};--primary-pressed:${s.colors.pressed};--primary-text:${s.colors.text};--primary-bg:${s.colors.bg};--primary-line:${s.colors.line};--studio-pattern:${pattern(s.id, s.colors.line)}}`)
    .join("\n");
  const darkVars = (s: (typeof STUDIOS)[StudioId]) => { const d = darkStudioVars(s); return `--primary:${d.primary};--primary-hover:${d.hover};--primary-pressed:${d.pressed};--primary-text:${d.text};--primary-bg:${d.bg};--primary-line:${d.line};--on-primary:#ffffff`; };
  // more specific than the dark rules in styles.css, but never applied under the 고대비 switch
  const darkOs = Object.values(STUDIOS).map((s) => `:root[data-studio="${s.id}"]:not([data-theme="light"]):not([data-contrast="normal"]):not([data-contrast="high"]){${darkVars(s)}}`).join("\n");
  const darkHost = Object.values(STUDIOS).map((s) => `:root[data-studio="${s.id}"][data-theme="dark"]:not([data-contrast="normal"]):not([data-contrast="high"]){${darkVars(s)}}`).join("\n");
  return `${light}\n@media (prefers-color-scheme: dark){\n${darkOs}\n}\n${darkHost}`;
}

export function installStudioCss() {
  if (document.getElementById("studio-css")) return;
  const el = document.createElement("style");
  el.id = "studio-css";
  el.textContent = studioCss();
  document.head.prepend(el);
}
