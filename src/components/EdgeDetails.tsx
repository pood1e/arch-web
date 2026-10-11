import { ArrowRight } from "lucide-react";
import { Badge, NodeButton, nodeOf, Section } from "@/components/InspectorParts";
import { EDGE_KIND_LABELS, edgeColor } from "@/graph/elements";
import type { Focus } from "@/graph/highlight";
import type { DiagramView } from "@/model/views";

interface EdgeDetailsProps {
  view: DiagramView;
  id: string;
  onFocus: (focus: Focus) => void;
}

/** 单条连线展示原始说明；合并连线列出其包含的原始连线。 */
export function EdgeDetails({ view, id, onFocus }: EdgeDetailsProps) {
  const raw = view.bundles.get(id) ?? (view.source.edges.has(id) ? [id] : []);
  if (raw.length === 1) return <RawEdgeDetails view={view} id={raw[0]} onFocus={onFocus} />;
  const edge = view.model.edges.get(id);
  if (!edge) return null;
  const title = (nodeId: string) => nodeOf(view, nodeId)?.title;
  return (
    <>
      <div className="pr-8">
        <Badge color={edgeColor(edge.kind)}>{EDGE_KIND_LABELS[edge.kind]}</Badge>
      </div>
      <h2 className="mt-2 font-semibold text-[15px]">
        {title(edge.source)} → {title(edge.target)}
      </h2>
      <p className="mt-1 text-muted-foreground">合并 {raw.length} 条连线</p>
      <Section title="包含">
        {raw.flatMap((rawId) => {
          const member = view.source.edges.get(rawId);
          if (!member) return [];
          return (
            <button
              key={rawId}
              type="button"
              onClick={() => onFocus({ type: "edge", id: rawId })}
              className="flex w-full items-start gap-2 rounded-lg px-2 py-1.5 text-left hover:bg-muted"
            >
              <ArrowRight
                className="mt-0.5 size-3.5 shrink-0"
                style={{ color: edgeColor(member.kind) }}
              />
              <span className="min-w-0">
                <span className="block font-medium">
                  {title(member.source)} → {title(member.target)}
                </span>
                <span className="block text-[12px] text-muted-foreground">{member.label}</span>
              </span>
            </button>
          );
        })}
      </Section>
      <Section title="发起方">
        <NodeButton view={view} id={edge.source} onFocus={onFocus} />
      </Section>
      <Section title="被访问方">
        <NodeButton view={view} id={edge.target} onFocus={onFocus} />
      </Section>
    </>
  );
}

function RawEdgeDetails({ view, id, onFocus }: EdgeDetailsProps) {
  const edge = view.source.edges.get(id);
  if (!edge) return null;
  return (
    <>
      <div className="pr-8">
        <Badge color={edgeColor(edge.kind)}>{EDGE_KIND_LABELS[edge.kind]}</Badge>
      </div>
      <h2 className="mt-2 font-semibold text-[15px]">{edge.label}</h2>
      <p className="mt-2 text-foreground/90 leading-relaxed">{edge.description}</p>
      <Section title="发起方">
        <NodeButton view={view} id={edge.source} onFocus={onFocus} />
      </Section>
      <Section title="被访问方">
        <NodeButton view={view} id={edge.target} onFocus={onFocus} />
      </Section>
    </>
  );
}
