import { useMemo } from "react";
import { FloatingPanel, PanelItem } from "@/components/FloatingPanel";
import type { Focus } from "@/graph/highlight";
import { isContainer } from "@/model/architecture";
import type { DiagramView } from "@/model/views";

/** 仓库清单：统计各仓库的组件数，点击高亮其组件；领域视图只列本领域涉及的仓库。 */
export function RepositoryPanel({
  view,
  focus,
  onFocus,
  onClose,
}: {
  view: DiagramView;
  focus: Focus;
  onFocus: (focus: Focus) => void;
  onClose: () => void;
}) {
  const { source, scope } = view;
  const counts = useMemo(() => {
    const result = new Map<string, number>();
    for (const node of source.nodes.values())
      if (
        !isContainer(node) &&
        node.repository &&
        (!scope || source.domainOf.get(node.id) === scope)
      )
        result.set(node.repository, (result.get(node.repository) ?? 0) + 1);
    return result;
  }, [source, scope]);
  const repositories = [...source.repositories.values()].filter(
    (repository) => !scope || counts.has(repository.id),
  );

  return (
    <FloatingPanel title="仓库" onClose={onClose} className="w-64">
      {repositories.map((repository) => {
        const active = focus?.type === "repository" && focus.id === repository.id;
        return (
          <PanelItem
            key={repository.id}
            active={active}
            title={repository.summary}
            onClick={() => onFocus(active ? null : { type: "repository", id: repository.id })}
          >
            <span className="flex items-center justify-between gap-2">
              <span className="truncate">{repository.id}</span>
              <span className="shrink-0 text-muted-foreground">
                {repository.url ? "" : "规划 · "}
                {counts.get(repository.id) ?? "不在图中"}
              </span>
            </span>
          </PanelItem>
        );
      })}
    </FloatingPanel>
  );
}
