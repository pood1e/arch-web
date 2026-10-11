import { getNodesBounds, useReactFlow } from "@xyflow/react";
import { type RefObject, useState } from "react";
import type { Elements } from "@/graph/elements";
import type { Geometry } from "@/layout/geometry";
import { downloadDiagram } from "@/lib/exportImage";
import { type ArchitectureModel, isContainer } from "@/model/architecture";

const FIT_PADDING = 0.03;
const MIN_INITIAL_ZOOM = 0.5;

/** 画布视口操作：首屏、全图、定位节点与导出图片。 */
export function useCanvasActions(
  model: ArchitectureModel,
  geometry: Geometry | null,
  elements: Elements | null,
  canvasRef: RefObject<HTMLDivElement | null>,
) {
  const flow = useReactFlow();
  const [exportError, setExportError] = useState("");

  /**
   * 按宽度适配并顶部对齐，保证组件文字可读；纵向超出部分滚动浏览。
   * 宽度放不下时以数据中首个顶层叶子（系统入口）为水平中心。
   */
  const showInitialView = () => {
    const canvas = canvasRef.current?.getBoundingClientRect();
    if (!canvas || !elements) return;
    const bounds = getNodesBounds(elements.nodes);
    const fitZoom = (canvas.width - 48) / bounds.width;
    const zoom = Math.min(1, Math.max(MIN_INITIAL_ZOOM, fitZoom));
    const entry = [...model.nodes.values()].find((node) => !node.parent && !isContainer(node));
    const entryBox = entry && geometry?.boxes.get(entry.id);
    const centerX =
      fitZoom < MIN_INITIAL_ZOOM && entryBox
        ? entryBox.x + entryBox.width / 2
        : bounds.x + bounds.width / 2;
    const fitsHeight = bounds.height * zoom <= canvas.height - 48;
    void flow.setViewport({
      x: canvas.width / 2 - centerX * zoom,
      y: fitsHeight
        ? (canvas.height - bounds.height * zoom) / 2 - bounds.y * zoom
        : 24 - bounds.y * zoom,
      zoom,
    });
  };

  const fitAll = () => void flow.fitView({ padding: FIT_PADDING, duration: 400 });

  const reveal = (id: string) => {
    const box = geometry?.boxes.get(id);
    const node = model.nodes.get(id);
    if (!box || !node) return;
    if (isContainer(node)) void flow.fitView({ nodes: [{ id }], padding: 0.08, duration: 400 });
    else
      void flow.setCenter(box.x + box.width / 2, box.y + box.height / 2, {
        zoom: Math.max(flow.getZoom(), 0.9),
        duration: 400,
      });
  };

  /** 缩放到一组节点，用于要点与仓库高亮。 */
  const revealAll = (ids: string[]) => {
    if (ids.length)
      void flow.fitView({
        nodes: ids.map((id) => ({ id })),
        padding: 0.12,
        maxZoom: 1,
        duration: 400,
      });
  };

  const exportImage = () => {
    if (!canvasRef.current || !elements) return;
    setExportError("");
    downloadDiagram(canvasRef.current, getNodesBounds(elements.nodes), "architecture").catch(
      (cause: unknown) => setExportError(cause instanceof Error ? cause.message : "导出失败"),
    );
  };

  return { showInitialView, fitAll, reveal, revealAll, exportImage, exportError };
}
