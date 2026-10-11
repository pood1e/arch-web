import { create } from "@bufbuild/protobuf";
import { NodeSchema } from "@/gen/arch/v1/architecture_pb";
import {
  type ArchitectureModel,
  type ArchNode,
  DomainCategory,
  NodeKind,
} from "@/model/architecture";

interface Group {
  id: string;
  title: string;
  subtitle: string;
  description: string;
}

const NORTH: Group = {
  id: "overview/external-north",
  title: "外部系统 · 北向",
  subtitle: "调用方",
  description: "系统边界之外、调用本系统的用户、集成系统与研发闭环。",
};
const SOUTH: Group = {
  id: "overview/external-south",
  title: "外部系统 · 南向",
  subtitle: "被调用方",
  description: "系统边界之外、被本系统调用的渠道与服务。",
};
const CATEGORIES: Record<DomainCategory, Group | undefined> = {
  [DomainCategory.UNSPECIFIED]: undefined,
  [DomainCategory.CORE]: {
    id: "overview/core",
    title: "核心领域",
    subtitle: "生产必需",
    description: "生产必需、随产品交付的领域。",
  },
  [DomainCategory.OPTIONAL]: {
    id: "overview/optional",
    title: "可选领域",
    subtitle: "按需部署",
    description: "按需部署的领域，缺失时核心领域仍可工作。",
  },
  [DomainCategory.DEVELOPMENT]: {
    id: "overview/development",
    title: "研发领域",
    subtitle: "非生产",
    description: "非生产环境，不随生产交付。",
  },
};
/** 分组顺序即同一分区内的数据顺序：北向外部、核心、可选、研发、南向外部。 */
const ORDER = [NORTH, ...Object.values(CATEGORIES).flatMap((group) => group ?? []), SOUTH];

/**
 * 领域总览的分组框：领域方框按分类、顶层外部系统按 tier 分为北向与南向；
 * 分组框的 tier 取成员最小值，继续参与纵向分区。
 */
export function groupOverview(
  source: ArchitectureModel,
  nodes: Map<string, ArchNode>,
): Map<string, ArchNode> {
  const assigned = new Map<string, Group>();
  for (const node of nodes.values()) {
    if (node.parent) continue;
    const domain = source.domains.get(node.id);
    const group = domain ? CATEGORIES[domain.category] : node.tier > 0 ? SOUTH : NORTH;
    if (group) assigned.set(node.id, group);
  }
  const grouped = new Map<string, ArchNode>();
  for (const group of ORDER) {
    const tiers = [...assigned]
      .filter(([, member]) => member === group)
      .map(([id]) => nodes.get(id)?.tier ?? 0);
    if (!tiers.length) continue;
    grouped.set(
      group.id,
      create(NodeSchema, {
        id: group.id,
        kind: NodeKind.GROUP,
        title: group.title,
        subtitle: group.subtitle,
        icon: "group",
        description: group.description,
        tier: Math.min(...tiers),
      }),
    );
  }
  for (const node of nodes.values()) {
    const group = assigned.get(node.id);
    grouped.set(node.id, group ? { ...node, parent: group.id, tier: 0 } : node);
  }
  return grouped;
}
