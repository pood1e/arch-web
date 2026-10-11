import type { XYPosition } from "@xyflow/react";
import ELK, { type ElkNode, type ElkPort } from "elkjs/lib/elk-api.js";
import elkWorkerUrl from "elkjs/lib/elk-worker.min.js?url";
import { FRAME_PADDING, frameHeader, type Geometry, LEAF_SIZE, type Rect } from "@/layout/geometry";
import type { LayoutHints } from "@/layout/hints";
import { routeEdges } from "@/layout/routes";
import type { ArchitectureModel, ArchNode } from "@/model/architecture";

const LAYOUT_OPTIONS = {
  "elk.algorithm": "layered",
  "elk.direction": "DOWN",
  "elk.hierarchyHandling": "INCLUDE_CHILDREN",
  "elk.edgeRouting": "ORTHOGONAL",
  "elk.spacing.nodeNode": "24",
  "elk.layered.spacing.nodeNodeBetweenLayers": "40",
  "elk.layered.spacing.edgeNodeBetweenLayers": "8",
  "elk.layered.spacing.edgeEdgeBetweenLayers": "4",
  "elk.layered.nodePlacement.strategy": "NETWORK_SIMPLEX",
  // 按调用条数加权贪心打破环路：调用越多的方向越优先朝下，调用方排在被调用方之上。
  "elk.layered.cycleBreaking.strategy": "GREEDY",
};

/**
 * 在 ELK Web Worker 中执行分层布局，嵌套容器与跨层级连线一并参与排布；
 * 服务调用与设备南向决定上下次序，异步事件与配置加载不参与定向。
 */
export async function layoutArchitecture(
  model: ArchitectureModel,
  { partitions, callWeights }: LayoutHints,
): Promise<Geometry> {
  const ports = new Map<string, ElkPort[]>();
  const addPort = (nodeId: string, portId: string, side: "NORTH" | "SOUTH") =>
    ports.set(nodeId, [
      ...(ports.get(nodeId) ?? []),
      { id: portId, width: 0, height: 0, layoutOptions: { "elk.port.side": side } },
    ]);
  for (const [id, edge] of model.edges) {
    addPort(edge.source, `${id}:source`, "SOUTH");
    addPort(edge.target, `${id}:target`, "NORTH");
  }

  const declare = (node: ArchNode): ElkNode => {
    const children = model.children.get(node.id);
    if (!children)
      return {
        id: node.id,
        ...LEAF_SIZE,
        ports: ports.get(node.id),
        layoutOptions: { "elk.portConstraints": "FIXED_SIDE" },
      };
    return {
      id: node.id,
      children: children.map(declare),
      layoutOptions: {
        "elk.padding": `[top=${frameHeader(node)},left=${FRAME_PADDING},bottom=${FRAME_PADDING},right=${FRAME_PADDING}]`,
      },
    };
  };

  // 分区只约束根层：总览按 tier，领域视图按与本领域的调用方向；嵌套容器仍按连线分层。
  const roots = [...model.nodes.values()].filter((node) => !node.parent);
  const partitioned = partitions.size > 0;
  const elk = new ELK({ workerUrl: elkWorkerUrl, defaultLayoutOptions: LAYOUT_OPTIONS });
  try {
    const result = await elk.layout({
      id: "root",
      children: roots.map((node) => {
        const declared = declare(node);
        if (partitioned)
          declared.layoutOptions = {
            ...declared.layoutOptions,
            "elk.partitioning.partition": String(partitions.get(node.id) ?? 0),
          };
        return declared;
      }),
      edges: [...model.edges.keys()].map((id) => {
        const calls = callWeights.get(id) ?? 0;
        return {
          id,
          sources: [`${id}:source`],
          targets: [`${id}:target`],
          layoutOptions: {
            "elk.layered.priority.direction": String(calls * 10),
            "elk.layered.priority.shortness": String(calls),
          },
        };
      }),
      layoutOptions: {
        "elk.padding": "[top=32,left=32,bottom=32,right=32]",
        ...(partitioned ? { "elk.partitioning.activate": "true" } : {}),
      },
    });
    const boxes = new Map<string, Rect>();
    const endpoints = new Map<string, XYPosition>();
    const flatten = (node: ElkNode, origin: XYPosition) => {
      const box = {
        x: origin.x + (node.x ?? 0),
        y: origin.y + (node.y ?? 0),
        width: node.width ?? 0,
        height: node.height ?? 0,
      };
      boxes.set(node.id, box);
      for (const port of node.ports ?? [])
        endpoints.set(port.id, { x: box.x + (port.x ?? 0), y: box.y + (port.y ?? 0) });
      for (const child of node.children ?? []) flatten(child, box);
    };
    for (const node of result.children ?? []) flatten(node, { x: 0, y: 0 });
    return { boxes, ...routeEdges(model, boxes, endpoints) };
  } finally {
    elk.terminateWorker();
  }
}
