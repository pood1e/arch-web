import { useState } from "react";
import { ArchitectureView, Status, useViewSettings } from "@/components/ArchitectureView";
import { MigrationView } from "@/components/MigrationView";
import { DiagramTabs, ScopeSelect } from "@/components/Toolbar";
import type { Focus } from "@/graph/highlight";
import { useHashRoute } from "@/hooks/useHashRoute";
import { parseArchitecture } from "@/model/architecture";
import { DIAGRAMS, MIGRATION } from "@/model/diagrams";
import { parseMigration, stepOf } from "@/model/migration";
import { scopeOf, viewOf } from "@/model/views";

const LOADED = DIAGRAMS.map(({ id, fragments }) => {
  try {
    return { id, model: parseArchitecture(fragments), error: "" };
  } catch (error) {
    return { id, model: null, error: error instanceof Error ? error.message : "架构数据解析失败" };
  }
});
const diagramOf = (id: string) => LOADED.find((item) => item.id === id)?.model;
const SIDES = { baseline: MIGRATION.baseline, target: MIGRATION.target } as const;
const ROADMAP = (() => {
  const [baseline, target] = [diagramOf(SIDES.baseline), diagramOf(SIDES.target)];
  if (!baseline || !target) return { model: null, error: "迁移路线依赖的架构图解析失败" };
  try {
    return { model: parseMigration(MIGRATION.source, baseline, target), error: "" };
  } catch (error) {
    return { model: null, error: error instanceof Error ? error.message : "迁移路线解析失败" };
  }
})();
/** 标签顺序：现状架构、迁移路线、目标架构。 */
const TABS = [
  ...LOADED.filter((item) => item.id === SIDES.baseline),
  { id: MIGRATION.id, model: { title: ROADMAP.model?.title ?? "迁移路线" } },
  ...LOADED.filter((item) => item.id !== SIDES.baseline),
].map((item) => ({ id: item.id, label: item.model?.title ?? item.id }));
const PAGE_IDS = TABS.map((tab) => tab.id);

/** 按 URL 选择页面、领域或迁移阶段；跨页定位时把待选中的节点带到目标视图。 */
export function App() {
  const [route, navigate] = useHashRoute(PAGE_IDS);
  const [pending, setPending] = useState<{ key: string; focus: Focus }>();
  const settings = useViewSettings();
  const go = (diagram: string, scope: string, focus: Focus = null) => {
    setPending({ key: `${diagram}/${scope}`, focus });
    navigate({ diagram, scope });
  };
  const tabs = (
    <DiagramTabs
      items={TABS}
      active={route.diagram}
      onChange={(id) => navigate({ diagram: id, scope: "" })}
    />
  );
  const roadmap = ROADMAP.model;

  if (route.diagram === MIGRATION.id) {
    if (!roadmap) return <Status message={ROADMAP.error} />;
    return (
      <MigrationView
        migration={roadmap}
        nav={tabs}
        phase={Number(route.scope) || 0}
        phaseHref={(phase) => `#${MIGRATION.id}/${phase}`}
        onOpen={(side, id) => {
          const model = roadmap[side];
          go(SIDES[side], scopeOf(model, id), { type: "node", id });
        }}
      />
    );
  }

  const diagram = LOADED.find((item) => item.id === route.diagram) ?? LOADED[0];
  if (!diagram.model) return <Status message={diagram.error} />;
  const view = viewOf(diagram.model, route.scope);
  const key = `${diagram.id}/${view.scope}`;
  const open = (scope: string, focus: Focus = null) => go(diagram.id, scope, focus);
  const side = diagram.id === SIDES.baseline ? "baseline" : "target";
  const domains = [...view.source.domains.values()];
  const nav = (
    <>
      {tabs}
      {domains.length > 0 && (
        <ScopeSelect
          items={[
            { id: "", label: "领域总览" },
            ...domains.map((domain) => ({ id: domain.id, label: domain.title })),
          ]}
          active={view.scope}
          onChange={open}
        />
      )}
    </>
  );
  return (
    <ArchitectureView
      key={key}
      view={view}
      nav={nav}
      settings={settings}
      initialFocus={pending?.key === key ? pending.focus : null}
      onNavigate={open}
      migration={
        roadmap
          ? {
              stepOf: (id) => stepOf(roadmap, side, id),
              open: (index) => navigate({ diagram: MIGRATION.id, scope: String(index + 1) }),
            }
          : undefined
      }
    />
  );
}
