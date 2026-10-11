import { ArrowRight } from "lucide-react";
import { Badge, EdgeList, Heading, NodeButton, Section } from "@/components/InspectorParts";
import type { Focus } from "@/graph/highlight";
import { Change, domainLeaves } from "@/model/architecture";
import type { DiagramView } from "@/model/views";

/** 折叠领域的职责、组件、仓库与跨领域连线，并提供进入领域视图的入口。 */
export function DomainDetails({
  view,
  id,
  onFocus,
  onOpen,
}: {
  view: DiagramView;
  id: string;
  onFocus: (focus: Focus) => void;
  onOpen: (scope: string) => void;
}) {
  const { source } = view;
  const domain = source.domains.get(id);
  if (!domain) return null;
  const leaves = domainLeaves(source, id).flatMap((leaf) => source.nodes.get(leaf) ?? []);
  const changes = [
    [Change.ADDED, "新增"],
    [Change.REWORKED, "改造"],
  ] as const;
  const summary = changes
    .map(([change, label]) => [label, leaves.filter((node) => node.change === change).length])
    .filter(([, count]) => count)
    .map(([label, count]) => `${label} ${count}`)
    .join(" · ");
  const repositories = [...new Set(leaves.map((node) => node.repository).filter(Boolean))];
  const edges = [...view.model.edges];
  return (
    <>
      <Heading icon={domain.icon} title={domain.title} subtitle={domain.subtitle}>
        <Badge>领域</Badge>
      </Heading>
      <p className="mt-3 text-foreground/90 leading-relaxed">{domain.description}</p>
      <button
        type="button"
        onClick={() => onOpen(id)}
        className="mt-3 inline-flex items-center gap-1 rounded-lg border border-primary/40 bg-accent px-3 py-1.5 font-medium text-accent-foreground hover:bg-accent/70"
      >
        进入领域
        <ArrowRight className="size-3.5" />
      </button>
      <Section title={`节点 · ${leaves.length}${summary ? `（${summary}）` : ""}`}>
        {leaves.map((node) => (
          <NodeButton key={node.id} view={view} id={node.id} onFocus={onFocus} hideScope />
        ))}
      </Section>
      {repositories.length > 0 && (
        <Section title="仓库">
          <div className="flex flex-wrap gap-1.5 px-2">
            {repositories.map((repository) => (
              <button
                key={repository}
                type="button"
                onClick={() => onFocus({ type: "repository", id: repository })}
                className="rounded-full border border-border px-2 py-0.5 text-[12px] hover:bg-muted"
              >
                {repository}
              </button>
            ))}
          </div>
        </Section>
      )}
      <EdgeList
        title="访问"
        view={view}
        edges={edges.filter(([, edge]) => edge.source === id)}
        peer="target"
        onFocus={onFocus}
      />
      <EdgeList
        title="被访问"
        view={view}
        edges={edges.filter(([, edge]) => edge.target === id)}
        peer="source"
        onFocus={onFocus}
      />
    </>
  );
}
