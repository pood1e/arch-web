import type { NodeProps } from "@xyflow/react";
import clsx from "clsx";
import { memo } from "react";
import { ChangeBadge } from "@/components/ChangeBadge";
import { NodeHandles } from "@/components/NodeHandles";
import { NodeIcon } from "@/components/NodeIcon";
import type { LeafFlowNode } from "@/graph/elements";
import { Change, NodeKind } from "@/model/architecture";

const SHAPES: Partial<Record<NodeKind, string>> = {
  [NodeKind.COMPONENT]: "rounded-full border-foreground/25",
  [NodeKind.EXTERNAL]: "rounded-2xl border-primary/60",
  [NodeKind.ARTIFACT]: "rounded-lg border-dashed border-violet/70",
};
/** 折叠的领域：双层边框示意其内含节点，双击进入领域视图。 */
const DOMAIN_SHAPE = "rounded-xl border-info/60 outline-1 outline-info/35 outline-offset-3";

function LeafNodeView({ data, selected }: NodeProps<LeafFlowNode>) {
  const { node, repository, members } = data;
  const domain = members !== undefined;
  return (
    <div
      className={clsx(
        "relative size-full transition-opacity duration-200",
        data.dimmed && "opacity-20",
      )}
      title={node.description}
    >
      <NodeHandles handles={data.handles} />
      <div
        className={clsx(
          "pointer-events-auto flex size-full cursor-pointer items-center gap-2.5 border bg-surface pr-4 pl-2.5 shadow-md",
          domain ? DOMAIN_SHAPE : SHAPES[node.kind],
          node.change === Change.ADDED && "!border-success/70 border-dashed",
          selected && "ring-2 ring-primary/60 ring-offset-2 ring-offset-canvas",
        )}
      >
        <span className="grid size-8 shrink-0 place-items-center rounded-full bg-card text-foreground/80">
          <NodeIcon icon={node.icon} className="size-[18px]" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate font-semibold text-[13px] leading-tight">
            {node.title}
          </span>
          <span className="mt-0.5 block truncate text-[11px] text-muted-foreground leading-tight">
            {node.subtitle}
          </span>
        </span>
      </div>
      <span className="pointer-events-none absolute -top-2 right-5 flex gap-1 text-[10px] leading-4">
        <ChangeBadge change={node.change} />
        {domain && (
          <span className="rounded-full border border-info/50 bg-card px-1.5 text-info">
            {members} 个节点
          </span>
        )}
        {repository && (
          <span className="rounded-full border border-border bg-card px-1.5 text-muted-foreground">
            {repository.id}
          </span>
        )}
      </span>
    </div>
  );
}

export const LeafNode = memo(LeafNodeView);
