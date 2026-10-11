import { type Edge, MarkerType, type Node, type NodeHandle } from "@xyflow/react";
import { type Highlight, matchesQuery } from "@/graph/highlight";
import type { Geometry, Route } from "@/layout/geometry";
import {
  type ArchEdge,
  type ArchNode,
  ancestors,
  domainLeaves,
  EdgeKind,
  isContainer,
  type Repository,
} from "@/model/architecture";
import { type DiagramView, isDomainBox } from "@/model/views";

export interface ArchNodeData extends Record<string, unknown> {
  node: ArchNode;
  /** 与最近一级声明仓库的容器不同时才展示来源仓库。 */
  repository?: Repository;
  /** 折叠为方框的领域所含组件数。 */
  members?: number;
  handles: NodeHandle[];
  dimmed: boolean;
}

export type FrameFlowNode = Node<ArchNodeData, "frame">;
export type LeafFlowNode = Node<ArchNodeData, "leaf">;
export type ArchFlowNode = FrameFlowNode | LeafFlowNode;
export type ArchFlowEdge = Edge<{ edge: ArchEdge; route: Route }, "flow">;
export interface Elements {
  nodes: ArchFlowNode[];
  edges: ArchFlowEdge[];
}

const EDGE_COLORS: Record<EdgeKind, string> = {
  [EdgeKind.UNSPECIFIED]: "var(--muted-foreground)",
  [EdgeKind.REQUEST]: "var(--info)",
  [EdgeKind.SOUTHBOUND]: "var(--warning)",
  [EdgeKind.CONFIG]: "var(--violet)",
  [EdgeKind.EVENT]: "var(--success)",
};

export const EDGE_KIND_LABELS: Partial<Record<EdgeKind, string>> = {
  [EdgeKind.REQUEST]: "服务调用",
  [EdgeKind.EVENT]: "异步事件",
  [EdgeKind.SOUTHBOUND]: "设备南向",
  [EdgeKind.CONFIG]: "配置加载",
};

export function edgeColor(kind: EdgeKind): string {
  return EDGE_COLORS[kind];
}

export function edgeDash(kind: EdgeKind): string | undefined {
  if (kind === EdgeKind.CONFIG) return "2 4";
  return kind === EdgeKind.EVENT ? "8 4" : undefined;
}

/** 由布局结果生成 React Flow 元素；容器按嵌套深度分层，叶子与连线位于容器之上。 */
export function buildElements(view: DiagramView, geometry: Geometry): Elements {
  const { model } = view;
  const nodes = [...model.nodes.values()].map((node): ArchFlowNode => {
    const box = geometry.boxes.get(node.id);
    if (!box) throw new Error(`节点 ${node.id} 缺少布局结果`);
    const container = isContainer(node);
    const handles = geometry.handles.get(node.id) ?? [];
    const chain = ancestors(model, node.id);
    const inherited = chain.findLast((ancestor) => ancestor.repository)?.repository;
    const repository =
      node.repository !== inherited ? model.repositories.get(node.repository) : undefined;
    return {
      id: node.id,
      type: container ? "frame" : "leaf",
      position: { x: box.x, y: box.y },
      width: box.width,
      height: box.height,
      // 尺寸来自布局；显式给出可避免节点对象替换后 React Flow 等待重新测量。
      measured: { width: box.width, height: box.height },
      handles,
      data: {
        node,
        repository,
        members: isDomainBox(view, node.id) ? domainLeaves(view.source, node.id).length : undefined,
        handles,
        dimmed: false,
      },
      zIndex: container ? chain.length : 20,
      draggable: false,
      style: { pointerEvents: "none" },
    };
  });
  const edges = [...model.edges].map(([id, edge]): ArchFlowEdge => {
    const route = geometry.routes.get(id);
    if (!route) throw new Error(`连线 ${id} 缺少布局结果`);
    const color = edgeColor(edge.kind);
    return {
      id,
      type: "flow",
      source: edge.source,
      target: edge.target,
      sourceHandle: route.sourceHandle,
      targetHandle: route.targetHandle,
      data: { edge, route },
      zIndex: 10,
      markerEnd: { type: MarkerType.ArrowClosed, color, width: 14, height: 14 },
      style: { stroke: color, strokeWidth: 1.4, strokeDasharray: edgeDash(edge.kind) },
    };
  });
  return { nodes: nodes.sort((a, b) => (a.zIndex ?? 0) - (b.zIndex ?? 0)), edges };
}

/** 叠加选中、搜索、聚焦与连线显隐状态；聚焦连线显示标签，其余连线淡化或隐藏。 */
export function decorateElements(
  elements: Elements,
  view: DiagramView,
  state: { selectedId?: string; highlight: Highlight | null; query: string; showAllEdges: boolean },
): Elements {
  const { selectedId, highlight, query, showAllEdges } = state;
  const matched = (id: string) => matchesQuery(view, id, query);
  const nodes = elements.nodes.map((node): ArchFlowNode => {
    const selected = node.id === selectedId;
    if (node.type === "frame") return selected ? { ...node, selected } : node;
    const dimmed = !matched(node.id) || (!!highlight && !highlight.nodes.has(node.id));
    return { ...node, selected, data: { ...node.data, dimmed } };
  });
  const edges = elements.edges.flatMap((edge) => {
    const focused = highlight?.edges.has(edge.id) ?? false;
    if (!focused && !showAllEdges) return [];
    const faded = (!!highlight && !focused) || !(matched(edge.source) || matched(edge.target));
    return [
      {
        ...edge,
        label: focused ? edge.data?.edge.label : undefined,
        style: {
          ...edge.style,
          opacity: focused ? 1 : faded ? 0.07 : 0.4,
          strokeWidth: focused ? 2.2 : 1.4,
        },
      },
    ];
  });
  return { nodes, edges };
}
