import Link from "next/link";
import type { ReactNode } from "react";

export type TabItem = {
  key: string;
  label: ReactNode;
  href?: string;
  active?: boolean;
  disabled?: boolean;
  onClick?: () => void;
};

/**
 * Segmented-control tab list. Items with `href` render as links (server-safe);
 * items with `onClick` render as buttons (client).
 */
export function Tabs({ items, label, className = "" }: { items: TabItem[]; label?: string; className?: string }) {
  return (
    <div
      role="tablist"
      aria-label={label}
      className={`inline-flex flex-wrap items-center gap-1 rounded-xl border border-border-default bg-surface-inset p-1 ${className}`}
    >
      {items.map((item) => {
        const classes = `inline-flex items-center gap-1.5 rounded-lg px-4 py-1.5 text-sm font-semibold transition-[background,color,box-shadow] duration-150 ${
          item.active
            ? "bg-surface-card text-primary-700 shadow-raised"
            : item.disabled
              ? "cursor-not-allowed text-text-disabled"
              : "text-text-muted hover:text-text-primary"
        }`;
        if (item.href && !item.disabled) {
          return (
            <Link key={item.key} href={item.href} role="tab" aria-selected={item.active} className={classes}>
              {item.label}
            </Link>
          );
        }
        return (
          <button
            key={item.key}
            type="button"
            role="tab"
            aria-selected={item.active}
            disabled={item.disabled}
            onClick={item.onClick}
            className={classes}
          >
            {item.label}
          </button>
        );
      })}
    </div>
  );
}
