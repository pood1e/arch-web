// 数据目录在构建时由 ARCH_DATA 选择，见 vite.config.ts。
import current from "@data/current.json?raw";
import migration from "@data/migration.json?raw";
import target from "@data/target.json?raw";

/** 架构图清单，id 用于 URL hash。 */
export const DIAGRAMS = [
  { id: "current", source: current },
  { id: "target", source: target },
] as const;

/** 从 baseline 架构图走向 target 架构图的迁移路线，标签位于两者之间。 */
export const MIGRATION = {
  id: "migration",
  source: migration,
  baseline: "current",
  target: "target",
} as const;
