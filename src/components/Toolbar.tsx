import clsx from "clsx";
import { Monitor, Moon, Search, Sun } from "lucide-react";
import type { ReactNode, RefObject } from "react";
import { EdgeLegend } from "@/components/EdgeLegend";
import type { ThemePreference } from "@/hooks/useTheme";

const THEMES: Record<ThemePreference, { next: ThemePreference; label: string; icon: ReactNode }> = {
  system: { next: "light", label: "跟随系统", icon: <Monitor className="size-4" /> },
  light: { next: "dark", label: "浅色", icon: <Sun className="size-4" /> },
  dark: { next: "system", label: "深色", icon: <Moon className="size-4" /> },
};

export function Toolbar({
  baseline,
  tabs,
  children,
  showEdgeLegend = true,
}: {
  baseline: string;
  tabs: ReactNode;
  children: ReactNode;
  showEdgeLegend?: boolean;
}) {
  return (
    <header className="flex flex-wrap items-center gap-x-5 gap-y-2 border-border border-b bg-card/80 px-4 py-2.5 backdrop-blur lg:flex-nowrap">
      <div className="mr-auto flex min-w-0 items-center gap-3">
        {tabs}
        <p className="truncate text-[12px] text-muted-foreground max-lg:hidden">{baseline}</p>
      </div>
      {showEdgeLegend && (
        <div className="shrink-0 whitespace-nowrap max-2xl:hidden">
          <EdgeLegend />
        </div>
      )}
      {children}
    </header>
  );
}

export function DiagramTabs({
  items,
  active,
  onChange,
}: {
  items: { id: string; label: string }[];
  active: string;
  onChange: (id: string) => void;
}) {
  return (
    <nav aria-label="架构图" className="flex shrink-0 rounded-lg bg-muted p-0.5 text-[12px]">
      {items.map((item) => (
        <button
          key={item.id}
          type="button"
          aria-current={item.id === active ? "page" : undefined}
          onClick={() => onChange(item.id)}
          className={clsx(
            "rounded-md px-2.5 py-1",
            item.id === active
              ? "bg-card font-medium text-foreground shadow-xs"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          {item.label}
        </button>
      ))}
    </nav>
  );
}

/** 领域选择：总览或单个领域。 */
export function ScopeSelect({
  items,
  active,
  onChange,
}: {
  items: { id: string; label: string }[];
  active: string;
  onChange: (id: string) => void;
}) {
  return (
    <select
      aria-label="领域"
      value={active}
      onChange={(event) => onChange(event.target.value)}
      className="h-7 shrink-0 rounded-lg border border-border bg-card px-2 text-[12px] outline-none focus:border-ring"
    >
      {items.map((item) => (
        <option key={item.id} value={item.id}>
          {item.label}
        </option>
      ))}
    </select>
  );
}

export function SearchBox({
  query,
  onQueryChange,
  onSubmit,
  inputRef,
}: {
  query: string;
  onQueryChange: (query: string) => void;
  onSubmit: () => void;
  inputRef: RefObject<HTMLInputElement | null>;
}) {
  return (
    <search className="max-sm:flex-1">
      <form
        className="relative"
        onSubmit={(event) => {
          event.preventDefault();
          onSubmit();
        }}
      >
        <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
        <input
          ref={inputRef}
          type="search"
          value={query}
          onChange={(event) => onQueryChange(event.target.value)}
          placeholder="搜索组件、仓库  /"
          aria-label="搜索组件或仓库"
          className="h-8 w-full rounded-lg border border-input bg-card pr-3 pl-8 text-[13px] outline-none focus:border-ring sm:w-60"
        />
      </form>
    </search>
  );
}

export function ToolButton({
  label,
  onClick,
  pressed,
  disabled,
  children,
}: {
  label: string;
  onClick: () => void;
  pressed?: boolean;
  disabled?: boolean;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      aria-pressed={pressed}
      disabled={disabled}
      onClick={onClick}
      className={clsx(
        "grid size-8 place-items-center rounded-lg border border-border bg-card text-foreground/80 hover:bg-muted disabled:opacity-40",
        pressed && "border-primary/60 bg-accent text-accent-foreground",
      )}
    >
      {children}
    </button>
  );
}

export function ThemeButton({
  theme,
  onChange,
}: {
  theme: ThemePreference;
  onChange: (theme: ThemePreference) => void;
}) {
  const { next, label, icon } = THEMES[theme];
  return (
    <ToolButton label={`主题：${label}`} onClick={() => onChange(next)}>
      {icon}
    </ToolButton>
  );
}
