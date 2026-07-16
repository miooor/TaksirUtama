import type { LucideIcon } from "lucide-react";

type Tone = "teal" | "sky" | "amber" | "rose" | "emerald" | "violet" | "cyan" | "indigo";

const toneClasses: Record<Tone, string> = {
  teal: "text-teal-700",
  sky: "text-sky-700",
  amber: "text-amber-700",
  rose: "text-rose-700",
  emerald: "text-emerald-700",
  violet: "text-violet-700",
  cyan: "text-cyan-700",
  indigo: "text-indigo-700",
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
      <Icon className={`mt-0.5 h-5 w-5 ${toneClasses[tone]}`} />
      <div>
        <h2 className="text-lg font-semibold">{title}</h2>
        {description ? <p className="mt-1 text-sm text-slate-500">{description}</p> : null}
      </div>
    </div>
  );
}
