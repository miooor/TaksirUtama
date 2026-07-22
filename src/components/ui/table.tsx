import type { ReactNode } from "react";

export function TableShell({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <div className={`overflow-x-auto rounded-xl border border-border-default bg-surface-card shadow-card ${className}`}>
      {children}
    </div>
  );
}

export function DataTable({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <table className={`w-full text-sm ${className}`}>{children}</table>;
}

export function THead({ children }: { children: ReactNode }) {
  return <thead>{children}</thead>;
}

export function TH({
  children,
  align = "left",
  sticky = false,
  className = "",
}: {
  children?: ReactNode;
  align?: "left" | "center" | "right";
  sticky?: boolean;
  className?: string;
}) {
  const alignClass = align === "center" ? "text-center" : align === "right" ? "text-right" : "text-left";
  return (
    <th
      className={`whitespace-nowrap border-b border-border-default bg-surface-inset px-4 py-3 text-xs font-semibold uppercase tracking-wide text-text-muted ${alignClass} ${
        sticky ? "sticky left-0 z-10 bg-surface-inset" : ""
      } ${className}`}
    >
      {children}
    </th>
  );
}

export function TRow({
  children,
  hover = true,
  className = "",
}: {
  children: ReactNode;
  hover?: boolean;
  className?: string;
}) {
  return (
    <tr className={`border-b border-border-default last:border-b-0 ${hover ? "transition-colors hover:bg-surface-inset/60" : ""} ${className}`}>
      {children}
    </tr>
  );
}

export function TD({
  children,
  align = "left",
  sticky = false,
  className = "",
}: {
  children?: ReactNode;
  align?: "left" | "center" | "right";
  sticky?: boolean;
  className?: string;
}) {
  const alignClass = align === "center" ? "text-center" : align === "right" ? "text-right" : "text-left";
  return (
    <td className={`px-4 py-3 ${alignClass} ${sticky ? "sticky left-0 z-10 bg-surface-card" : ""} ${className}`}>
      {children}
    </td>
  );
}
