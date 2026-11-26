// Renders the shared slide layout to HTML: the in-app preview and a standalone HTML deck.
import { iconSvg } from "./slideIcons";
import { layoutSlide, SLIDE_H, SLIDE_W, type Shape, type SlideSpec, type SlideTheme } from "./lesson";

const PX = 96; // 1 inch = 96 CSS px → 1280 × 720 canvas
const PT = 96 / 72;
const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const hex = (h: string, alpha?: number) => {
  if (alpha === undefined) return `#${h}`;
  const n = parseInt(h, 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${(1 - alpha / 100).toFixed(2)})`;
};
const box = (s: { x: number; y: number; w: number; h: number }) => `left:${(s.x * PX).toFixed(1)}px;top:${(s.y * PX).toFixed(1)}px;width:${(s.w * PX).toFixed(1)}px;height:${(s.h * PX).toFixed(1)}px`;

function shapeHtml(sh: Shape, th: SlideTheme): string {
  if (sh.t === "rect")
    return `<div class="s" style="${box(sh)};${sh.fill ? `background:${hex(sh.fill, sh.alpha)};` : ""}${sh.line ? `border:${(sh.lineW ?? 1) * PT}px solid #${sh.line};` : ""}${sh.radius ? `border-radius:${sh.radius * PX}px;` : ""}${sh.shadow ? "box-shadow:0 2px 4px rgba(0,0,0,.04),0 10px 28px rgba(0,0,0,.07);" : ""}"></div>`;
  if (sh.t === "ellipse")
    return `<div class="s" style="${box(sh)};border-radius:50%;background:${hex(sh.fill, sh.alpha)};${sh.line ? `border:${(sh.lineW ?? 1) * PT}px solid #${sh.line};` : ""}"></div>`;
  if (sh.t === "line") {
    const vertical = sh.w === 0;
    const b = `${sh.width * PT}px ${sh.dash ? "dashed" : "solid"} #${sh.color}`;
    return `<div class="s" style="${box({ ...sh, w: vertical ? 0 : sh.w, h: vertical ? sh.h : 0 })};${vertical ? `border-left:${b}` : `border-top:${b}`}"></div>`;
  }
  if (sh.t === "icon") return `<div class="s" style="${box(sh)}">${iconSvg(sh.name, sh.color, sh.bg).replace('width="48" height="48"', 'width="100%" height="100%"')}</div>`;
  const lines: string[][] = [[]];
  for (const r of sh.runs) {
    const color = `#${r.color ?? th.fg}`;
    lines.at(-1)!.push(`<span style="font-size:${(r.size * PT).toFixed(1)}px;font-weight:${r.weight ?? 400};color:${color}">${esc(r.text).replace(/\n/g, "<br>")}</span>`);
    if (r.breakAfter) lines.push([]);
  }
  const just = sh.valign === "middle" ? "center" : sh.valign === "bottom" ? "flex-end" : "flex-start";
  return `<div class="s t" style="${box(sh)};justify-content:${just};text-align:${sh.align ?? "left"};line-height:${sh.lineHeight ?? 1.25}">${lines.filter((l) => l.length).map((l) => `<div>${l.join("")}</div>`).join("")}</div>`;
}

export function slideInnerHtml(s: SlideSpec, th: SlideTheme, phases: string[], page: number, total: number) {
  return layoutSlide(s, th, phases, page, total).map((sh) => shapeHtml(sh, th)).join("");
}

export const SLIDE_CSS = `.slide{position:relative;width:${SLIDE_W * PX}px;height:${SLIDE_H * PX}px;overflow:hidden;font-family:Paperlogy,"Pretendard Variable",Pretendard,"Apple SD Gothic Neo","Malgun Gothic",sans-serif;letter-spacing:-0.01em;word-break:keep-all}
.slide .s{position:absolute;box-sizing:border-box}
.slide .t{display:flex;flex-direction:column;overflow:hidden;white-space:pre-wrap;overflow-wrap:anywhere}`;

