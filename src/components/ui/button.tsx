import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

type Variant = "primary" | "secondary" | "outline" | "ghost" | "danger";
type Size = "sm" | "md" | "lg";

const variantClasses: Record<Variant, string> = {
  primary:
    "border border-primary-700 bg-primary-700 text-white shadow-raised hover:bg-primary-800 hover:border-primary-800 disabled:hover:bg-primary-700",
  secondary:
    "border border-primary-200 bg-primary-50 text-primary-700 hover:bg-primary-100 disabled:hover:bg-primary-50",
  outline:
    "border border-border-strong bg-surface-card text-text-secondary hover:bg-surface-inset hover:text-text-primary disabled:hover:bg-surface-card",
  ghost:
    "border border-transparent bg-transparent text-text-secondary hover:bg-surface-inset hover:text-text-primary disabled:hover:bg-transparent",
  danger:
    "border border-danger bg-danger text-white shadow-raised hover:bg-danger-strong hover:border-danger-strong disabled:hover:bg-danger",
};

const sizeClasses: Record<Size, string> = {
  sm: "gap-1.5 rounded-md px-2.5 py-1.5 text-xs",
  md: "gap-2 rounded-lg px-3.5 py-2 text-sm",
  lg: "gap-2 rounded-lg px-5 py-2.5 text-sm",
};

const base =
  "inline-flex items-center justify-center font-semibold transition-[background,border-color,color,box-shadow,opacity] duration-150 disabled:cursor-not-allowed disabled:opacity-50";

type ButtonProps = {
  children: ReactNode;
  variant?: Variant;
  size?: Size;
  icon?: LucideIcon;
  href?: string;
  type?: "button" | "submit" | "reset";
  disabled?: boolean;
  loading?: boolean;
  className?: string;
  title?: string;
  "aria-label"?: string;
  name?: string;
  value?: string;
  onClick?: React.MouseEventHandler;
};

export function Button({
  children,
  variant = "primary",
  size = "md",
  icon: Icon,
  href,
  type = "button",
  disabled,
  loading,
  className = "",
  ...rest
}: ButtonProps) {
  const classes = `${base} ${variantClasses[variant]} ${sizeClasses[size]} ${className}`;
  const content = (
    <>
      {loading ? (
        <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" aria-hidden="true" />
      ) : Icon ? (
        <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
      ) : null}
      {children}
    </>
  );

  if (href && !disabled) {
    return (
      <Link href={href} className={classes} {...rest}>
        {content}
      </Link>
    );
  }
  return (
    <button type={type} disabled={disabled || loading} className={classes} {...rest}>
      {content}
    </button>
  );
}
