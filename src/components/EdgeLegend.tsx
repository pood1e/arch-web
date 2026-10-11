import { ChangeBadge } from "@/components/ChangeBadge";
import { EDGE_KIND_LABELS, edgeColor, edgeDash } from "@/graph/elements";
import { Change, EdgeKind } from "@/model/architecture";

const EDGE_KINDS = [EdgeKind.REQUEST, EdgeKind.EVENT, EdgeKind.SOUTHBOUND, EdgeKind.CONFIG];

export function EdgeLegend() {
  return (
    <ul aria-label="图例" className="flex items-center gap-3 text-[12px] text-muted-foreground">
      {EDGE_KINDS.map((kind) => (
        <li key={kind} className="flex items-center gap-1.5">
          <svg width="22" height="8" aria-hidden className="shrink-0">
            <line
              x1="1"
              y1="4"
              x2="21"
              y2="4"
              stroke={edgeColor(kind)}
              strokeWidth="2"
              strokeDasharray={edgeDash(kind)}
            />
          </svg>
          {EDGE_KIND_LABELS[kind]}
        </li>
      ))}
      <li className="flex items-center gap-1 text-[11px] leading-4">
        <ChangeBadge change={Change.ADDED} />
        <ChangeBadge change={Change.REWORKED} />
      </li>
    </ul>
  );
}
