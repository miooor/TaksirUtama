import { ChevronDown } from "lucide-react";

type SelectProps = React.SelectHTMLAttributes<HTMLSelectElement> & {
  invalid?: boolean;
};

export function Select({ invalid, className = "", children, ...props }: SelectProps) {
  return (
    <span className="relative block">
      <select
        {...props}
        aria-invalid={invalid || undefined}
        className={`block w-full appearance-none rounded-lg border bg-surface-card py-2 pl-3 pr-9 text-sm text-text-primary shadow-raised transition-[border-color,box-shadow] duration-150 disabled:cursor-not-allowed disabled:bg-surface-inset disabled:text-text-muted ${
          invalid
            ? "border-danger focus:border-danger focus:outline-none focus:ring-2 focus:ring-danger/20"
            : "border-border-strong focus:border-border-focus focus:outline-none focus:ring-2 focus:ring-primary-500/20"
        } ${className}`}
      >
        {children}
      </select>
      <ChevronDown
        className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted"
        aria-hidden="true"
      />
    </span>
  );
}
