/// <reference types="vitest/config" />
import { relative, resolve, sep } from "node:path";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

// ARCH_DATA 指向数据目录，默认为 example：每个一级子目录存放一张架构图的片段，根目录的 *.json 为迁移路线；
// 目录中的 *.test.ts 随单元测试运行。
const data = resolve(process.env.ARCH_DATA || "example");
const path = relative(import.meta.dirname, data)
  .split(sep)
  .join("/");
// import.meta.glob 的键相对项目根：根内为 /<路径>，根外为 ../<路径>。
const prefix = path.startsWith("..") ? `${path}/` : `/${path}/`;

export default defineConfig({
  plugins: [react(), tailwindcss()],
  define: { __ARCH_DATA_PREFIX__: JSON.stringify(prefix) },
  resolve: { alias: { "@data": `${data}/`, "@": new URL("./src/", import.meta.url).pathname } },
  server: { fs: { allow: [".", data] } },
  build: { outDir: "dist" },
  test: {
    include: ["src/**/*.test.ts", `${path}/**/*.test.ts`],
    environment: "node",
  },
});
