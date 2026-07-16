import type { LucideIcon } from "lucide-react";

export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
  icon: Icon,
}: {
  eyebrow: string;
  title: string;
  description?: string;
  actions?: React.ReactNode;
  icon?: LucideIcon;
}) {
  return (
    <div className="flex flex-col gap-4 border-b pb-5 md:flex-row md:items-end md:justify-between">
      <div className="flex items-start gap-3">
        {Icon ? (
          <Icon className="mt-1 h-5 w-5 text-teal-700" />
        ) : null}
        <div>
          <h1 className="text-xl font-semibold tracking-normal">{title}</h1>
          <p className="mt-2 max-w-2xl text-sm text-slate-600">
            <span className="font-medium text-teal-700">{eyebrow}</span>
            {description ? ` · ${description}` : ""}
          </p>
        </div>
      </div>
      {actions ? <div className="flex flex-wrap gap-2 text-sm">{actions}</div> : null}
    </div>
  );
}
