import {
  Background,
  BackgroundVariant,
  type ColorMode,
  Controls,
  MiniMap,
  ReactFlow,
} from "@xyflow/react";
import { FlowEdge } from "@/components/FlowEdge";
import { FrameNode } from "@/components/FrameNode";
import { LeafNode } from "@/components/LeafNode";
import type { ArchFlowEdge, ArchFlowNode, Elements } from "@/graph/elements";
import type { Focus } from "@/graph/highlight";

const NODE_TYPES = { frame: FrameNode, leaf: LeafNode };
const EDGE_TYPES = { flow: FlowEdge };

export function ArchitectureCanvas({
  elements,
  colorMode,
  onInit,
  onSelect,
  onOpen,
  onHover,
}: {
  elements: Elements;
  colorMode: ColorMode;
  onInit: () => void;
  onSelect: (focus: Focus) => void;
  /** 双击节点，用于进入领域。 */
  onOpen: (id: string) => void;
  onHover: (focus: Focus) => void;
}) {
  return (
    <ReactFlow<ArchFlowNode, ArchFlowEdge>
      nodes={elements.nodes}
      edges={elements.edges}
      nodeTypes={NODE_TYPES}
      edgeTypes={EDGE_TYPES}
      colorMode={colorMode}
      onInit={onInit}
      minZoom={0.08}
      maxZoom={2}
      nodesDraggable={false}
      nodesConnectable={false}
      elementsSelectable={false}
      panOnScroll
      // 双击用于进入领域；d3-zoom 的双击缩放会拦截节点上的双击事件。
      zoomOnDoubleClick={false}
      proOptions={{ hideAttribution: true }}
      onNodeClick={(_, node) => onSelect({ type: "node", id: node.id })}
      onNodeDoubleClick={(_, node) => onOpen(node.id)}
      onEdgeClick={(_, edge) => onSelect({ type: "edge", id: edge.id })}
      onPaneClick={() => onSelect(null)}
      onNodeMouseEnter={(_, node) => onHover({ type: "node", id: node.id })}
      onNodeMouseLeave={() => onHover(null)}
      onEdgeMouseEnter={(_, edge) => onHover({ type: "edge", id: edge.id })}
      onEdgeMouseLeave={() => onHover(null)}
    >
      <Background variant={BackgroundVariant.Dots} color="var(--graph-dots)" gap={24} size={1} />
      <Controls showInteractive={false} showFitView={false} position="bottom-left" />
      <MiniMap
        pannable
        zoomable
        position="bottom-right"
        className="!rounded-lg !border !border-border max-sm:!hidden"
        nodeColor={(node) => (node.type === "frame" ? "transparent" : "var(--primary)")}
        nodeStrokeColor={(node) => (node.type === "frame" ? "var(--border)" : "transparent")}
        maskColor="color-mix(in srgb, var(--canvas) 70%, transparent)"
        style={{ backgroundColor: "var(--card)" }}
      />
    </ReactFlow>
  );
}
