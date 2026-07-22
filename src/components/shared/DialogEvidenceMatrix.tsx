import Link from "next/link";
import { ArrowRight } from "lucide-react";

type MatrixMetric = {
  label: string;
  value: number | null;
  display: string;
  tone: "high-good" | "low-good" | "attention" | "neutral";
};

type MatrixRow = {
  key: string;
  label: string;
  subtitle?: string;
  badges: Array<{ label: string; tone?: "default" | "success" | "warning" }>;
  metrics: MatrixMetric[];
  action?: { href: string; label: string };
};

function barColor(metric: MatrixMetric) {
  if (metric.value === null) return "bg-surface-sunken";
  if (metric.tone === "attention") {
    if (metric.value >= 90) return "bg-danger";
    if (metric.value >= 45) return "bg-accent-400";
    return "bg-success";
  }
  if (metric.tone === "low-good") {
    if (metric.value >= 30) return "bg-danger";
    if (metric.value >= 15) return "bg-accent-400";
    return "bg-success";
  }
  if (metric.tone === "high-good") {
    if (metric.value >= 75) return "bg-success";
    if (metric.value >= 50) return "bg-accent-400";
    return "bg-danger";
  }
  return "bg-primary-600";
}

function badgeClass(tone: MatrixRow["badges"][number]["tone"]) {
  if (tone === "success") return "bg-success-surface text-success-text";
  if (tone === "warning") return "bg-danger-surface text-danger-text";
  return "bg-surface-inset text-text-secondary";
}

function metricWidth(value: number | null) {
  if (value === null) return "0%";
  return `${Math.max(4, Math.min(100, value))}%`;
}

export function DialogEvidenceMatrix({
  title,
  description,
  rows,
}: {
  title: string;
  description: string;
  rows: MatrixRow[];
}) {
  return (
    <section className="overflow-hidden rounded-xl border border-border-default bg-surface-card shadow-card">
      <div className="border-b border-border-default px-5 py-4">
        <h2 className="font-display text-lg font-semibold text-text-primary">{title}</h2>
        <p className="mt-1 text-sm text-text-muted">{description}</p>
      </div>
      {rows.length === 0 ? <p className="px-5 py-4 text-sm text-text-muted">Tiada data sepadan untuk tapisan semasa.</p> : null}
      <div className="divide-y divide-border-default">
        {rows.map((row, index) => (
          <article key={row.key} className="grid gap-4 px-5 py-4 xl:grid-cols-[minmax(12rem,0.9fr)_minmax(24rem,2fr)_auto] xl:items-center">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-semibold text-text-disabled">{index + 1}</span>
                <h3 className="font-semibold text-text-primary">{row.label}</h3>
              </div>
              {row.subtitle ? <p className="mt-1 text-sm text-text-muted">{row.subtitle}</p> : null}
              <div className="mt-2 flex flex-wrap gap-2">
                {row.badges.map((badge) => (
                  <span key={badge.label} className={`rounded-full px-2.5 py-1 text-xs font-medium ${badgeClass(badge.tone)}`}>
                    {badge.label}
                  </span>
                ))}
              </div>
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              {row.metrics.map((metric) => (
                <div key={metric.label} className="grid gap-1">
                  <div className="flex items-center justify-between gap-3 text-xs">
                    <span className="font-medium text-text-muted">{metric.label}</span>
                    <span className="font-semibold text-text-primary">{metric.display}</span>
                  </div>
                  <div className="h-2 rounded-full bg-surface-sunken">
                    <div className={`h-2 rounded-full ${barColor(metric)}`} style={{ width: metricWidth(metric.value) }} />
                  </div>
                </div>
              ))}
            </div>
            {row.action ? (
              <Link href={row.action.href} className="action-primary inline-flex items-center justify-center gap-2 whitespace-nowrap">
                {row.action.label} <ArrowRight className="h-4 w-4" />
              </Link>
            ) : null}
          </article>
        ))}
      </div>
    </section>
  );
}
