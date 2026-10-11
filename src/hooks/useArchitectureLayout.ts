import { useEffect, useState } from "react";
import type { Geometry } from "@/layout/geometry";
import { layoutHints } from "@/layout/hints";
import { layoutArchitecture } from "@/layout/layout";
import type { DiagramView } from "@/model/views";

type LayoutState = { geometry: Geometry | null; error: string };

const pending = new WeakMap<DiagramView, Promise<Geometry>>();
const settled = new WeakMap<DiagramView, Geometry>();

/** 每个视图只布局一次，切换回已排布的视图时直接复用结果。 */
function layoutOnce(view: DiagramView): Promise<Geometry> {
  let promise = pending.get(view);
  if (!promise) {
    promise = layoutArchitecture(view.model, layoutHints(view)).then((geometry) => {
      settled.set(view, geometry);
      return geometry;
    });
    promise.catch(() => pending.delete(view));
    pending.set(view, promise);
  }
  return promise;
}

export function useArchitectureLayout(view: DiagramView): LayoutState {
  const [state, setState] = useState<LayoutState>(() => ({
    geometry: settled.get(view) ?? null,
    error: "",
  }));
  useEffect(() => {
    let active = true;
    layoutOnce(view).then(
      (geometry) => active && setState({ geometry, error: "" }),
      (error: unknown) =>
        active &&
        setState({ geometry: null, error: error instanceof Error ? error.message : "布局失败" }),
    );
    return () => {
      active = false;
    };
  }, [view]);
  return state;
}
