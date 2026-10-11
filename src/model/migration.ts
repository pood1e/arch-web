import { fromJsonString } from "@bufbuild/protobuf";
import { MigrationSchema, type Phase } from "@/gen/arch/v1/migration_pb";
import { type ArchitectureModel, Change, isContainer, leavesOf } from "@/model/architecture";

export type { Phase };

/** 迁移路线及其与现状、目标架构的对应关系。 */
export interface MigrationModel {
  title: string;
  phases: Phase[];
  baseline: ArchitectureModel;
  target: ArchitectureModel;
  /** 目标架构叶子节点 → 交付阶段序号。 */
  delivered: Map<string, number>;
  /** 现状架构叶子节点 → 下线阶段序号。 */
  retired: Map<string, number>;
}

/** 节点在迁移路线中的去向。 */
export interface PhaseStep {
  index: number;
  title: string;
  action: "新增" | "改造" | "下线";
}

/** 阶段交付的目标架构叶子节点。 */
export function deliveredLeaves(target: ArchitectureModel, phase: Phase): string[] {
  return [...new Set(phase.nodes.flatMap((id) => leavesOf(target, id)))];
}

/**
 * 节点所在阶段：现状节点下线或随同名目标节点改造，目标节点按其变化新增或改造；
 * 未参与迁移的节点为空。
 */
export function stepOf(
  migration: MigrationModel,
  side: "baseline" | "target",
  id: string,
): PhaseStep | undefined {
  const retired = side === "baseline" ? migration.retired.get(id) : undefined;
  const index = retired ?? migration.delivered.get(id);
  if (index === undefined) return undefined;
  const added = migration.target.nodes.get(id)?.change === Change.ADDED;
  const action = retired !== undefined ? "下线" : added ? "新增" : "改造";
  return { index, title: migration.phases[index].title, action };
}

/** 按 Proto JSON 映射严格解析，并对照两张架构图校验交付与下线各恰好覆盖一次。 */
export function parseMigration(
  json: string,
  baseline: ArchitectureModel,
  target: ArchitectureModel,
): MigrationModel {
  const { title, phases } = fromJsonString(MigrationSchema, json);
  const delivered = new Map<string, number>();
  const retired = new Map<string, number>();
  const problems: string[] = [];
  if (!title || !phases.length) problems.push("缺少标题或阶段");
  phases.forEach((phase, index) => {
    const label = `阶段「${phase.title}」`;
    if (!phase.title || !phase.description || !phase.exitCriteria || !phase.nodes.length)
      problems.push(`${label}缺少标题、目标、交付节点或完成标准`);
    if (phases.findIndex((item) => item.title === phase.title) !== index)
      problems.push(`${label}标题重复`);
    for (const id of phase.nodes) {
      if (!target.nodes.has(id)) {
        problems.push(`${label}引用目标架构未知节点 ${id}`);
        continue;
      }
      for (const leaf of leavesOf(target, id)) {
        if (target.nodes.get(leaf)?.change === Change.UNSPECIFIED)
          problems.push(`${label}交付未改动的节点 ${leaf}`);
        if (delivered.has(leaf)) problems.push(`节点 ${leaf} 交付多次`);
        delivered.set(leaf, index);
      }
    }
    for (const id of phase.retires) {
      const node = baseline.nodes.get(id);
      if (!node || isContainer(node)) problems.push(`${label}下线的 ${id} 不是现状架构叶子节点`);
      else if (target.nodes.has(id)) problems.push(`${label}下线的 ${id} 仍在目标架构中`);
      if (retired.has(id)) problems.push(`节点 ${id} 下线多次`);
      retired.set(id, index);
    }
  });
  for (const node of target.nodes.values())
    if (!isContainer(node) && node.change !== Change.UNSPECIFIED && !delivered.has(node.id))
      problems.push(`节点 ${node.id} 未排入交付阶段`);
  for (const node of baseline.nodes.values())
    if (!isContainer(node) && !target.nodes.has(node.id) && !retired.has(node.id))
      problems.push(`现状节点 ${node.id} 未排入下线阶段`);
  if (problems.length) throw new Error(`迁移路线无效：${problems.join("；")}`);
  return { title, phases, baseline, target, delivered, retired };
}
