import { BaseEdge, type EdgeProps } from "@xyflow/react";
import type { ArchFlowEdge } from "@/graph/elements";

export function FlowEdge({
  id,
  data,
  style,
  markerEnd,
  label,
  interactionWidth,
}: EdgeProps<ArchFlowEdge>) {
  if (!data) return null;
  return (
    <BaseEdge
      id={id}
      path={data.route.path}
      style={style}
      markerEnd={markerEnd}
      interactionWidth={interactionWidth}
      label={label}
      labelX={data.route.label.x}
      labelY={data.route.label.y}
      labelStyle={{ fill: "var(--foreground)", fontSize: 11, fontWeight: 600 }}
      labelBgStyle={{ fill: "var(--card)", fillOpacity: 0.96 }}
      labelBgPadding={[6, 3]}
      labelBgBorderRadius={4}
    />
  );
}
