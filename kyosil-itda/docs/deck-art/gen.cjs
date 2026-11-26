const { chromium } = require("playwright");
const P = "#F4EFE6", P2 = "#EAE3D6", INK = "#1E1B18", RED = "#A63A26", BLUE = "#2D3E6B", OCH = "#D9A441", SOFT = "#CFC6B6";
const grain = (op = .16) => `<filter id="g"><feTurbulence type="fractalNoise" baseFrequency=".85" numOctaves="2" seed="7"/><feColorMatrix values="0 0 0 0 .1  0 0 0 0 .08  0 0 0 0 .07  0 0 0 ${op} 0"/></filter>
<filter id="rough"><feTurbulence type="fractalNoise" baseFrequency=".035" numOctaves="2" seed="3"/><feDisplacementMap in="SourceGraphic" scale="5"/></filter>`;
const wrap = (w, h, bg, body, op) => `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}"><defs>${grain(op)}</defs><rect width="${w}" height="${h}" fill="${bg}"/>${body}<rect width="${w}" height="${h}" filter="url(#g)"/></svg>`;

// 1. cover poster: sun, bridge of stepping stones linking two figures, manuscript grid
const grid = (x0, y0, cols, rows, s, c) => { let o = ""; for (let r = 0; r < rows; r++) for (let k = 0; k < cols; k++) o += `<rect x="${x0 + k * s}" y="${y0 + r * s}" width="${s}" height="${s}" fill="none" stroke="${c}" stroke-width="1.5"/>`; return o; };
const stones = (cx, cy, R, n, r, c) => { let o = ""; for (let i = 0; i <= n; i++) { const a = Math.PI + (i / n) * Math.PI; o += `<circle cx="${(cx + R * Math.cos(a)).toFixed(1)}" cy="${(cy + R * Math.sin(a)).toFixed(1)}" r="${r}" fill="${c}"/>`; } return o; };
const cover = wrap(840, 900, P2, `
<g filter="url(#rough)">
<circle cx="600" cy="560" r="230" fill="${OCH}"/>
<circle cx="612" cy="566" r="230" fill="none" stroke="${INK}" stroke-width="2" opacity=".3"/>
<path d="M-30 650 C 200 560, 330 600, 420 650 S 700 700, 870 610 V960 H-30Z" fill="${BLUE}"/>
<path d="M-30 710 C 180 650, 320 690, 430 720 S 700 760, 870 690 V960 H-30Z" fill="${INK}" opacity=".9"/>
</g>
${grid(60, 760, 12, 2, 60, SOFT)}
<path d="M150 610 A 270 270 0 0 1 690 610" fill="none" stroke="${INK}" stroke-width="3" stroke-dasharray="2 14" stroke-linecap="round"/>
${stones(420, 610, 270, 14, 10, RED)}
<g transform="translate(150 610)"><circle r="34" fill="${P}"/><circle r="34" fill="none" stroke="${INK}" stroke-width="4"/><circle cy="-6" r="10" fill="${INK}"/><path d="M-16 18 q16 -20 32 0" fill="${INK}"/></g>
<g transform="translate(690 610)"><circle r="26" fill="${P}"/><circle r="26" fill="none" stroke="${INK}" stroke-width="4"/><circle cy="-5" r="8" fill="${INK}"/><path d="M-12 14 q12 -16 24 0" fill="${INK}"/></g>
<path d="M60 90 H 300" stroke="${INK}" stroke-width="3"/><path d="M60 104 H 220" stroke="${RED}" stroke-width="3"/>
`);

// 2. problem: pile of documents with format tabs, a clock over them
const doc = (x, y, rot, tab, tc) => `<g transform="translate(${x} ${y}) rotate(${rot})"><rect x="6" y="6" width="300" height="380" fill="${INK}" opacity=".18"/><rect width="300" height="380" fill="${P}" stroke="${INK}" stroke-width="3"/><rect x="0" y="-34" width="120" height="34" fill="${tc}" stroke="${INK}" stroke-width="3"/><text x="60" y="-10" text-anchor="middle" font-family="Pretendard, sans-serif" font-weight="800" font-size="20" fill="${tc === OCH ? INK : P}">${tab}</text>${[0,1,2,3,4,5,6,7].map(i => `<path d="M30 ${50 + i * 36} H ${i % 3 === 2 ? 170 : 270}" stroke="${SOFT}" stroke-width="8" stroke-linecap="round"/>`).join("")}</g>`;
const ticks = Array.from({ length: 12 }, (_, i) => { const a = i * Math.PI / 6; return `<path d="M${(150 * Math.cos(a)).toFixed(1)} ${(150 * Math.sin(a)).toFixed(1)} L${(130 * Math.cos(a)).toFixed(1)} ${(130 * Math.sin(a)).toFixed(1)}" stroke="${INK}" stroke-width="${i % 3 ? 3 : 6}"/>`; }).join("");
const problem = wrap(640, 720, P2, `
${doc(70, 250, -9, "HWP", BLUE)}${doc(230, 300, 7, "XLSX", OCH)}${doc(150, 360, -2, "PDF", RED)}
<g transform="translate(450 190)" filter="url(#rough)"><circle r="170" fill="${RED}"/><circle r="150" fill="${P}"/>${ticks}<path d="M0 0 L0 -105" stroke="${INK}" stroke-width="10" stroke-linecap="round"/><path d="M0 0 L78 42" stroke="${INK}" stroke-width="8" stroke-linecap="round"/><circle r="12" fill="${INK}"/><path d="M0 0 L 0 -150 A150 150 0 0 1 130 75 Z" fill="${RED}" opacity=".22"/></g>
`);

