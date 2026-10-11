import { getBezierPath, type NodeHandle, Position, type XYPosition } from "@xyflow/react";
import type { Rect, Route } from "@/layout/geometry";
import type { ArchitectureModel } from "@/model/architecture";

/**
 * 以 ELK 分配的端口横坐标为锚点生成贝塞尔连线：目标在下方时自源节点底边连向目标顶边，
 * 目标在上方时反向连接，避免回流连线穿过节点本体。
 */
export function routeEdges(
  model: ArchitectureModel,
  boxes: Map<string, Rect>,
  ports: Map<string, XYPosition>,
): { handles: Map<string, NodeHandle[]>; routes: Map<string, Route> } {
  const handles = new Map<string, NodeHandle[]>();
  const routes = new Map<string, Route>();
  const attach = (
    nodeId: string,
    handleId: string,
    type: NodeHandle["type"],
    position: Position,
    point: XYPosition,
  ) => {
    const box = boxes.get(nodeId);
    if (!box) throw new Error(`节点 ${nodeId} 缺少布局结果`);
    handles.set(nodeId, [
      ...(handles.get(nodeId) ?? []),
      { id: handleId, type, position, x: point.x - box.x, y: point.y - box.y, width: 1, height: 1 },
    ]);
  };

  for (const [id, edge] of model.edges) {
    const sourceBox = boxes.get(edge.source);
    const targetBox = boxes.get(edge.target);
    const sourcePort = ports.get(`${id}:source`);
    const targetPort = ports.get(`${id}:target`);
    if (!sourceBox || !targetBox || !sourcePort || !targetPort)
      throw new Error(`连线 ${id} 缺少布局结果`);
    const upward = targetBox.y + targetBox.height <= sourceBox.y;
    const sourcePosition = upward ? Position.Top : Position.Bottom;
    const targetPosition = upward ? Position.Bottom : Position.Top;
    const source = { x: sourcePort.x, y: upward ? sourceBox.y : sourceBox.y + sourceBox.height };
    const target = { x: targetPort.x, y: upward ? targetBox.y + targetBox.height : targetBox.y };
    const [path, labelX, labelY] = getBezierPath({
      sourceX: source.x,
      sourceY: source.y,
      sourcePosition,
      targetX: target.x,
      targetY: target.y,
      targetPosition,
    });
    attach(edge.source, `${id}:source`, "source", sourcePosition, source);
    attach(edge.target, `${id}:target`, "target", targetPosition, target);
    routes.set(id, {
      sourceHandle: `${id}:source`,
      targetHandle: `${id}:target`,
      path,
      label: { x: labelX, y: labelY },
    });
  }
  return { handles, routes };
}
