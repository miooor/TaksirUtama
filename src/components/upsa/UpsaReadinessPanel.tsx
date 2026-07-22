import { MetricCard } from "@/components/shared/MetricCard";
import type { ReturnTypeOfUpsaReadiness } from "@/types/readiness";
import type { Language } from "@/lib/i18n";
import { text } from "@/lib/i18n";

export function UpsaReadinessPanel({ readiness, language = "ms" }: { readiness: ReturnTypeOfUpsaReadiness; language?: Language }) {
  return (
    <section className="rounded-xl border border-border-default bg-surface-card p-5 shadow-card">
      <div className="flex items-end justify-between gap-4 border-b border-border-default pb-4">
        <div>
          <p className="text-sm font-semibold text-primary-600">{text(language, { ms: "Kesediaan data UPSA", en: "UPSA data readiness" })}</p>
          <h2 className="mt-1 font-display text-lg font-semibold text-text-primary">{text(language, { ms: "Mengikut subjek", en: "By subject" })}</h2>
        </div>
        <p className="text-sm tabular-nums text-text-muted">{readiness.completionPercentage.toFixed(1)}% {text(language, { ms: "lengkap", en: "complete" })}</p>
      </div>
      <div className="mt-4 grid gap-4 md:grid-cols-4">
        <MetricCard label={text(language, { ms: "Sel markah diisi", en: "Filled mark cells" })} value={readiness.enteredCells} tone="success" />
        <MetricCard label={text(language, { ms: "Sel markah kosong", en: "Empty mark cells" })} value={readiness.missingCells} tone="warning" />
        <MetricCard label="TH" value={readiness.absentCells} />
        <MetricCard label={text(language, { ms: "Jumlah sel", en: "Total cells" })} value={readiness.totalCells} />
      </div>
      <div className="mt-5 overflow-x-auto rounded-lg border border-border-default">
        <table className="min-w-[34rem] w-full text-sm">
          <thead>
            <tr>
              {[text(language, { ms: "Subjek", en: "Subject" }), text(language, { ms: "Diisi", en: "Filled" }), text(language, { ms: "Kosong", en: "Empty" }), "TH", text(language, { ms: "Peratus lengkap", en: "Completion rate" }), text(language, { ms: "Status", en: "Status" })].map((heading) => (
                <th key={heading} className="whitespace-nowrap border-b border-border-default bg-surface-inset px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-text-muted">{heading}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {readiness.subjectReadiness.map((subject) => (
              <tr key={subject.subjectCode} className="border-b border-border-default transition-colors last:border-b-0 hover:bg-surface-inset/60">
                <td className="px-4 py-3 font-medium text-text-primary">{subject.subjectCode}</td>
                <td className="px-4 py-3 tabular-nums">{subject.entered}</td>
                <td className="px-4 py-3 tabular-nums">{subject.missing}</td>
                <td className="px-4 py-3 tabular-nums">{subject.absent}</td>
                <td className="px-4 py-3 tabular-nums">{subject.completionPercentage.toFixed(1)}%</td>
                <td className="px-4 py-3">
                  <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${subject.status === "Lengkap" ? "bg-success-surface text-success-text" : subject.status === "Belum diisi" ? "bg-warning-surface text-warning-text" : "bg-info-surface text-info-text"}`}>
                    {subject.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
