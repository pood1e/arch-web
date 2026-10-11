import { Handle, type NodeHandle } from "@xyflow/react";

/** 按布局计算的连接点渲染不可见 Handle，连线路径由布局结果直接给出。 */
export function NodeHandles({ handles }: { handles: NodeHandle[] }) {
  return handles.map((handle) => (
    <Handle
      key={handle.id}
      id={handle.id}
      type={handle.type}
      position={handle.position}
      isConnectable={false}
      className="!pointer-events-none !size-px !min-h-0 !min-w-0 !border-0 !bg-transparent !opacity-0"
      style={{ left: handle.x, top: handle.y, right: "auto", bottom: "auto", transform: "none" }}
    />
  ));
}
