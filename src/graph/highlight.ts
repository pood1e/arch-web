import {
  type ArchNode,
  domainLeaves,
  isContainer,
  leavesOf,
  noteLeaves,
} from "@/model/architecture";
import { type DiagramView, isDomainBox, represent } from "@/model/views";

/**
 * 当前聚焦对象：节点（含容器与领域方框）、连线（视图连线或其合并的原始连线）、仓库或要点
 * （id 为要点序号）。
 */
export type Focus =
  | { type: "node"; id: string }
  | { type: "edge"; id: string }
  | { type: "repository"; id: string }
  | { type: "note"; id: string }
  | null;

export interface Highlight {
  nodes: Set<string>;
  edges: Set<string>;
}

/**
 * 节点或容器高亮其全部叶子及直接关联方；仓库与要点只高亮所含组件（折叠时为其领域方框），
 * 关联连线保持可见；连线高亮两端节点。
 */
export function focusHighlight(view: DiagramView, focus: Focus): Highlight | null {
  if (!focus) return null;
  const { model } = view;
  if (focus.type === "edge") {
    const id = model.edges.has(focus.id) ? focus.id : view.bundleOf.get(focus.id);
    const edge = id && model.edges.get(id);
    return id && edge ? { nodes: new Set([edge.source, edge.target]), edges: new Set([id]) } : null;
  }
  const members = focusMembers(view, focus);
  if (!members) return null;
  const highlight: Highlight = { nodes: new Set(members), edges: new Set() };
  for (const [id, edge] of model.edges) {
    if (!members.has(edge.source) && !members.has(edge.target)) continue;
    highlight.edges.add(id);
    if (focus.type === "node") {
      highlight.nodes.add(edge.source);
      highlight.nodes.add(edge.target);
    }
  }
  return highlight;
}

function focusMembers(
  view: DiagramView,
  focus: Exclude<Focus, null | { type: "edge" }>,
): Set<string> | null {
  const { source } = view;
  if (focus.type === "repository")
    return projected(
      view,
      [...source.nodes.values()]
        .filter((node) => !isContainer(node) && node.repository === focus.id)
        .map((node) => node.id),
    );
  if (focus.type === "note") {
    const note = source.notes[Number(focus.id)];
    return note ? projected(view, noteLeaves(source, note)) : null;
  }
  return view.model.nodes.has(focus.id) ? new Set(leavesOf(view.model, focus.id)) : null;
}

function projected(view: DiagramView, leaves: string[]): Set<string> {
  return new Set(leaves.flatMap((leaf) => represent(view, leaf) ?? []));
}

/** 领域方框匹配其名称或任一组件；其余节点匹配 ID、名称、摘要与仓库。 */
export function matchesQuery(view: DiagramView, id: string, query: string): boolean {
  const term = query.trim().toLocaleLowerCase();
  if (!term) return true;
  const ids = isDomainBox(view, id) ? [id, ...domainLeaves(view.source, id)] : [id];
  return ids.some((candidate) => {
    const node = view.model.nodes.get(candidate) ?? view.source.nodes.get(candidate);
    return !!node && nodeMatches(node, term);
  });
}

function nodeMatches(node: ArchNode, term: string): boolean {
  return [node.id, node.title, node.subtitle, node.repository].some((value) =>
    value.toLocaleLowerCase().includes(term),
  );
}
