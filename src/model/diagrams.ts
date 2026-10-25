// 数据目录在构建时由 ARCH_DATA 选择，见 vite.config.ts。
import { fromJsonString } from "@bufbuild/protobuf";
import { MigrationSchema } from "@/gen/arch/v1/migration_pb";

// 数据目录下每个一级子目录是一张架构图，其中任意层级的 *.json 都是片段，按路径顺序合成；
// 根目录的每个 *.json 是一条迁移路线，文件名为其 ID。
const diagramFiles = import.meta.glob<string>("@data/*/**/*.json", {
  query: "?raw",
  import: "default",
  eager: true,
});
const migrationFiles = import.meta.glob<string>("@data/*.json", {
  query: "?raw",
  import: "default",
  eager: true,
});

export interface DiagramSource {
  id: string;
  fragments: Record<string, string>;
}

export interface MigrationSource {
  id: string;
  source: string;
  /** 声明的起点与终点架构图目录名，无法解析时为空。 */
  baseline: string;
  target: string;
}

export interface Page {
  id: string;
  kind: "diagram" | "migration";
}

/** 架构图、迁移路线与标签顺序；ID 用于 URL hash。 */
export const {
  diagrams: DIAGRAMS,
  migrations: MIGRATIONS,
  pages: PAGES,
} = indexData(diagramFiles, migrationFiles, __ARCH_DATA_PREFIX__);

/**
 * 按数据目录前缀把文件分为架构图与迁移路线。标签顺序：迁移路线按 ID 排序，各自连同起点与终点
 * 依次排在前面，其余架构图按目录名排序。
 */
export function indexData(
  diagramFiles: Readonly<Record<string, string>>,
  migrationFiles: Readonly<Record<string, string>>,
  prefix: string,
): { diagrams: DiagramSource[]; migrations: MigrationSource[]; pages: Page[] } {
  const groups = new Map<string, Record<string, string>>();
  for (const [path, source] of Object.entries(diagramFiles)) {
    const id = path.slice(prefix.length).split("/")[0];
    groups.set(id, { ...groups.get(id), [path]: source });
  }
  const migrations = Object.entries(migrationFiles)
    .map(([path, source]) => ({
      id: path.slice(prefix.length, -".json".length),
      source,
      ...endpoints(source),
    }))
    .sort((a, b) => a.id.localeCompare(b.id));
  const clashes = migrations.filter((migration) => groups.has(migration.id));
  if (clashes.length)
    throw new Error(`迁移路线与架构图目录重名：${clashes.map(({ id }) => id).join("、")}`);

  const pages: Page[] = [];
  const place = (id: string, kind: Page["kind"]) => {
    if (!pages.some((page) => page.id === id)) pages.push({ id, kind });
  };
  for (const migration of migrations) {
    if (groups.has(migration.baseline)) place(migration.baseline, "diagram");
    place(migration.id, "migration");
    if (groups.has(migration.target)) place(migration.target, "diagram");
  }
  for (const id of [...groups.keys()].sort()) place(id, "diagram");
  const diagrams = pages
    .filter((page) => page.kind === "diagram")
    .map(({ id }) => ({ id, fragments: groups.get(id) ?? {} }));
  return { diagrams, migrations, pages };
}

/** 迁移路线声明的起点与终点；格式错误留给 parseMigration 报告。 */
function endpoints(source: string): { baseline: string; target: string } {
  try {
    const { baseline, target } = fromJsonString(MigrationSchema, source);
    return { baseline, target };
  } catch {
    return { baseline: "", target: "" };
  }
}