// 3. name: two banks joined by an arc — 널리(sun spreading) + 잇다(bridge)
const rays = Array.from({ length: 16 }, (_, i) => { const a = Math.PI + i * Math.PI / 15; return `<path d="M${(380 + 120 * Math.cos(a)).toFixed(1)} ${(330 + 120 * Math.sin(a)).toFixed(1)} L${(380 + 175 * Math.cos(a)).toFixed(1)} ${(330 + 175 * Math.sin(a)).toFixed(1)}" stroke="${OCH}" stroke-width="6" stroke-linecap="round"/>`; }).join("");
const name = wrap(760, 600, INK, `
${rays}<circle cx="380" cy="330" r="100" fill="${OCH}" filter="url(#rough)"/>
<rect x="0" y="330" width="760" height="270" fill="${INK}"/>
<path d="M0 420 H 170 V 600 H0Z M590 420 H760 V600 H590Z" fill="${BLUE}"/>
<path d="M170 420 Q 380 260 590 420" fill="none" stroke="${RED}" stroke-width="14"/>
${Array.from({ length: 9 }, (_, i) => { const t = (i + 1) / 10, x = (1 - t) ** 2 * 170 + 2 * (1 - t) * t * 380 + t * t * 590, y = (1 - t) ** 2 * 420 + 2 * (1 - t) * t * 260 + t * t * 420; return `<path d="M${x.toFixed(1)} ${y.toFixed(1)} V 430" stroke="${RED}" stroke-width="4"/>`; }).join("")}
<path d="M170 430 H590" stroke="${RED}" stroke-width="6"/>
${[0,1,2,3,4,5,6].map(i => `<path d="M${40 + i * 100} ${500 + (i % 2) * 30} q 30 -14 60 0" fill="none" stroke="${SOFT}" stroke-width="4" stroke-linecap="round" opacity=".6"/>`).join("")}
`, .22);

// 4. closing: hourglass whose sand grows a sprout
const closing = wrap(620, 760, INK, `
<g transform="translate(310 380)">
<rect x="-170" y="-330" width="340" height="26" fill="${OCH}"/><rect x="-170" y="304" width="340" height="26" fill="${OCH}"/>
<path d="M-140 -304 C -140 -120, -18 -60, -18 0 C -18 60, -140 120, -140 304 M140 -304 C 140 -120, 18 -60, 18 0 C 18 60, 140 120, 140 304" fill="none" stroke="${SOFT}" stroke-width="6"/>
<path d="M-108 -230 C -90 -130, -16 -80, 0 -40 C 16 -80, 90 -130, 108 -230 Z" fill="${OCH}" filter="url(#rough)"/>
<path d="M0 -40 V 200" stroke="${OCH}" stroke-width="4" stroke-dasharray="3 9"/>
<path d="M-128 304 C -100 250, 100 250, 128 304 Z" fill="${OCH}"/>
<path d="M0 258 C 0 200, 4 170, 0 140" stroke="#7FA36B" stroke-width="7" fill="none" stroke-linecap="round"/>
<path d="M0 190 C -40 180, -62 150, -60 118 C -26 122, -4 150, 0 190Z" fill="#7FA36B"/>
<path d="M2 160 C 36 150, 58 122, 60 92 C 26 96, 4 124, 2 160Z" fill="${RED}"/>
</g>
`, .22);

(async () => {
  const b = await chromium.launch(); const p = await b.newPage({ deviceScaleFactor: 2 });
  for (const [n, svg] of Object.entries({ cover, problem, name, closing })) {
    require("fs").writeFileSync(n + ".svg", svg);
    const m = svg.match(/width="(\d+)" height="(\d+)"/);
    await p.setViewportSize({ width: +m[1], height: +m[2] });
    await p.setContent(`<html><body style="margin:0">${svg}</body></html>`); await p.waitForTimeout(300);
    await p.screenshot({ path: n + ".png", clip: { x: 0, y: 0, width: +m[1], height: +m[2] } });
  }
  await b.close();
})();
