import { EdgeKind } from "@/model/architecture";
import type { DiagramView } from "@/model/views";

const CALL_KINDS = new Set([EdgeKind.REQUEST, EdgeKind.SOUTHBOUND]);
/** 分区按 tier 分段，同段内上游调用方、本领域、下游被调用方依次排列。 */
const BAND = 10;
const CALLERS = 0;
const FOCUS = 5;
const CALLEES = 7;

/** 按服务调用关系约束布局：调用方在上、被调用方在下。 */
export interface LayoutHints {
  /** 根层节点的纵向分区，数值小的在上；为空时不启用分区。 */
  partitions: Map<string, number>;
  /** 视图连线代表的服务调用与设备南向条数；异步事件与配置加载不计。 */
  callWeights: Map<string, number>;
}

export function layoutHints(view: DiagramView): LayoutHints {
  const { model, source } = view;
  const callWeights = new Map(
    [...model.edges.keys()].map((id): [string, number] => {
      const members = view.bundles.get(id) ?? [id];
      const calls = members.filter((raw) => {
        const edge = source.edges.get(raw);
        return !!edge && CALL_KINDS.has(edge.kind);
      });
      return [id, calls.length];
    }),
  );
  return {
    partitions: view.scope ? focusPartitions(view, callWeights) : tierPartitions(view),
    callWeights,
  };
}

/** 总览与未划分领域的图沿用顶层 tier：北向入口在上，设备与外部投递在下。 */
function tierPartitions({ model }: DiagramView): Map<string, number> {
  const roots = [...model.nodes.values()].filter((node) => !node.parent);
  if (!roots.some((node) => node.tier > 0)) return new Map();
  return new Map(roots.map((node) => [node.id, node.tier]));
}

/**
 * 领域视图以本领域为中轴：调用本领域多于被其调用的相邻领域与外部系统排在本领域之上，反之排在之下；
 * 双向调用持平时视为上游。本领域跨多个 tier 时（如采集与被管设备），被调用方夹在主体与更低 tier 之间。
 */
function focusPartitions(view: DiagramView, callWeights: Map<string, number>): Map<string, number> {
  const { model, source, scope } = view;
  const rootOf = (id: string): string => {
    let node = model.nodes.get(id);
    while (node?.parent) node = model.nodes.get(node.parent);
    return node?.id ?? id;
  };
  const focus = new Set(
    [...source.domainOf].flatMap(([leaf, domain]) =>
      domain === scope && model.nodes.has(leaf) ? [rootOf(leaf)] : [],
    ),
  );
  const inbound = new Map<string, number>();
  const outbound = new Map<string, number>();
  for (const [id, edge] of model.edges) {
    const weight = callWeights.get(id) ?? 0;
    const [from, to] = [rootOf(edge.source), rootOf(edge.target)];
    if (!weight || focus.has(from) === focus.has(to)) continue;
    const [neighbour, counter] = focus.has(to) ? [from, inbound] : [to, outbound];
    counter.set(neighbour, (counter.get(neighbour) ?? 0) + weight);
  }
  const roots = [...model.nodes.values()].filter((node) => !node.parent);
  const main = Math.min(...roots.filter((node) => focus.has(node.id)).map((node) => node.tier));
  const band = (tier: number, offset: number) => tier * BAND + offset;
  return new Map(
    roots.map((node): [string, number] => {
      if (focus.has(node.id)) return [node.id, band(node.tier, FOCUS)];
      const calls = inbound.get(node.id) ?? 0;
      const called = outbound.get(node.id) ?? 0;
      if (calls > 0 && calls >= called) return [node.id, band(main, CALLERS)];
      if (called > 0) return [node.id, band(main, CALLEES)];
      if (node.tier < main) return [node.id, band(main, CALLERS)];
      return [node.id, node.tier === main ? band(main, FOCUS) : band(node.tier, CALLEES)];
    }),
  );
}
