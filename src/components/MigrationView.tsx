import clsx from "clsx";
import { ArrowRight } from "lucide-react";
import { type ReactNode, useEffect } from "react";
import { CHIP_TONES, type MigrationSide, PhaseCard } from "@/components/PhaseCard";
import { ThemeButton, Toolbar } from "@/components/Toolbar";
import { useTheme } from "@/hooks/useTheme";
import { Change } from "@/model/architecture";
import type { MigrationModel } from "@/model/migration";

const LEGEND = [
  { label: "新增", className: CHIP_TONES[Change.ADDED] },
  { label: "改造", className: CHIP_TONES[Change.REWORKED] },
  { label: "下线", className: "border-border text-muted-foreground line-through" },
];

/** 迁移路线页：阶段导航与逐阶段卡片；phase 为 URL 定位的阶段号，0 表示不定位。 */
export function MigrationView({
  migration,
  nav,
  phase,
  phaseHref,
  onOpen,
}: {
  migration: MigrationModel;
  nav: ReactNode;
  phase: number;
  phaseHref: (phase: number) => string;
  onOpen: (side: MigrationSide, id: string) => void;
}) {
  const theme = useTheme();
  useEffect(() => {
    document.title = migration.title;
  }, [migration.title]);
  useEffect(() => {
    if (phase) document.getElementById(`phase-${phase}`)?.scrollIntoView({ block: "start" });
  }, [phase]);

  const summary = `${migration.phases.length} 个阶段 · 交付 ${migration.delivered.size} 个组件 · 下线 ${migration.retired.size} 个组件`;
  return (
    <div className="flex h-dvh flex-col">
      <Toolbar baseline={summary} tabs={nav} showEdgeLegend={false}>
        <ThemeButton theme={theme.preference} onChange={theme.setPreference} />
      </Toolbar>
      <main className="min-h-0 flex-1 overflow-y-auto bg-canvas">
        <div className="mx-auto max-w-[1440px] px-4 py-4">
          <nav aria-label="迁移阶段">
            <ol className="flex flex-wrap items-center gap-1.5 text-[12px]">
              {migration.phases.map((item, index) => (
                <li key={item.title} className="flex items-center gap-1.5">
                  {index > 0 && (
                    <ArrowRight className="size-3.5 text-muted-foreground" aria-hidden />
                  )}
                  <a
                    href={phaseHref(index + 1)}
                    aria-current={phase === index + 1 ? "step" : undefined}
                    className={clsx(
                      "flex items-center gap-1.5 rounded-full border px-2.5 py-1",
                      phase === index + 1
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
          <p className="mt-2 flex flex-wrap items-center gap-2 text-[12px] text-muted-foreground">
            {LEGEND.map((item) => (
              <span
                key={item.label}
                className={clsx("rounded-md border bg-card px-2", item.className)}
              >
                {item.label}
              </span>
            ))}
            点击组件进入对应架构图
          </p>
          <ol className="mt-4 space-y-4">
            {migration.phases.map((item, index) => (
              <PhaseCard
                key={item.title}
                migration={migration}
                index={index}
                active={phase === index + 1}
                onOpen={onOpen}
              />
            ))}
          </ol>
        </div>
      </main>
    </div>
  );
}
