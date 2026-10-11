/// <reference types="vitest/config" />
import { relative, resolve } from "node:path";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

// ARCH_DATA 指向存放 current.json、target.json 与 migration.json 的目录，默认为 example；
// 目录中的 *.test.ts 随单元测试运行。
const data = resolve(process.env.ARCH_DATA || "example");

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: { alias: { "@data": `${data}/`, "@": new URL("./src/", import.meta.url).pathname } },
  server: { fs: { allow: [".", data] } },
  build: { outDir: "dist" },
  test: {
    include: ["src/**/*.test.ts", `${relative(import.meta.dirname, data)}/**/*.test.ts`],
    environment: "node",
  },
});
