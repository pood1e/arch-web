import clsx from "clsx";
import { Change } from "@/model/architecture";

export const CHANGES: Partial<Record<Change, { label: string; className: string }>> = {
  [Change.ADDED]: { label: "新增", className: "border-success/60 text-success" },
  [Change.REWORKED]: { label: "改造", className: "border-info/60 text-info" },
};

export function ChangeBadge({ change, className }: { change: Change; className?: string }) {
  const item = CHANGES[change];
  if (!item) return null;
  return (
    <span className={clsx("rounded-full border bg-card px-1.5", item.className, className)}>
      {item.label}
    </span>
  );
}