/** A standalone HTML presentation: fonts embedded, keyboard/touch navigation, activity timer, notes, print. */
export function deckHtml(o: { slides: SlideSpec[]; theme: SlideTheme; phases: string[]; title: string; fontFaceCss: string }) {
  const { slides, theme, phases } = o;
  const sections = slides
    .map((s, i) => `<section class="slide" data-minutes="${s.minutes ?? ""}" style="background:#${theme.bg}" aria-label="${i + 1}번 슬라이드">${slideInnerHtml(s, theme, phases, i + 1, slides.length)}</section>`)
    .join("\n");
  const notes = JSON.stringify(slides.map((s) => s.notes ?? ""));
  return `<!doctype html>
<html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(o.title)}</title>
<style>
${o.fontFaceCss}
${SLIDE_CSS}
html,body{margin:0;height:100%;background:#111;overflow:hidden}
#stage{position:fixed;inset:0;display:grid;place-items:center}
.slide{display:none;transform-origin:center;box-shadow:0 20px 60px rgba(0,0,0,.35)}
.slide.on{display:block}
#bar{position:fixed;left:50%;bottom:14px;transform:translateX(-50%);display:flex;gap:8px;align-items:center;background:rgba(20,20,20,.72);color:#fff;padding:6px 10px;border-radius:999px;font:600 13px Paperlogy,sans-serif;opacity:.0;transition:opacity .2s}
body:hover #bar,#bar:focus-within{opacity:1}
#bar button{all:unset;cursor:pointer;padding:6px 10px;border-radius:999px}
#bar button:hover,#bar button:focus-visible{background:rgba(255,255,255,.16)}
#timer{position:fixed;top:18px;right:22px;font:800 48px Paperlogy,sans-serif;color:#fff;background:rgba(0,0,0,.6);padding:6px 18px;border-radius:16px;display:none}
#timer.done{background:#d63d4a}
#notes{position:fixed;left:0;right:0;bottom:0;max-height:30vh;overflow:auto;background:#fff;color:#111;font:16px/1.6 Paperlogy,sans-serif;padding:16px 24px;display:none;white-space:pre-wrap}
@media print{@page{size:${SLIDE_W}in ${SLIDE_H}in;margin:0}html,body{background:none;overflow:visible;height:auto}#stage{position:static;display:block}.slide{display:block!important;transform:none!important;box-shadow:none;page-break-after:always;break-after:page}#bar,#timer,#notes{display:none!important}}
</style></head>
<body>
<div id="stage">${sections}</div>
<div id="timer" role="timer" aria-live="off"></div>
<div id="notes" aria-label="발표자 메모"></div>
<div id="bar" role="toolbar" aria-label="발표 도구">
<button id="prev" aria-label="이전 슬라이드">←</button><span id="count"></span><button id="next" aria-label="다음 슬라이드">→</button>
<button id="time" title="활동 시간 타이머 (T)">타이머</button><button id="note" title="발표자 메모 (N)">메모</button><button id="full" title="전체 화면 (F)">전체 화면</button>
</div>
<script>
(function(){
var S=[].slice.call(document.querySelectorAll('.slide')),i=0,notes=${notes.replace(/</g, "\\u003c")},tick=null;
function fit(){var k=Math.min(innerWidth/${SLIDE_W * PX},innerHeight/${SLIDE_H * PX})*0.96;S.forEach(function(s){s.style.transform='scale('+k+')'})}
function show(n){i=Math.max(0,Math.min(S.length-1,n));S.forEach(function(s,j){s.classList.toggle('on',j===i)});document.getElementById('count').textContent=(i+1)+' / '+S.length;document.getElementById('notes').textContent=notes[i]||'(메모 없음)';try{history.replaceState(null,'','#'+(i+1))}catch(e){}}
function timer(){var t=document.getElementById('timer'),m=Number(S[i].dataset.minutes)||5,end=Date.now()+m*60000;clearInterval(tick);t.style.display='block';t.classList.remove('done');
tick=setInterval(function(){var r=Math.max(0,end-Date.now()),mm=Math.floor(r/60000),ss=Math.floor(r%60000/1000);t.textContent=mm+':'+(ss<10?'0':'')+ss;if(!r){clearInterval(tick);t.classList.add('done')}},250)}
document.getElementById('prev').onclick=function(){show(i-1)};document.getElementById('next').onclick=function(){show(i+1)};
document.getElementById('time').onclick=timer;
document.getElementById('note').onclick=function(){var n=document.getElementById('notes');n.style.display=n.style.display==='block'?'none':'block'};
document.getElementById('full').onclick=function(){document.fullscreenElement?document.exitFullscreen():document.documentElement.requestFullscreen&&document.documentElement.requestFullscreen()};
addEventListener('keydown',function(e){if(['ArrowRight','PageDown',' '].indexOf(e.key)>=0){e.preventDefault();show(i+1)}else if(['ArrowLeft','PageUp'].indexOf(e.key)>=0){e.preventDefault();show(i-1)}else if(e.key==='Home')show(0);else if(e.key==='End')show(S.length-1);else if(e.key==='t'||e.key==='T')timer();else if(e.key==='n'||e.key==='N')document.getElementById('note').click();else if(e.key==='f'||e.key==='F')document.getElementById('full').click();else if(e.key==='Escape'){clearInterval(tick);document.getElementById('timer').style.display='none'}});
var x0=null;addEventListener('touchstart',function(e){x0=e.touches[0].clientX});addEventListener('touchend',function(e){if(x0===null)return;var dx=e.changedTouches[0].clientX-x0;if(Math.abs(dx)>40)show(i+(dx<0?1:-1));x0=null});
addEventListener('resize',fit);fit();show((parseInt(location.hash.slice(1),10)||1)-1);
})();
</script>
</body></html>`;
}

/** @font-face rules with the bundled Paperlogy subsets inlined as data URLs (for the standalone deck). */
export async function paperlogyFontCss(urls: Record<400 | 600 | 800, string>) {
  const toData = async (u: string) => {
    const buf = new Uint8Array(await (await fetch(u)).arrayBuffer());
    let bin = "";
    for (let i = 0; i < buf.length; i += 0x8000) bin += String.fromCharCode(...buf.subarray(i, i + 0x8000));
    return `data:font/woff2;base64,${btoa(bin)}`;
  };
  const rules = await Promise.all(
    (Object.entries(urls) as [string, string][]).map(async ([w, u]) => `@font-face{font-family:Paperlogy;font-weight:${w};font-display:swap;src:url(${await toData(u)}) format("woff2")}`),
  );
  return rules.join("\n");
}
