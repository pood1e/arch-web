import type { NodeHandle, XYPosition } from "@xyflow/react";
import { type ArchNode, NodeKind } from "@/model/architecture";

export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface Route {
  sourceHandle: string;
  targetHandle: string;
  path: string;
  label: XYPosition;
}

/** 布局结果：节点绝对坐标、按连线生成的连接点与贝塞尔路径。 */
export interface Geometry {
  boxes: Map<string, Rect>;
  handles: Map<string, NodeHandle[]>;
  routes: Map<string, Route>;
}

export const LEAF_SIZE = { width: 232, height: 52 };
export const FRAME_PADDING = 16;

const FRAME_HEADER: Partial<Record<NodeKind, number>> = {
  [NodeKind.CLUSTER]: 64,
  [NodeKind.NAMESPACE]: 60,
  [NodeKind.GROUP]: 56,
};

export function frameHeader(node: ArchNode): number {
  return FRAME_HEADER[node.kind] ?? 56;
}
