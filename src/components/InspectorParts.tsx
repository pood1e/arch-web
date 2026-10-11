import clsx from "clsx";
import { ArrowLeft, ArrowRight, ExternalLink } from "lucide-react";
import type { ReactNode } from "react";
import { NodeIcon } from "@/components/NodeIcon";
import { edgeColor } from "@/graph/elements";
import type { Focus } from "@/graph/highlight";
import type { ArchEdge } from "@/model/architecture";
import { type DiagramView, scopeOf } from "@/model/views";

/** 视图内节点（含领域方框）或完整架构中的节点。 */
export function nodeOf(view: DiagramView, id: string) {
  return view.model.nodes.get(id) ?? view.source.nodes.get(id);
}

export function Heading({
  icon,
  title,
  subtitle,
  children,
}: {
  icon: string;
  title: string;
  subtitle: string;
  children?: ReactNode;
}) {
  return (
    <header className="pr-8">
      <div className="flex flex-wrap gap-1.5">{children}</div>
      <h2 className="mt-2 flex items-center gap-2 font-semibold text-[16px]">
        <NodeIcon icon={icon} className="size-5 shrink-0" />
        {title}
      </h2>
      <p className="mt-0.5 text-muted-foreground">{subtitle}</p>
    </header>
  );
}

export function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="mt-4">
      <h3 className="mb-1 font-medium text-[12px] text-muted-foreground">{title}</h3>
      {children}
    </section>
  );
}

export function Badge({ children, color }: { children: ReactNode; color?: string }) {
  return (
    <span
      className="rounded-full border border-border px-2 py-px text-[11px] text-foreground/80"
      style={color ? { borderColor: color, color } : undefined}
    >
      {children}
    </span>
  );
}

/** 有地址时渲染为外链，规划中的仓库只显示文本。 */
export function OptionalLink({
  href,
  className,
  children,
}: {
  href: string;
  className?: string;
  children: ReactNode;
}) {
  if (!href) return <span className={clsx("text-foreground/80", className)}>{children}</span>;
  return (
    <a className={clsx("link", className)} href={href} target="_blank" rel="noreferrer">
      {children}
      <ExternalLink className="ml-1 inline size-3" />
    </a>
  );
}

/** 节点按钮；节点不在当前视图时注明其所在领域（列表已按领域归类时可省略），点击后切换过去。 */
export function NodeButton({
  view,
  id,
  onFocus,
  hideScope,
}: {
  view: DiagramView;
  id: string;
  onFocus: (focus: Focus) => void;
  hideScope?: boolean;
}) {
  const node = nodeOf(view, id);
  if (!node) return null;
  const elsewhere =
    !hideScope &&
    !view.model.nodes.has(id) &&
    (view.source.domains.get(scopeOf(view.source, id))?.title ?? "领域总览");
  return (
    <button
      type="button"
      onClick={() => onFocus({ type: "node", id })}
      className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left hover:bg-muted"
    >
      <NodeIcon icon={node.icon} className="size-4 shrink-0" />
      <span className="min-w-0 flex-1">
        <span className="block truncate font-medium">{node.title}</span>
        <span className="block truncate text-[12px] text-muted-foreground">{node.subtitle}</span>
      </span>
      {elsewhere && (
        <span className="shrink-0 text-[11px] text-info">
          <ArrowRight className="mr-0.5 inline size-3" />
          {elsewhere}
        </span>
      )}
    </button>
  );
}

/** 访问或被访问的连线列表，按对端展示名称与标签。 */
export function EdgeList({
  title,
  view,
  edges,
  peer,
  onFocus,
}: {
  title: string;
  view: DiagramView;
  edges: [string, ArchEdge][];
  peer: "source" | "target";
  onFocus: (focus: Focus) => void;
}) {
  if (!edges.length) return null;
  const Arrow = peer === "target" ? ArrowRight : ArrowLeft;
  return (
    <Section title={`${title} · ${edges.length}`}>
      {edges.map(([id, edge]) => (
        <button
          key={id}
          type="button"
          onClick={() => onFocus({ type: "edge", id })}
          className="flex w-full items-start gap-2 rounded-lg px-2 py-1.5 text-left hover:bg-muted"
        >
          <Arrow className="mt-0.5 size-3.5 shrink-0" style={{ color: edgeColor(edge.kind) }} />
          <span className="min-w-0">
            <span className="block font-medium">{nodeOf(view, edge[peer])?.title}</span>
            <span className="block text-[12px] text-muted-foreground">{edge.label}</span>
          </span>
        </button>
      ))}
    </Section>
  );
}
