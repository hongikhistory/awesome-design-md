// Builds dist/kyosil-itda.html: one self-contained file (JS, CSS and icon inlined)
// for contest submission or opening straight from disk. Run after `vite build`.
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const dist = new URL("../dist/", import.meta.url).pathname;
let html = readFileSync(join(dist, "index.html"), "utf8");
const icon = `data:image/svg+xml;base64,${readFileSync(join(dist, "icon.svg")).toString("base64")}`;

html = html.replace(/<link rel="stylesheet"[^>]*href="\.\/([^"]+)"[^>]*>/g, (_, f) => `<style>${readFileSync(join(dist, f), "utf8")}</style>`);
html = html.replace(/<script type="module" crossorigin src="\.\/([^"]+)"><\/script>/g, (_, f) => {
  const js = readFileSync(join(dist, f), "utf8").replaceAll("</script", "<\\/script");
  return `<script type="module">${js}</script>`;
});
html = html.replace(/<link rel="manifest"[^>]*>\n?\s*/, "").replace(/\.\/icon\.svg/g, icon);
// Move the module script to the end of <body> so #root exists when it runs.
const scripts = [];
html = html.replace(/<script type="module">[\s\S]*?<\/script>/g, (m) => (scripts.push(m), ""));
html = html.replace("</body>", () => `${scripts.join("\n")}\n</body>`); // function form: no $-pattern expansion
writeFileSync(join(dist, "kyosil-itda.html"), html);
console.log(`dist/kyosil-itda.html ${(Buffer.byteLength(html) / 1024).toFixed(0)} KB`);
