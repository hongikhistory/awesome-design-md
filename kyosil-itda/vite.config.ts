import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// base "./" keeps the build portable: any static host or sub-path works.
export default defineConfig({
  base: "./",
  plugins: [react()],
  build: { target: "es2022", sourcemap: false },
  test: { environment: "node" },
});
