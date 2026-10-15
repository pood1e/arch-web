/// <reference types="vitest/config" />
import { relative, resolve } from "node:path";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

// ARCH_DATA 指向数据目录，默认为 example：current/ 与 target/ 存放架构图片段，migration.json 为迁移路线；
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
