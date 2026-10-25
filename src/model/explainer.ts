import { fromJsonString } from "@bufbuild/protobuf";
import { type Explainer, ExplainerSchema } from "@/gen/arch/v1/explainer_pb";

export interface FigureModel {
  /** 源文件名去掉扩展名，用于 URL 定位。 */
  id: string;
  title: string;
  description: string;
  /** Mermaid 源码。 */
  code: string;
}

export interface ExplainerModel {
  title: string;
  description: string;
  figures: FigureModel[];
}

const EXTENSION = ".mmd";

/**
 * 解析示意图页：manifests 为目录中的 JSON（路径 → 内容），须恰有一个 `arch.v1.Explainer` 清单并严格解析；
 * sources 为目录中的 Mermaid 源文件（文件名 → 源码），每个都须被清单中的一张图恰好引用一次。
 */
export function parseExplainer(
  manifests: Readonly<Record<string, string>>,
  sources: Readonly<Record<string, string>>,
): ExplainerModel {
  const explainer = parseManifest(manifests);
  const problems: string[] = [];
  const referenced = new Set<string>();
  for (const { title, source } of explainer.figures) {
    if (!title) problems.push(`${source} 缺少标题`);
    if (referenced.has(source)) problems.push(`${source} 被重复引用`);
    else if (!(source in sources)) problems.push(`引用的 ${source} 不存在`);
    referenced.add(source);
  }
  for (const name of Object.keys(sources).sort())
    if (!referenced.has(name)) problems.push(`${name} 未被清单引用`);
  if (problems.length) throw new Error(`示意图数据无效：${problems.join("；")}`);
  return {
    title: explainer.title,
    description: explainer.description,
    figures: explainer.figures.map(({ title, description, source }) => ({
      id: source.slice(0, -EXTENSION.length),
      title,
      description,
      code: sources[source],
    })),
  };
}

function parseManifest(manifests: Readonly<Record<string, string>>): Explainer {
  const paths = Object.keys(manifests);
  if (paths.length !== 1)
    throw new Error(`示意图数据无效：目录中须恰有一个清单，实际为 ${paths.length} 个`);
  try {
    return fromJsonString(ExplainerSchema, manifests[paths[0]]);
  } catch (error) {
    throw new Error(
      `示意图数据无效：${paths[0]}：${error instanceof Error ? error.message : error}`,
    );
  }
}
