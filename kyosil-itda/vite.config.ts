import react from "@vitejs/plugin-react";
import { gzipSync } from "node:zlib";
import type { Plugin } from "vite";
import { defineConfig } from "vitest/config";

const TOKEN = "__KB_MEASURED_AT_BUILD__";

// Writes the real gzip size of the first load (HTML + JS + CSS + manifest) into the About page.
function bundleSize(): Plugin {
  return {
    name: "bundle-size",
    apply: "build",
    generateBundle(_opts, bundle) {
      let bytes = 0;
      for (const f of Object.values(bundle)) {
        const src = f.type === "chunk" ? f.code : f.source;
        if (/\.(js|css|html|webmanifest|svg)$/.test(f.fileName)) bytes += gzipSync(typeof src === "string" ? src : Buffer.from(src)).length;
      }
      const kb = String(Math.round(bytes / 1024));
      for (const f of Object.values(bundle)) if (f.type === "chunk") f.code = f.code.replaceAll(TOKEN, kb);
      this.info(`first-load gzip ≈ ${kb} KB`);
    },
  };
}

// base "./" keeps the build portable: any static host or sub-path works.
export default defineConfig({
  base: "./",
  plugins: [react(), bundleSize()],
  define: { __BUNDLE_GZIP_KB__: JSON.stringify(TOKEN) },
  build: { target: "es2022", sourcemap: false },
  test: { environment: "node" },
});
