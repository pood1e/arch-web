import clsx from "clsx";
import type { ReactNode } from "react";
import { NodeIcon } from "@/components/NodeIcon";
import { type ArchNode, Change } from "@/model/architecture";
import { deliveredLeaves, type MigrationModel, type Phase } from "@/model/migration";

export type MigrationSide = "baseline" | "target";

export const CHIP_TONES: Partial<Record<Change, string>> = {
  [Change.ADDED]: "border-success/60",
  [Change.REWORKED]: "border-info/60",
};

/** 交付组件按目标架构的领域分组，未归属领域的外部系统排在最后。 */
function deliveryGroups(migration: MigrationModel, phase: Phase) {
  const { target } = migration;
  const leaves = deliveredLeaves(target, phase);
  return [...target.domains.values(), { id: "", title: "外部系统" }]
    .map(({ id, title }) => ({
      title,
      ids: leaves.filter((leaf) => (target.domainOf.get(leaf) ?? "") === id),
    }))
    .filter((group) => group.ids.length);
}

export function NodeChip({
  node,
  retired,
  onClick,
}: {
  node: ArchNode;
  retired?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      title={node.subtitle}
      onClick={onClick}
      className={clsx(
        "inline-flex max-w-full items-center gap-1.5 rounded-md border bg-card px-2 py-0.5 text-[12px] hover:bg-muted",
        (!retired && CHIP_TONES[node.change]) || "border-border",
      )}
    >
      <NodeIcon icon={node.icon} className="size-3.5 shrink-0" />
      <span className={clsx("truncate", retired && "text-muted-foreground line-through")}>
        {node.title}
      </span>
    </button>
  );
}

function Label({ children }: { children: ReactNode }) {
  return <h3 className="mb-1.5 font-medium text-[12px] text-muted-foreground">{children}</h3>;
}

/** 一个迁移阶段：目标与完成标准、按领域分组的交付组件、下线的现状组件。 */
export function PhaseCard({
  migration,
  index,
  active,
  onOpen,
}: {
  migration: MigrationModel;
  index: number;
  active: boolean;
  onOpen: (side: MigrationSide, id: string) => void;
}) {
  const phase = migration.phases[index];
  const groups = deliveryGroups(migration, phase);
  const delivered = groups.reduce((sum, group) => sum + group.ids.length, 0);
  const headingId = `phase-${index + 1}-title`;
  return (
    <li id={`phase-${index + 1}`} className="scroll-mt-4">
      <article
        aria-labelledby={headingId}
        aria-current={active ? "step" : undefined}
        className={clsx(
          "rounded-xl border bg-card p-4 shadow-xs",
          active ? "border-primary/60 ring-2 ring-primary/15" : "border-border",
        )}
      >
        <header className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <span className="grid size-7 shrink-0 place-items-center rounded-full bg-primary font-semibold text-[13px] text-primary-foreground">
            {index + 1}
          </span>
          <h2 id={headingId} className="font-semibold text-[16px]">
            {phase.title}
          </h2>
          <span className="text-[12px] text-muted-foreground">
            交付 {delivered} · 下线 {phase.retires.length}
          </span>
        </header>
        <div className="mt-3 grid gap-4 text-[13px] lg:grid-cols-[minmax(0,1fr)_minmax(0,1.5fr)_minmax(0,0.7fr)]">
          <section>
            <Label>目标</Label>
            <p className="text-foreground/90 leading-relaxed">{phase.description}</p>
            <div className="mt-3">
              <Label>完成标准</Label>
              <p className="text-foreground/90 leading-relaxed">{phase.exitCriteria}</p>
            </div>
          </section>
          <section>
            <Label>交付</Label>
            <dl className="space-y-1.5">
              {groups.map((group) => (
                <div key={group.title} className="flex gap-2">
                  <dt className="w-20 shrink-0 pt-0.5 text-[12px] text-muted-foreground">
                    {group.title}
                  </dt>
                  <dd className="flex min-w-0 flex-wrap gap-1.5">
                    {group.ids.flatMap((id) => {
                      const node = migration.target.nodes.get(id);
                      return node ? (
                        <NodeChip key={id} node={node} onClick={() => onOpen("target", id)} />
                      ) : (
                        []
                      );
                    })}
                  </dd>
                </div>
              ))}
            </dl>
          </section>
          <section>
            <Label>下线</Label>
            {phase.retires.length ? (
              <div className="flex flex-wrap gap-1.5">
                {phase.retires.flatMap((id) => {
                  const node = migration.baseline.nodes.get(id);
                  return node ? (
                    <NodeChip key={id} node={node} retired onClick={() => onOpen("baseline", id)} />
                  ) : (
                    []
                  );
                })}
              </div>
            ) : (
              <p className="text-muted-foreground">无</p>
            )}
          </section>
        </div>
      </article>
    </li>
  );
}
