import { FolderGit2, ImageDown, Lightbulb, Maximize, Spline } from "lucide-react";
import { type ReactNode, useEffect, useMemo, useRef, useState } from "react";
import { ArchitectureCanvas } from "@/components/ArchitectureCanvas";
import { Inspector, type MigrationLink } from "@/components/Inspector";
import { NotesPanel, scopedNotes } from "@/components/NotesPanel";
import { RepositoryPanel } from "@/components/RepositoryPanel";
import { SearchBox, ThemeButton, ToolButton, Toolbar } from "@/components/Toolbar";
import { buildElements, decorateElements } from "@/graph/elements";
import { type Focus, focusHighlight, matchesQuery } from "@/graph/highlight";
import { useArchitectureLayout } from "@/hooks/useArchitectureLayout";
import { useCanvasActions } from "@/hooks/useCanvasActions";
import { useTheme } from "@/hooks/useTheme";
import { isContainer } from "@/model/architecture";
import { type DiagramView, isDomainBox, scopeOf } from "@/model/views";

export function Status({ message }: { message: string }) {
  return (
    <div role="status" className="grid h-full place-items-center px-6 text-center text-sm">
      {message}
    </div>
  );
}

type PanelKey = "notes" | "repositories";

/** 跨视图保留的界面设置：浮层面板、连线显隐与搜索词。 */
export function useViewSettings() {
  const [panel, setPanel] = useState<PanelKey | null>(null);
  const [showAllEdges, setShowAllEdges] = useState(true);
  const [query, setQuery] = useState("");
  return { panel, setPanel, showAllEdges, setShowAllEdges, query, setQuery };
}

/** 一个视图的画布、工具栏、面板与详情；不在视图中的节点交给 onNavigate 切换领域后选中。 */
export function ArchitectureView({
  view,
  nav,
  settings,
  initialFocus,
  onNavigate,
  migration,
}: {
  view: DiagramView;
  nav: ReactNode;
  settings: ReturnType<typeof useViewSettings>;
  initialFocus: Focus;
  onNavigate: (scope: string, focus?: Focus) => void;
  migration?: MigrationLink;
}) {
  const { model, source } = view;
  const { panel, setPanel, showAllEdges, setShowAllEdges, query, setQuery } = settings;
  const theme = useTheme();
  const { geometry, error } = useArchitectureLayout(view);
  const [selection, setSelection] = useState<Focus>(initialFocus);
  const [hovered, setHovered] = useState<Focus>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const canvasRef = useRef<HTMLDivElement>(null);

  const base = useMemo(() => geometry && buildElements(view, geometry), [view, geometry]);
  const elements = useMemo(
    () =>
      base &&
      decorateElements(base, view, {
        selectedId: selection?.type === "node" ? selection.id : undefined,
        highlight: focusHighlight(view, hovered ?? selection),
        query,
        showAllEdges,
      }),
    [base, view, selection, hovered, query, showAllEdges],
  );
  const canvas = useCanvasActions(model, geometry, base, canvasRef);
  const scopeTitle = source.domains.size
    ? (source.domains.get(view.scope)?.title ?? "领域总览")
    : "";

  useEffect(() => {
    document.title = [scopeTitle, source.title].filter(Boolean).join(" · ");
  }, [scopeTitle, source]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "/" && !(event.target instanceof HTMLInputElement)) {
        event.preventDefault();
        searchRef.current?.focus();
      } else if (event.key === "Escape") {
        setSelection(null);
        searchRef.current?.blur();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const focus = (next: Focus) => {
    if (next?.type === "node" && !model.nodes.has(next.id)) {
      const scope = scopeOf(source, next.id);
      if (scope !== view.scope) return onNavigate(scope, next);
    }
    setSelection(next);
    if (next?.type === "node") canvas.reveal(next.id);
    else if (next?.type === "note" || next?.type === "repository")
      canvas.revealAll([...(focusHighlight(view, next)?.nodes ?? [])]);
  };

  /** 优先选中当前视图内的匹配组件，否则进入其所在领域。 */
  const focusFirstMatch = () => {
    const matches = [...source.nodes.values()]
      .filter((node) => !isContainer(node) && matchesQuery(view, node.id, query))
      .map((node) => node.id);
    const match = matches.find((id) => model.nodes.has(id)) ?? matches[0];
    if (match) focus({ type: "node", id: match });
  };

  const togglePanel = (key: PanelKey) => setPanel(panel === key ? null : key);
  const notes = scopedNotes(view);

  return (
    <div className="flex h-dvh flex-col">
      <Toolbar baseline={source.baseline} tabs={nav}>
        <SearchBox
          query={query}
          onQueryChange={setQuery}
          onSubmit={focusFirstMatch}
          inputRef={searchRef}
        />
        <div className="flex items-center gap-1.5">
          <ToolButton
            label="要点"
            pressed={panel === "notes"}
            onClick={() => togglePanel("notes")}
            disabled={!notes.length}
          >
            <Lightbulb className="size-4" />
          </ToolButton>
          <ToolButton
            label="仓库"
            pressed={panel === "repositories"}
            onClick={() => togglePanel("repositories")}
          >
            <FolderGit2 className="size-4" />
          </ToolButton>
          <ToolButton
            label={showAllEdges ? "仅显示关联连线" : "显示全部连线"}
            pressed={showAllEdges}
            onClick={() => setShowAllEdges(!showAllEdges)}
          >
            <Spline className="size-4" />
          </ToolButton>
          <ToolButton label="适应画布" onClick={canvas.fitAll}>
            <Maximize className="size-4" />
          </ToolButton>
          <ToolButton label="导出 PNG" onClick={canvas.exportImage} disabled={!base}>
            <ImageDown className="size-4" />
          </ToolButton>
          <ThemeButton theme={theme.preference} onChange={theme.setPreference} />
        </div>
      </Toolbar>
      {canvas.exportError && (
        <p role="alert" className="border-border border-b px-4 py-2 text-[12px] text-warning">
          {canvas.exportError}
        </p>
      )}
      <main className="relative min-h-0 flex-1">
        <div ref={canvasRef} className="absolute inset-0 bg-canvas">
          {elements ? (
            <ArchitectureCanvas
              elements={elements}
              colorMode={theme.resolved}
              onInit={() => {
                canvas.showInitialView();
                if (initialFocus?.type === "node") canvas.reveal(initialFocus.id);
              }}
              onSelect={setSelection}
              onOpen={(id) => isDomainBox(view, id) && onNavigate(id)}
              onHover={setHovered}
            />
          ) : (
            <Status message={error || "正在排列架构图…"} />
          )}
        </div>
        {panel === "notes" && notes.length > 0 && (
          <NotesPanel
            view={view}
            focus={selection}
            onFocus={focus}
            onClose={() => setPanel(null)}
          />
        )}
        {panel === "repositories" && (
          <RepositoryPanel
            view={view}
            focus={selection}
            onFocus={focus}
            onClose={() => setPanel(null)}
          />
        )}
        <Inspector
          view={view}
          focus={selection}
          onFocus={focus}
          onOpen={onNavigate}
          migration={migration}
        />
      </main>
    </div>
  );
}
