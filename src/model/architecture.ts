import { fromJsonString } from "@bufbuild/protobuf";
import {
  type Edge as ArchEdge,
  type Architecture,
  ArchitectureSchema,
  type Node as ArchNode,
  Change,
  type Domain,
  DomainCategory,
  EdgeKind,
  NodeKind,
  type Note,
  type Repository,
} from "@/gen/arch/v1/architecture_pb";

export type { ArchEdge, ArchNode, Domain, Note, Repository };
export { Change, DomainCategory, EdgeKind, NodeKind };

const CONTAINER_KINDS = new Set([NodeKind.CLUSTER, NodeKind.NAMESPACE, NodeKind.GROUP]);

/** 解析后的架构图及查询索引。 */
export interface ArchitectureModel {
  title: string;
  baseline: string;
  nodes: Map<string, ArchNode>;
  edges: Map<string, ArchEdge>;
  children: Map<string, ArchNode[]>;
  repositories: Map<string, Repository>;
  notes: Note[];
  domains: Map<string, Domain>;
  /** 叶子节点 → 所属领域 ID；未划分领域及未声明归属的外部系统为空。 */
  domainOf: Map<string, string>;
}

export function isContainer(node: ArchNode): boolean {
  return CONTAINER_KINDS.has(node.kind);
}

export function edgeId({ source, target }: Pick<ArchEdge, "source" | "target">): string {
  return `${source}->${target}`;
}

/** 自顶层到直接父节点的容器链。 */
export function ancestors(model: ArchitectureModel, id: string): ArchNode[] {
  const chain: ArchNode[] = [];
  for (let node = model.nodes.get(id); node?.parent; ) {
    node = model.nodes.get(node.parent);
    if (node) chain.unshift(node);
  }
  return chain;
}

/** 节点自身（叶子）或其全部后代叶子。 */
export function leavesOf(model: ArchitectureModel, id: string): string[] {
  const children = model.children.get(id);
  return children ? children.flatMap((child) => leavesOf(model, child.id)) : [id];
}

/** 领域内的全部叶子节点，按数据顺序。 */
export function domainLeaves(model: ArchitectureModel, domainId: string): string[] {
  return [...model.domainOf].filter(([, id]) => id === domainId).map(([leaf]) => leaf);
}

/** 要点涉及的全部叶子节点。 */
export function noteLeaves(model: ArchitectureModel, note: Note): string[] {
  return [...new Set(note.nodes.flatMap((id) => leavesOf(model, id)))];
}

/** 仓库或仓库内路径的 Web 地址；规划中的仓库没有地址。 */
export function sourceUrl(repository: Repository, path: string): string {
  if (!repository.url || !path) return repository.url;
  return `${repository.url}/-/tree/${repository.branch}/${path}`;
}

/** 按 Proto JSON 映射严格解析（拒绝未知字段与非法枚举），再校验引用完整性。 */
export function parseArchitecture(json: string): ArchitectureModel {
  const architecture = fromJsonString(ArchitectureSchema, json);
  const model = indexArchitecture(architecture);
  const problems = validateArchitecture(architecture, model);
  if (problems.length) throw new Error(`架构数据无效：${problems.join("；")}`);
  return model;
}

function indexArchitecture(architecture: Architecture): ArchitectureModel {
  const children = new Map<string, ArchNode[]>();
  for (const node of architecture.nodes) {
    if (node.parent) children.set(node.parent, [...(children.get(node.parent) ?? []), node]);
  }
  const nodes = new Map(architecture.nodes.map((node) => [node.id, node]));
  const domainOf = new Map<string, string>();
  for (const node of architecture.nodes) {
    const domain = !children.has(node.id) && declaredDomain(nodes, node.id);
    if (domain) domainOf.set(node.id, domain);
  }
  return {
    title: architecture.title,
    baseline: architecture.baseline,
    nodes,
    edges: new Map(architecture.edges.map((edge) => [edgeId(edge), edge])),
    children,
    repositories: new Map(
      architecture.repositories.map((repository) => [repository.id, repository]),
    ),
    notes: architecture.notes,
    domains: new Map(architecture.domains.map((domain) => [domain.id, domain])),
    domainOf,
  };
}

/** 节点自身或最近一级祖先声明的领域；遇到 parent 环时停止。 */
function declaredDomain(nodes: Map<string, ArchNode>, id: string): string {
  const seen = new Set<string>();
  for (let node = nodes.get(id); node && !seen.has(node.id); node = nodes.get(node.parent)) {
    if (node.domain) return node.domain;
    seen.add(node.id);
  }
  return "";
}

