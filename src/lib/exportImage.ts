import type { Rect } from "@xyflow/react";

const PADDING = 48;
const MAX_SIDE = 8192;
const MAX_PIXELS = 40_000_000;

/** 按全部节点边界以 1:1 视口导出 PNG，像素比受浏览器画布上限约束。 */
export async function downloadDiagram(canvas: HTMLElement, bounds: Rect, name: string) {
  const viewport = canvas.querySelector<HTMLElement>(".react-flow__viewport");
  if (!viewport || !bounds.width || !bounds.height) throw new Error("画布尚未就绪");
  const width = Math.ceil(bounds.width + PADDING * 2);
  const height = Math.ceil(bounds.height + PADDING * 2);
  const { toBlob } = await import("html-to-image");
  const blob = await toBlob(viewport, {
    width,
    height,
    pixelRatio: Math.min(
      2,
      MAX_SIDE / Math.max(width, height),
      Math.sqrt(MAX_PIXELS / (width * height)),
    ),
    backgroundColor: getComputedStyle(canvas).backgroundColor,
    style: {
      width: `${width}px`,
      height: `${height}px`,
      transform: `translate(${PADDING - bounds.x}px, ${PADDING - bounds.y}px) scale(1)`,
      transformOrigin: "top left",
    },
  });
  if (!blob) throw new Error("PNG 编码失败");
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `${name}-${new Date().toISOString().slice(0, 10)}.png`;
  anchor.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}
