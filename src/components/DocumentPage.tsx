import clsx from "clsx";
import { ArrowRight } from "lucide-react";
import { type ReactNode, useEffect } from "react";
import { ThemeButton, Toolbar } from "@/components/Toolbar";
import type { Theme } from "@/hooks/useTheme";

/** 文档式页面：工具栏与居中滚动的正文；anchor 为 URL 定位的元素 ID，变化时滚动到该处。 */
export function DocumentPage({
  title,
  summary = "",
  nav,
  theme,
  anchor,
  children,
}: {
  title: string;
  summary?: string;
  nav: ReactNode;
  theme: Theme;
  anchor: string;
  children: ReactNode;
}) {
  useEffect(() => {
    document.title = title;
  }, [title]);
  useEffect(() => {
    if (anchor) document.getElementById(anchor)?.scrollIntoView({ block: "start" });
  }, [anchor]);

  return (
    <div className="flex h-dvh flex-col">
      <Toolbar baseline={summary} tabs={nav} showEdgeLegend={false}>
        <ThemeButton theme={theme.preference} onChange={theme.setPreference} />
      </Toolbar>
      <main className="min-h-0 flex-1 overflow-y-auto bg-canvas">
        <div className="mx-auto max-w-[1440px] px-4 py-4">{children}</div>
      </main>
    </div>
  );
}

/** 页内章节导航：编号链接指向各章节；sequential 时以箭头相连，表示按顺序执行。 */
export function SectionNav({
  label,
  items,
  sequential = false,
}: {
  label: string;
  items: { title: string; href: string; current: boolean }[];
  sequential?: boolean;
}) {
  return (
    <nav aria-label={label}>
      <ol className="flex flex-wrap items-center gap-1.5 text-[12px]">
        {items.map((item, index) => (
          <li key={item.href} className="flex items-center gap-1.5">
            {sequential && index > 0 && (
              <ArrowRight className="size-3.5 text-muted-foreground" aria-hidden />
            )}
            <a
              href={item.href}
              aria-current={item.current ? (sequential ? "step" : "location") : undefined}
              className={clsx(
                "flex items-center gap-1.5 rounded-full border px-2.5 py-1",
                item.current
                  ? "border-primary/60 bg-accent text-accent-foreground"
                  : "border-border bg-card hover:bg-muted",
              )}
            >
              <span className="font-semibold">{index + 1}</span>
              {item.title}
            </a>
          </li>
        ))}
      </ol>
    </nav>
  );
}