function duplicates(ids: string[]): string[] {
  return [...new Set(ids.filter((id, index) => ids.indexOf(id) !== index))];
}

function validateArchitecture(architecture: Architecture, model: ArchitectureModel): string[] {
  const problems = [
    ...duplicates(architecture.repositories.map((repository) => repository.id)).map(
      (id) => `仓库 ${id} 重复`,
    ),
    ...duplicates(architecture.nodes.map((node) => node.id)).map((id) => `节点 ${id} 重复`),
    ...duplicates(architecture.edges.map(edgeId)).map((id) => `连线 ${id} 重复`),
    ...validateDomains(architecture, model),
  ];
  for (const node of architecture.nodes) problems.push(...validateNode(model, node));
  for (const edge of architecture.edges) problems.push(...validateEdge(model, edge));
  for (const note of architecture.notes) {
    if (!note.title || !note.nodes.length) problems.push(`要点「${note.title}」缺少标题或节点`);
    for (const id of note.nodes)
      if (!model.nodes.has(id)) problems.push(`要点「${note.title}」引用未知节点 ${id}`);
  }
  return problems;
}

function validateNode(model: ArchitectureModel, node: ArchNode): string[] {
  const problems: string[] = [];
  if (!node.id) problems.push("存在缺少 ID 的节点");
  if (node.kind === NodeKind.UNSPECIFIED) problems.push(`节点 ${node.id} 缺少 kind`);
  if (node.repository && !model.repositories.has(node.repository))
    problems.push(`节点 ${node.id} 引用未知仓库 ${node.repository}`);
  if (isContainer(node) !== model.children.has(node.id))
    problems.push(`节点 ${node.id} 的子节点与 kind 不一致`);
  if (node.parent) {
    const parent = model.nodes.get(node.parent);
    if (!parent || !isContainer(parent))
      problems.push(`节点 ${node.id} 的 parent ${node.parent} 不是容器节点`);
    if (node.tier) problems.push(`节点 ${node.id} 不是顶层节点，不能设置 tier`);
  }
  const visited = new Set([node.id]);
  for (let parent = model.nodes.get(node.parent); parent; parent = model.nodes.get(parent.parent)) {
    if (visited.has(parent.id)) {
      problems.push(`节点 ${node.id} 的 parent 存在环`);
      break;
    }
    visited.add(parent.id);
  }
  return problems;
}

/** 声明领域后，内部叶子节点必须归属一个领域，外部系统可按场景归属，领域不嵌套。 */
function validateDomains(architecture: Architecture, model: ArchitectureModel): string[] {
  const problems = duplicates(architecture.domains.map((domain) => domain.id)).map(
    (id) => `领域 ${id} 重复`,
  );
  for (const domain of architecture.domains) {
    if (!domain.id || !domain.title) problems.push(`领域 ${domain.id} 缺少 ID 或标题`);
    if (domain.category === DomainCategory.UNSPECIFIED) problems.push(`领域 ${domain.id} 缺少分类`);
    if (model.nodes.has(domain.id)) problems.push(`领域 ${domain.id} 与节点 ID 重复`);
    if (!domainLeaves(model, domain.id).length) problems.push(`领域 ${domain.id} 没有节点`);
  }
  for (const node of architecture.nodes) {
    if (!node.domain) continue;
    if (!model.domains.has(node.domain))
      problems.push(`节点 ${node.id} 引用未知领域 ${node.domain}`);
    const parent = model.nodes.get(node.parent);
    if (parent && declaredDomain(model.nodes, parent.id))
      problems.push(`节点 ${node.id} 与祖先节点重复声明领域`);
  }
  if (!architecture.domains.length) return problems;
  for (const node of architecture.nodes) {
    if (model.children.has(node.id)) continue;
    if (node.kind !== NodeKind.EXTERNAL && !model.domainOf.has(node.id))
      problems.push(`节点 ${node.id} 未归属领域`);
  }
  return problems;
}

function validateEdge(model: ArchitectureModel, edge: ArchEdge): string[] {
  const problems: string[] = [];
  const id = edgeId(edge);
  if (edge.kind === EdgeKind.UNSPECIFIED) problems.push(`连线 ${id} 缺少 kind`);
  if (edge.source === edge.target) problems.push(`连线 ${id} 首尾相同`);
  for (const end of [edge.source, edge.target]) {
    const node = model.nodes.get(end);
    if (!node || isContainer(node)) problems.push(`连线 ${id} 的端点 ${end} 不是叶子节点`);
  }
  return problems;
}
