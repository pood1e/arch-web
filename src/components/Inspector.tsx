import { X } from "lucide-react";
import { ChangeBadge } from "@/components/ChangeBadge";
import { DomainDetails } from "@/components/DomainDetails";
import { EdgeDetails } from "@/components/EdgeDetails";
import {
  Badge,
  EdgeList,
  Heading,
  NodeButton,
  nodeOf,
  OptionalLink,
  Section,
} from "@/components/InspectorParts";
import type { Focus } from "@/graph/highlight";
import { ancestors, isContainer, NodeKind, sourceUrl } from "@/model/architecture";
import type { PhaseStep } from "@/model/migration";
import { type DiagramView, isDomainBox } from "@/model/views";

const NODE_KIND_LABELS: Partial<Record<NodeKind, string>> = {
  [NodeKind.CLUSTER]: "集群",
  [NodeKind.NAMESPACE]: "命名空间",
  [NodeKind.GROUP]: "分组",
  [NodeKind.COMPONENT]: "运行组件",
  [NodeKind.ARTIFACT]: "配置制品",
  [NodeKind.EXTERNAL]: "外部系统",
};

interface DetailsProps {
  view: DiagramView;
  id: string;
  onFocus: (focus: Focus) => void;
}

export interface MigrationLink {
  stepOf: (id: string) => PhaseStep | undefined;
  open: (index: number) => void;
}

export function Inspector({
  view,
  focus,
  onFocus,
  onOpen,
  migration,
}: {
  view: DiagramView;
  focus: Focus;
  onFocus: (focus: Focus) => void;
  onOpen: (scope: string) => void;
  migration?: MigrationLink;
}) {
  if (!focus) return null;
  const props = { view, id: focus.id, onFocus };
  return (
    <aside
      aria-label="详情"
      className="absolute z-30 flex flex-col border-border bg-card shadow-xl max-sm:inset-x-0 max-sm:bottom-0 max-sm:max-h-[60%] max-sm:rounded-t-2xl max-sm:border-t sm:inset-y-0 sm:right-0 sm:w-[360px] sm:border-l"
    >
      <button
        type="button"
        onClick={() => onFocus(null)}
        aria-label="关闭详情"
        className="absolute top-3 right-3 rounded-md p-1 text-muted-foreground hover:bg-muted"
      >
        <X className="size-4" />
      </button>
      <div className="overflow-y-auto px-4 py-4 text-[13px]">
        {focus.type === "node" &&
          (isDomainBox(view, focus.id) ? (
            <DomainDetails {...props} onOpen={onOpen} />
          ) : (
            <NodeDetails {...props} migration={migration} />
          ))}
        {focus.type === "edge" && <EdgeDetails {...props} />}
        {focus.type === "repository" && <RepositoryDetails {...props} />}
        {focus.type === "note" && <NoteDetails {...props} />}
      </div>
    </aside>
  );
}

function NodeDetails({
  view,
  id,
  onFocus,
  migration,
}: DetailsProps & { migration?: MigrationLink }) {
  const { source } = view;
  const node = nodeOf(view, id);
  if (!node) return null;
  const repository = source.repositories.get(node.repository);
  const domain = source.domains.get(source.domainOf.get(id) ?? "");
  const step = !isContainer(node) && migration?.stepOf(id);
  const edges = [...source.edges];
  return (
    <>
      <Heading icon={node.icon} title={node.title} subtitle={node.subtitle}>
        <Badge>{NODE_KIND_LABELS[node.kind]}</Badge>
        {domain && <Badge>{domain.title}</Badge>}
        <ChangeBadge change={node.change} className="py-px text-[11px]" />
      </Heading>
      <Breadcrumb {...{ view, id, onFocus }} />
      <p className="mt-3 text-foreground/90 leading-relaxed">{node.description}</p>
      {step && migration && (
        <Section title="迁移阶段">
          <button type="button" className="link" onClick={() => migration.open(step.index)}>
            阶段 {step.index + 1} · {step.title}（{step.action}）
          </button>
        </Section>
      )}
      {repository && (
        <Section title="来源">
          <OptionalLink href={repository.url}>{repository.id}</OptionalLink>
          {node.source && (
            <OptionalLink
              href={sourceUrl(repository, node.source)}
              className="mt-1 block break-all font-mono text-[12px]"
            >
              {node.source}
            </OptionalLink>
          )}
        </Section>
      )}
      {isContainer(node) && (
        <Section title="包含">
          {(source.children.get(id) ?? view.model.children.get(id) ?? []).map((child) => (
            <NodeButton key={child.id} view={view} id={child.id} onFocus={onFocus} />
          ))}
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

function RepositoryDetails({ view, id, onFocus }: DetailsProps) {
  const repository = view.source.repositories.get(id);
  if (!repository) return null;
  const members = [...view.source.nodes.values()].filter(
    (node) => node.repository === id && !isContainer(node),
  );
  return (
    <>
      <Heading
        icon="namespace"
        title={repository.id}
        subtitle={repository.url ? `默认分支 ${repository.branch}` : "规划中的仓库"}
      />
      <p className="mt-3 text-foreground/90 leading-relaxed">{repository.summary}</p>
      {repository.url && (
        <OptionalLink href={repository.url} className="mt-2 inline-block">
          打开仓库
        </OptionalLink>
      )}
      <Section title={members.length ? "组件" : "组件（不在图中）"}>
        {members.map((node) => (
          <NodeButton key={node.id} view={view} id={node.id} onFocus={onFocus} />
        ))}
      </Section>
    </>
  );
}

function NoteDetails({ view, id, onFocus }: DetailsProps) {
  const note = view.source.notes[Number(id)];
  if (!note) return null;
  return (
    <>
      <div className="pr-8">
        <Badge>要点 {Number(id) + 1}</Badge>
      </div>
      <h2 className="mt-2 font-semibold text-[15px]">{note.title}</h2>
      <p className="mt-2 text-foreground/90 leading-relaxed">{note.description}</p>
      <Section title="涉及">
        {note.nodes.map((nodeId) => (
          <NodeButton key={nodeId} view={view} id={nodeId} onFocus={onFocus} />
        ))}
      </Section>
    </>
  );
}

function Breadcrumb({ view, id, onFocus }: DetailsProps) {
  const chain = ancestors(view.source, id);
  if (!chain.length) return null;
  return (
    <nav aria-label="所在位置" className="mt-2 flex flex-wrap items-center gap-1 text-[12px]">
      {chain.map((node, index) => (
        <span key={node.id} className="flex items-center gap-1">
          {index > 0 && <span className="text-muted-foreground">/</span>}
          <button
            type="button"
            className="link"
            onClick={() => onFocus({ type: "node", id: node.id })}
          >
            {node.title}
          </button>
        </span>
      ))}
    </nav>
  );
}
