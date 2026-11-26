import react from "@vitejs/plugin-react";
import { builtinModules } from "node:module";
import { fileURLToPath } from "node:url";
import { gzipSync } from "node:zlib";
import type { Alias, Plugin } from "vite";
import { defineConfig } from "vitest/config";

const TOKEN = "__KB_MEASURED_AT_BUILD__";

// Writes the real gzip size of the first load (HTML + entry JS/CSS + manifest) into the About page.
// Lazily loaded chunks (document engine, PPT writer) are excluded on purpose.
function bundleSize(): Plugin {
  return {
    name: "bundle-size",
    apply: "build",
    generateBundle(_opts, bundle) {
      let bytes = 0;
      for (const f of Object.values(bundle)) {
        const firstLoad = f.type === "asset" || (f.type === "chunk" && f.isEntry);
        if (!firstLoad || !/\.(js|css|html|webmanifest|svg)$/.test(f.fileName)) continue;
        const src = f.type === "chunk" ? f.code : f.source;
        bytes += gzipSync(typeof src === "string" ? src : Buffer.from(src)).length;
      }
      const kb = String(Math.round(bytes / 1024));
      for (const f of Object.values(bundle)) if (f.type === "chunk") f.code = f.code.replaceAll(TOKEN, kb);
      this.info(`first-load gzip ≈ ${kb} KB`);
    },
  };
}

// ---- kordoc in the browser -------------------------------------------------
// kordoc targets Node. Its parsers only need Buffer, zlib and JSZip; file-system,
// OCR and native image paths are replaced by stubs that throw if ever called.
const shim = (f: string) => fileURLToPath(new URL(`./src/node-shims/${f}`, import.meta.url));
const esc = (x: string) => x.replace(/[.*+?^${}()|[\]\\/]/g, "\\$&");
const special = new Set(["zlib", "crypto", "child_process", "worker_threads", "buffer"]);
const generic = builtinModules.filter((b) => !b.startsWith("_") && !special.has(b)).sort((a, b) => b.length - a.length).map(esc).join("|");
const nodeAliases: Alias[] = [
  { find: /^(node:)?buffer$/, replacement: fileURLToPath(new URL("./node_modules/buffer/index.js", import.meta.url)) },
  { find: /^(node:)?zlib$/, replacement: shim("zlib.js") },
  { find: /^(node:)?crypto$/, replacement: shim("crypto.js") },
  { find: /^(?:node:)?(?:child_process|worker_threads)$|^(?:sharp|onnxruntime-node|onnxruntime-web|detect-libc)$/, replacement: shim("native.js") },
  { find: new RegExp(`^(node:)?(${generic})$`), replacement: shim("builtins.js") },
];

// JSZip has no Node streams in browsers. Swap kordoc's zip-entry reader to JSZip's
// internal stream; the chunked zip-bomb size guard stays exactly as it is.
function kordocBrowserZip(): Plugin {
  return {
    name: "kordoc-browser-zip",
    transform(code, id) {
      if (!id.includes("kordoc/dist") || !code.includes('file.nodeStream("nodebuffer")')) return;
      return code.replaceAll(
        'const stream = file.nodeStream("nodebuffer");',
        'const stream = file.internalStream("uint8array"); queueMicrotask(() => stream.resume());',
      );
    },
  };
}

// base "./" keeps the build portable: any static host or sub-path works.
export default defineConfig(({ mode }) => ({
  base: "./",
  plugins: [react(), bundleSize(), kordocBrowserZip()],
  resolve: { alias: mode === "test" ? [] : nodeAliases },
  define: { __BUNDLE_GZIP_KB__: JSON.stringify(TOKEN) },
  build: { target: "es2022", sourcemap: false, chunkSizeWarningLimit: 6000 },
  test: { environment: "node" },
}));
