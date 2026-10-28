import { create } from "@bufbuild/protobuf";
import { EdgeSchema, NodeSchema } from "@/gen/arch/v1/architecture_pb";
import {
  type ArchEdge,
  type ArchitectureModel,
  type ArchNode,
  ancestors,
  domainLeaves,
  EdgeKind,
  edgeId,
  leavesOf,
  NodeKind,
} from "@/model/architecture";
import { groupOverview } from "@/model/overview";

/**
 * 架构图的一个视图。总览按分类组织领域，默认折叠为方框，标记展开的领域以范围框展示具体组件；
 * 领域视图保留部署容器、实际关联的范围组件与折叠的相邻领域，同类跨领域连线合并。
 * 未划分领域的架构图只有一个完整视图。
 */
export interface DiagramView {
  source: ArchitectureModel;
  /** 展开的领域 ID，总览为空。 */
  scope: string;
  /** 视图中的节点与连线，供布局与渲染使用。 */
  model: ArchitectureModel;
  /** 视图连线 → 其合并的原始连线。 */
  bundles: Map<string, string[]>;
  /** 原始连线 → 所在的视图连线。 */
  bundleOf: Map<string, string>;
}

const MAX_LABEL_TITLES = 3;
/** 总览按领域对合并连线，类型取耦合最强的一种。 */
const KIND_STRENGTH = [EdgeKind.SOUTHBOUND, EdgeKind.REQUEST, EdgeKind.EVENT, EdgeKind.CONFIG];
const views = new WeakMap<ArchitectureModel, Map<string, DiagramView>>();

/** 同一架构与范围只投影一次，保证布局缓存命中；未知范围回落到总览。 */
export function viewOf(source: ArchitectureModel, scope: string): DiagramView {
  const key = source.domains.has(scope) ? scope : "";
  const cached = views.get(source) ?? new Map<string, DiagramView>();
  views.set(source, cached);
  let view = cached.get(key);
  if (!view) {
    view = projectView(source, key);
    cached.set(key, view);
  }
  return view;
}

export function isDomainBox(view: DiagramView, id: string): boolean {
  return view.source.domains.has(id) && view.model.nodes.has(id);
}

/** 原始叶子在视图中的代表：自身或所在领域的方框；不在视图中时为空。 */
export function represent(view: DiagramView, leaf: string): string | undefined {
  if (view.model.nodes.has(leaf)) return leaf;
  const domain = view.source.domainOf.get(leaf);
  return domain && view.model.nodes.has(domain) ? domain : undefined;
}

/** 原始节点所在的范围：领域内节点为其领域，未归属的外部系统与跨领域容器为总览。 */
export function scopeOf(source: ArchitectureModel, id: string): string {
  if (source.domains.has(id)) return id;
  const domains = new Set(leavesOf(source, id).map((leaf) => source.domainOf.get(leaf) ?? ""));
  return domains.size === 1 ? [...domains][0] : "";
}

interface Bundle {
  source: string;
  target: string;
  kind: EdgeKind;
  edges: ArchEdge[];
}

