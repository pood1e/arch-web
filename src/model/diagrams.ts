// 数据目录在构建时由 ARCH_DATA 选择，见 vite.config.ts。
import migration from "@data/migration.json?raw";

// 每张架构图是一个目录，其中任意层级的 *.json 都是片段，按路径顺序合成。
const current = import.meta.glob<string>("@data/current/**/*.json", {
  query: "?raw",
  import: "default",
  eager: true,
});
const target = import.meta.glob<string>("@data/target/**/*.json", {
  query: "?raw",
  import: "default",
  eager: true,
});

/** 架构图清单，id 用于 URL hash，fragments 为片段路径到 Proto JSON 的映射。 */
export const DIAGRAMS = [
  { id: "current", fragments: current },
  { id: "target", fragments: target },
] as const;

/** 从 baseline 架构图走向 target 架构图的迁移路线，标签位于两者之间。 */
export const MIGRATION = {
  id: "migration",
  source: migration,
  baseline: "current",
  target: "target",
} as const;
