import { useState } from "react";
import { ArchitectureView, Status, useViewSettings } from "@/components/ArchitectureView";
import { ExplainerView } from "@/components/ExplainerView";
import { MigrationView } from "@/components/MigrationView";
import { DiagramTabs, ScopeSelect } from "@/components/Toolbar";
import type { Focus } from "@/graph/highlight";
import { useHashRoute } from "@/hooks/useHashRoute";
import { parseArchitecture } from "@/model/architecture";
import { DIAGRAMS, EXPLAINERS, MIGRATIONS, PAGES, type Page } from "@/model/diagrams";
import { parseExplainer } from "@/model/explainer";
import { parseMigration, stepOf } from "@/model/migration";
import { scopeOf, viewOf } from "@/model/views";

/** 解析失败的页面保留错误信息，打开时显示。 */
function load<T>(id: string, parse: () => T, fallback: string) {
  try {
    return { id, model: parse(), error: "" };
  } catch (error) {
    return { id, model: null, error: error instanceof Error ? error.message : fallback };
  }
}

const LOADED = DIAGRAMS.map(({ id, fragments }) =>
  load(id, () => parseArchitecture(fragments), "架构数据解析失败"),
);
const diagramOf = (id: string) => LOADED.find((item) => item.id === id)?.model ?? undefined;
const ROADMAPS = MIGRATIONS.map(({ id, source }) =>
  load(id, () => parseMigration(source, diagramOf), "迁移路线解析失败"),
);
const EXPLAINED = EXPLAINERS.map(({ id, manifests, sources }) =>
  load(id, () => parseExplainer(manifests, sources), "示意图数据解析失败"),
);
const TITLES: Record<Page["kind"], (id: string) => string | undefined> = {
  diagram: (id) => diagramOf(id)?.title,
  explainer: (id) => EXPLAINED.find((item) => item.id === id)?.model?.title,
  migration: (id) => ROADMAPS.find((item) => item.id === id)?.model?.title,
};
/** 标签顺序见 PAGES：迁移路线连同起点与终点在前，其余页面在后。 */
const TABS = PAGES.map(({ id, kind }) => ({ id, label: TITLES[kind](id) || id }));
const PAGE_IDS = TABS.map((tab) => tab.id);

/** 按 URL 选择页面及其中的领域、迁移阶段或示意图；跨页定位时把待选中的节点带到目标视图。 */
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

  const page = ROADMAPS.find((item) => item.id === route.diagram);
  if (page) {
    const roadmap = page.model;
    if (!roadmap) return <Status message={page.error} />;
    return (
      <MigrationView
        migration={roadmap}
        nav={tabs}
        phase={Number(route.scope) || 0}
        phaseHref={(phase) => `#${page.id}/${phase}`}
        onOpen={(side, id) => {
          const diagram = side === "baseline" ? roadmap.baselineId : roadmap.targetId;
          go(diagram, scopeOf(roadmap[side], id), { type: "node", id });
        }}
      />
    );
  }

  const explained = EXPLAINED.find((item) => item.id === route.diagram);
  if (explained) {
    if (!explained.model) return <Status message={explained.error} />;
    return (
      <ExplainerView
        key={explained.id}
        explainer={explained.model}
        nav={tabs}
        figure={route.scope}
        figureHref={(id) => `#${explained.id}/${id}`}
      />
    );
  }

  const diagram = LOADED.find((item) => item.id === route.diagram) ?? LOADED[0];
  if (!diagram) return <Status message="数据目录中没有页面" />;
  if (!diagram.model) return <Status message={diagram.error} />;
  const view = viewOf(diagram.model, route.scope);
  const key = `${diagram.id}/${view.scope}`;
  const open = (scope: string, focus: Focus = null) => go(diagram.id, scope, focus);
  // 详情中的迁移阶段取以本图为终点的迁移路线，其次为以本图为起点的；不在任何迁移路线中的图不显示。
  const linked =
    ROADMAPS.find((item) => item.model?.targetId === diagram.id) ??
    ROADMAPS.find((item) => item.model?.baselineId === diagram.id);
  const roadmap = linked?.model;
  const side = roadmap?.targetId === diagram.id ? "target" : "baseline";
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
        linked && roadmap
          ? {
              stepOf: (id) => stepOf(roadmap, side, id),
              open: (index) => navigate({ diagram: linked.id, scope: String(index + 1) }),
            }
          : undefined
      }
    />
  );
}