function projectView(source: ArchitectureModel, scope: string): DiagramView {
  const selected = (leaf: string) => !source.domains.size || source.domainOf.get(leaf) === scope;
  const expanded = (leaf: string) =>
    selected(leaf) || !!source.domains.get(source.domainOf.get(leaf) ?? "")?.expanded;
  const endpoint = (leaf: string) => (expanded(leaf) ? leaf : (source.domainOf.get(leaf) ?? leaf));

  const overview = !scope && source.domains.size > 0;
  const frameOf = (leaf: string) => (overview ? source.domainOf.get(leaf) : undefined);
  const bundles = new Map<string, Bundle>();
  for (const [id, edge] of source.edges) {
    if (scope && !selected(edge.source) && !selected(edge.target)) continue;
    const [from, to] = [endpoint(edge.source), endpoint(edge.target)];
    if (from === to) continue;
    const pair = `${from}->${to}`;
    const key =
      from === edge.source && to === edge.target
        ? id
        : overview
          ? pair
          : `${pair}:${EdgeKind[edge.kind]}`;
    const bundle = bundles.get(key) ?? { source: from, target: to, kind: edge.kind, edges: [] };
    bundle.edges.push(edge);
    bundle.kind =
      KIND_STRENGTH.find((kind) => kind === bundle.kind || kind === edge.kind) ?? edge.kind;
    bundles.set(key, bundle);
  }

  const leaves = [...source.nodes.keys()].filter((id) => !source.children.has(id));
  const visible = new Set(
    scope
      ? [...leaves.filter(selected), ...[...bundles.values()].flatMap((b) => [b.source, b.target])]
      : leaves.map(endpoint),
  );
  const boxes = new Map(
    [...new Set([...visible].map((id) => frameOf(id) ?? id))]
      .filter((id) => source.domains.has(id))
      .map((id) => [id, domainBox(source, id, overview)]),
  );
  const framed = new Set(
    [...visible].flatMap((id) => {
      const parent = frameOf(id) ?? (boxes.get(id) ?? source.nodes.get(id))?.parent;
      return parent ? [...ancestors(source, parent).map((node) => node.id), parent] : [];
    }),
  );
  const projected = new Map<string, ArchNode>();
  for (const node of source.nodes.values()) {
    if (source.children.has(node.id)) {
      if (framed.has(node.id)) projected.set(node.id, node);
      continue;
    }
    const id = endpoint(node.id);
    if (visible.has(id) && !projected.has(id)) {
      const frame = boxes.get(frameOf(id) ?? "");
      if (frame) projected.set(frame.id, frame);
      projected.set(id, frame ? { ...node, parent: frame.id, tier: 0 } : (boxes.get(id) ?? node));
    }
  }
  const nodes = overview ? groupOverview(source, projected) : projected;

  const children = new Map<string, ArchNode[]>();
  for (const node of nodes.values())
    if (node.parent) children.set(node.parent, [...(children.get(node.parent) ?? []), node]);
  const edges = new Map(
    [...bundles].map(([key, bundle]): [string, ArchEdge] => [
      key,
      source.edges.has(key) ? bundle.edges[0] : bundleEdge(source, bundle),
    ]),
  );
  const members = new Map([...bundles].map(([key, bundle]) => [key, bundle.edges.map(edgeId)]));
  return {
    source,
    scope,
    model: { ...source, nodes, edges, children },
    bundles: members,
    bundleOf: new Map([...members].flatMap(([key, ids]) => ids.map((id) => [id, key]))),
  };
}

/** 领域详情保留全部组件的最近公共容器；总览按领域分类分组，分层取顶层节点的最小 tier。 */
function domainBox(source: ArchitectureModel, id: string, overview: boolean): ArchNode {
  const domain = source.domains.get(id);
  const leaves = domainLeaves(source, id);
  const chains = leaves.map((leaf) => ancestors(source, leaf));
  const parent = chains[0]?.findLast((node, index) =>
    chains.every((chain) => chain[index]?.id === node.id),
  );
  const tiers = chains.map(
    (chain, index) => (chain[0] ?? source.nodes.get(leaves[index]))?.tier ?? 0,
  );
  return create(NodeSchema, {
    id,
    kind: overview && domain?.expanded ? NodeKind.GROUP : NodeKind.COMPONENT,
    parent: overview ? "" : parent?.id,
    title: domain?.title,
    subtitle: domain?.subtitle,
    icon: domain?.icon,
    description: domain?.description,
    tier: Math.min(...tiers),
  });
}

/** 合并连线：单条沿用原标签，多条列出折叠一侧的组件。 */
function bundleEdge(source: ArchitectureModel, bundle: Bundle): ArchEdge {
  const [first] = bundle.edges;
  const collapsedTarget = first.target !== bundle.target;
  const titles = [
    ...new Set(
      bundle.edges.map((edge) => {
        const end = collapsedTarget ? edge.target : edge.source;
        return source.nodes.get(end)?.title ?? end;
      }),
    ),
  ];
  const label =
    bundle.edges.length === 1
      ? first.label
      : titles.length > MAX_LABEL_TITLES
        ? `${titles.slice(0, MAX_LABEL_TITLES).join(" · ")} 等 ${titles.length} 个`
        : titles.join(" · ");
  return create(EdgeSchema, {
    source: bundle.source,
    target: bundle.target,
    kind: bundle.kind,
    label,
  });
}
