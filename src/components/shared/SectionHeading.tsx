import type { LucideIcon } from "lucide-react";

type Tone = "teal" | "sky" | "amber" | "rose" | "emerald" | "violet" | "cyan" | "indigo";

const toneClasses: Record<Tone, string> = {
  teal: "bg-primary-50 text-primary-600",
  sky: "bg-info-surface text-info",
  amber: "bg-accent-50 text-accent-600",
  rose: "bg-danger-surface text-danger",
  emerald: "bg-success-surface text-success",
  violet: "bg-primary-50 text-primary-500",
  cyan: "bg-info-surface text-info-strong",
  indigo: "bg-primary-50 text-primary-700",
};

export function SectionHeading({
  icon: Icon,
  title,
  description,
  tone,
}: {
  icon: LucideIcon;
  title: string;
  description?: string;
  tone: Tone;
}) {
  return (
    <div className="flex items-start gap-3">
      <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${toneClasses[tone]}`}>
        <Icon className="h-[18px] w-[18px]" aria-hidden="true" />
      </span>
      <div className="min-w-0">
        <h2 className="font-display text-lg font-semibold text-text-primary">{title}</h2>
        {description ? <p className="mt-1 text-sm leading-5 text-text-muted">{description}</p> : null}
      </div>
    </div>
  );
}
