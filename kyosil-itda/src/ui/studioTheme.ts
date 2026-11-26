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

export function studioCss() {
  return Object.values(STUDIOS)
    .map((s) => `:root[data-studio="${s.id}"]{--primary:${s.colors.primary};--primary-hover:${s.colors.hover};--primary-pressed:${s.colors.pressed};--primary-text:${s.colors.text};--primary-bg:${s.colors.bg};--primary-line:${s.colors.line};--studio-pattern:${pattern(s.id, s.colors.line)}}`)
    .join("\n");
}

export function installStudioCss() {
  if (document.getElementById("studio-css")) return;
  const el = document.createElement("style");
  el.id = "studio-css";
  el.textContent = studioCss();
  document.head.prepend(el);
}
