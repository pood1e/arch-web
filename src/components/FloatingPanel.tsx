import clsx from "clsx";
import { X } from "lucide-react";
import type { ReactNode } from "react";

/** 画布左上角的浮层列表面板。 */
export function FloatingPanel({
  title,
  onClose,
  className,
  children,
}: {
  title: string;
  onClose: () => void;
  className?: string;
  children: ReactNode;
}) {
  return (
    <section
      aria-label={title}
      className={clsx(
        "absolute top-3 left-3 z-20 rounded-xl border border-border bg-card/95 text-[12px] shadow-lg backdrop-blur max-sm:right-3",
        className,
      )}
    >
      <header className="flex items-center justify-between px-3 py-2">
        <h2 className="font-medium">{title}</h2>
        <button
          type="button"
          onClick={onClose}
          aria-label={`关闭${title}`}
          className="rounded-md p-0.5 text-muted-foreground hover:bg-muted"
        >
          <X className="size-4" />
        </button>
      </header>
      <ul className="max-h-[calc(100dvh-9rem)] overflow-y-auto px-2 pb-2">{children}</ul>
    </section>
  );
}

export function PanelItem({
  active,
  title,
  onClick,
  children,
}: {
  active: boolean;
  title?: string;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <li>
      <button
        type="button"
        title={title}
        aria-pressed={active}
        onClick={onClick}
        className={clsx(
          "w-full rounded-md px-2 py-1 text-left hover:bg-muted",
          active && "bg-accent text-accent-foreground",
        )}
      >
        {children}
      </button>
    </li>
  );
}
