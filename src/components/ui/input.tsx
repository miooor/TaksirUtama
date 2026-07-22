import type { ReactNode } from "react";

const fieldBase =
  "block w-full rounded-lg border bg-surface-card px-3 py-2 text-sm text-text-primary shadow-raised transition-[border-color,box-shadow] duration-150 placeholder:text-text-disabled disabled:cursor-not-allowed disabled:bg-surface-inset disabled:text-text-muted read-only:cursor-not-allowed read-only:bg-surface-inset read-only:text-text-muted";

const stateClasses = {
  default: "border-border-strong focus:border-border-focus focus:outline-none focus:ring-2 focus:ring-primary-500/20",
  error: "border-danger focus:border-danger focus:outline-none focus:ring-2 focus:ring-danger/20",
};

export function FieldLabel({ htmlFor, children, required }: { htmlFor?: string; children: ReactNode; required?: boolean }) {
  return (
    <label htmlFor={htmlFor} className="mb-1.5 block text-sm font-medium text-text-secondary">
      {children}
      {required ? <span className="ml-0.5 text-danger" aria-hidden="true">*</span> : null}
    </label>
  );
}

export function FieldHint({ children, error = false }: { children: ReactNode; error?: boolean }) {
  return <p className={`mt-1.5 text-xs ${error ? "text-danger-text" : "text-text-muted"}`}>{children}</p>;
}

type InputProps = React.InputHTMLAttributes<HTMLInputElement> & {
  invalid?: boolean;
};

export function Input({ invalid, className = "", ...props }: InputProps) {
  return (
    <input
      {...props}
      aria-invalid={invalid || undefined}
      className={`${fieldBase} ${invalid ? stateClasses.error : stateClasses.default} ${className}`}
    />
  );
}
