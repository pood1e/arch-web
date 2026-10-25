// 数据目录在构建时由 ARCH_DATA 选择，见 vite.config.ts。
import { fromJsonString } from "@bufbuild/protobuf";
import { MigrationSchema } from "@/gen/arch/v1/migration_pb";

// 数据目录下每个一级子目录是一个页面：直接含 *.mmd 的是示意图页，其 *.json 为清单；其余是架构图，
// 任意层级的 *.json 都是片段，按路径顺序合成。根目录的每个 *.json 是一条迁移路线，文件名为其 ID。
const fragmentFiles = import.meta.glob<string>("@data/*/**/*.json", {
  query: "?raw",
  import: "default",
  eager: true,
});
const figureFiles = import.meta.glob<string>("@data/*/*.mmd", {
  query: "?raw",
  import: "default",
  eager: true,
});
const migrationFiles = import.meta.glob<string>("@data/*.json", {
  query: "?raw",
  import: "default",
  eager: true,
});

/** 数据目录中的文件，键为 import.meta.glob 路径。 */
export interface DataFiles {
  /** 一级子目录中任意层级的 JSON：架构图片段或示意图清单。 */
  fragments: Readonly<Record<string, string>>;
  /** 一级子目录中的 Mermaid 源文件。 */
  figures: Readonly<Record<string, string>>;
  /** 根目录的迁移路线。 */
  migrations: Readonly<Record<string, string>>;
}

export interface DiagramSource {
  id: string;
  fragments: Record<string, string>;
}

export interface ExplainerSource {
  id: string;
  /** 目录中的 JSON，键为路径。 */
  manifests: Record<string, string>;
  /** Mermaid 源码，键为文件名。 */
  sources: Record<string, string>;
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
  kind: "diagram" | "explainer" | "migration";
}

/** 架构图、示意图页、迁移路线与标签顺序；ID 用于 URL hash。 */
export const {
  diagrams: DIAGRAMS,
  explainers: EXPLAINERS,
  migrations: MIGRATIONS,
  pages: PAGES,
} = indexData(
  { fragments: fragmentFiles, figures: figureFiles, migrations: migrationFiles },
  __ARCH_DATA_PREFIX__,
);

/**
 * 按数据目录前缀把文件分为架构图、示意图页与迁移路线。标签顺序：迁移路线按 ID 排序，各自连同作为
 * 起点与终点的架构图依次排在前面，其余页面按目录名排序。
 */
export function indexData(
  files: DataFiles,
  prefix: string,
): {
  diagrams: DiagramSource[];
  explainers: ExplainerSource[];
  migrations: MigrationSource[];
  pages: Page[];
} {
  const fragments = byDirectory(files.fragments, prefix);
  const figures = byDirectory(files.figures, prefix);
  const directories = new Set([...fragments.keys(), ...figures.keys()]);
  const kindOf = (id: string): Page["kind"] => (figures.has(id) ? "explainer" : "diagram");
  const migrations = Object.entries(files.migrations)
    .map(([path, source]) => ({
      id: path.slice(prefix.length, -".json".length),
      source,
      ...endpoints(source),
    }))
    .sort((a, b) => a.id.localeCompare(b.id));
  const clashes = migrations.filter((migration) => directories.has(migration.id));
  if (clashes.length)
    throw new Error(`迁移路线与页面目录重名：${clashes.map(({ id }) => id).join("、")}`);

  const pages: Page[] = [];
  const place = (id: string, kind: Page["kind"]) => {
    if (!pages.some((page) => page.id === id)) pages.push({ id, kind });
  };
  const placeEndpoint = (id: string) => {
    if (directories.has(id) && kindOf(id) === "diagram") place(id, "diagram");
  };
  for (const migration of migrations) {
    placeEndpoint(migration.baseline);
    place(migration.id, "migration");
    placeEndpoint(migration.target);
  }
  for (const id of [...directories].sort()) place(id, kindOf(id));
  const ids = (kind: Page["kind"]) =>
    pages.filter((page) => page.kind === kind).map(({ id }) => id);
  return {
    diagrams: ids("diagram").map((id) => ({ id, fragments: fragments.get(id) ?? {} })),
    explainers: ids("explainer").map((id) => ({
      id,
      manifests: fragments.get(id) ?? {},
      sources: Object.fromEntries(
        Object.entries(figures.get(id) ?? {}).map(([path, code]) => [
          path.slice(path.lastIndexOf("/") + 1),
          code,
        ]),
      ),
    })),
    migrations,
    pages,
  };
}

/** 按一级子目录分组，组内键保留原路径。 */
function byDirectory(files: Readonly<Record<string, string>>, prefix: string) {
  const groups = new Map<string, Record<string, string>>();
  for (const [path, source] of Object.entries(files)) {
    const id = path.slice(prefix.length).split("/")[0];
    groups.set(id, { ...groups.get(id), [path]: source });
  }
  return groups;
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
