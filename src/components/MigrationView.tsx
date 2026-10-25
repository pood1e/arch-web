import clsx from "clsx";
import type { ReactNode } from "react";
import { DocumentPage, SectionNav } from "@/components/DocumentPage";
import { CHIP_TONES, type MigrationSide, PhaseCard } from "@/components/PhaseCard";
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
  const summary = `${migration.phases.length} 个阶段 · 交付 ${migration.delivered.size} 个组件 · 下线 ${migration.retired.size} 个组件`;
  return (
    <DocumentPage
      title={migration.title}
      summary={summary}
      nav={nav}
      theme={theme}
      anchor={phase ? `phase-${phase}` : ""}
    >
      <SectionNav
        label="迁移阶段"
        sequential
        items={migration.phases.map((item, index) => ({
          title: item.title,
          href: phaseHref(index + 1),
          current: phase === index + 1,
        }))}
      />
      <p className="mt-2 flex flex-wrap items-center gap-2 text-[12px] text-muted-foreground">
        {LEGEND.map((item) => (
          <span key={item.label} className={clsx("rounded-md border bg-card px-2", item.className)}>
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
    </DocumentPage>
  );
}
