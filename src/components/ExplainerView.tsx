import clsx from "clsx";
import { type ReactNode, useEffect, useState } from "react";
import { DocumentPage, SectionNav } from "@/components/DocumentPage";
import { useTheme } from "@/hooks/useTheme";
import { type Rendered, renderMermaid } from "@/lib/mermaid";
import type { ExplainerModel } from "@/model/explainer";

/**
 * 示意图页：图目录、导语与按顺序排列的 Mermaid 图；figure 为 URL 定位的图 ID。
 * 全部图渲染完成后再定位，避免前面的图撑开后目标偏离视口；切换主题时保留旧图直到新图就绪。
 */
export function ExplainerView({
  explainer,
  nav,
  figure,
  figureHref,
}: {
  explainer: ExplainerModel;
  nav: ReactNode;
  figure: string;
  figureHref: (id: string) => string;
}) {
  const theme = useTheme();
  const [rendered, setRendered] = useState<Rendered[]>();
  useEffect(() => {
    let current = true;
    renderMermaid(
      explainer.figures.map((item) => item.code),
      theme.resolved,
    ).then((results) => {
      if (current) setRendered(results);
    });
    return () => {
      current = false;
    };
  }, [explainer, theme.resolved]);

  return (
    <DocumentPage
      title={explainer.title}
      nav={nav}
      theme={theme}
      anchor={rendered && figure ? `figure-${figure}` : ""}
    >
      <SectionNav
        label="示意图"
        items={explainer.figures.map((item) => ({
          title: item.title,
          href: figureHref(item.id),
          current: item.id === figure,
        }))}
      />
      {explainer.description && (
        <p className="mt-3 max-w-4xl text-[13px] text-muted-foreground leading-relaxed">
          {explainer.description}
        </p>
      )}
      <ol className="mt-4 space-y-4">
        {explainer.figures.map((item, index) => (
          <li key={item.id} id={`figure-${item.id}`} className="scroll-mt-4">
            <figure
              aria-current={item.id === figure ? "location" : undefined}
              className={clsx(
                "rounded-xl border bg-card p-4 shadow-xs",
                item.id === figure ? "border-primary/60 ring-2 ring-primary/15" : "border-border",
              )}
            >
              <figcaption>
                <h2 className="font-semibold text-[14px]">
                  <span className="mr-1.5 text-muted-foreground">{index + 1}</span>
                  {item.title}
                </h2>
                {item.description && (
                  <p className="mt-1 max-w-4xl text-[13px] text-muted-foreground leading-relaxed">
                    {item.description}
                  </p>
                )}
              </figcaption>
              <Diagram result={rendered?.[index]} />
            </figure>
          </li>
        ))}
      </ol>
    </DocumentPage>
  );
}

function Diagram({ result }: { result?: Rendered }) {
  if (result?.error)
    return (
      <p role="alert" className="mt-3 text-[13px] text-warning">
        示意图渲染失败：{result.error}
      </p>
    );
  return (
    <div
      className="mt-3 flex min-h-24 justify-center overflow-x-auto"
      // biome-ignore lint/security/noDangerouslySetInnerHtml: Mermaid 以 strict 安全级别渲染，输出经 DOMPurify 净化。
      dangerouslySetInnerHTML={{ __html: result?.svg ?? "" }}
    />
  );
}
