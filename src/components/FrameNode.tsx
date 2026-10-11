import type { NodeProps } from "@xyflow/react";
import clsx from "clsx";
import { memo } from "react";
import { ChangeBadge } from "@/components/ChangeBadge";
import { NodeIcon } from "@/components/NodeIcon";
import type { FrameFlowNode } from "@/graph/elements";
import { NodeKind } from "@/model/architecture";

const TONES: Partial<Record<NodeKind, string>> = {
  [NodeKind.CLUSTER]: "border-primary/45 bg-primary/[0.025] text-primary",
  [NodeKind.NAMESPACE]: "border-violet/45 bg-violet/[0.035] text-violet",
  [NodeKind.GROUP]: "border-info/45 bg-info/[0.04] text-info",
};

function FrameNodeView({ data, selected }: NodeProps<FrameFlowNode>) {
  const { node, repository } = data;
  return (
    <div
      className={clsx(
        "size-full rounded-[28px] border border-dashed",
        TONES[node.kind],
        selected && "border-solid",
      )}
    >
      <div
        className="pointer-events-auto absolute top-3 left-4 flex max-w-[calc(100%-2rem)] cursor-pointer flex-col items-start gap-0.5"
        title={node.description}
      >
        <span className="flex max-w-full items-center gap-1.5 rounded-md bg-card px-2 py-0.5 font-semibold text-[12px] shadow-xs">
          <NodeIcon icon={node.icon} className="size-4 shrink-0" />
          <span className="truncate">{node.title}</span>
          <ChangeBadge change={node.change} className="font-normal text-[10px] leading-4" />
        </span>
        <span className="max-w-full truncate pl-1 text-[11px] text-muted-foreground">
          {[node.subtitle, repository?.id].filter(Boolean).join(" · ")}
        </span>
      </div>
    </div>
  );
}

export const FrameNode = memo(FrameNodeView);
