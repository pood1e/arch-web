import clsx from "clsx";
import { Box } from "lucide-react";
import { ICONS, isDarkBrand } from "@/lib/icons";

export function NodeIcon({ icon, className = "size-5" }: { icon: string; className?: string }) {
  const definition = ICONS[icon];
  if (!definition) return <Box className={className} strokeWidth={1.8} aria-hidden />;
  if ("asset" in definition) {
    const { asset } = definition;
    return (
      <img
        src={asset.src}
        alt=""
        className={clsx(
          "object-contain",
          asset.lightBackground && "rounded-sm dark:bg-white dark:[color-scheme:light]",
          className,
        )}
      />
    );
  }
  if ("glyph" in definition) {
    const Glyph = definition.glyph;
    return <Glyph className={className} strokeWidth={1.8} aria-hidden />;
  }
  const { brand } = definition;
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden>
      <path
        d={brand.path}
        fill={`#${brand.hex}`}
        className={isDarkBrand(brand) ? "dark:fill-current" : undefined}
      />
    </svg>
  );
}
