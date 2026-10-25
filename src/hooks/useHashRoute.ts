import { useEffect, useState } from "react";

/** URL hash 形如 `#<页面>` 或 `#<页面>/<领域、阶段或示意图>`。 */
export interface Route {
  diagram: string;
  scope: string;
}

/** 以 URL hash 记录当前页面与页内位置，支持直达链接与浏览器前进后退。 */
export function useHashRoute(diagrams: readonly string[]): [Route, (route: Route) => void] {
  const [route, setRoute] = useState(() => parse(diagrams));
  useEffect(() => {
    const onChange = () => setRoute(parse(diagrams));
    window.addEventListener("hashchange", onChange);
    return () => window.removeEventListener("hashchange", onChange);
  }, [diagrams]);
  return [
    route,
    ({ diagram, scope }) => {
      window.location.hash = scope ? `${diagram}/${scope}` : diagram;
    },
  ];
}

function parse(diagrams: readonly string[]): Route {
  const [diagram = "", scope = ""] = decodeURIComponent(window.location.hash.slice(1)).split("/");
  return diagrams.includes(diagram) ? { diagram, scope } : { diagram: diagrams[0], scope: "" };
}
