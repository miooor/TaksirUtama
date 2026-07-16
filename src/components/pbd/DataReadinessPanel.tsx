import Link from "next/link";
import { MetricCard } from "@/components/shared/MetricCard";
import type { ReturnTypeOfReadiness } from "@/types/readiness";
import type { Language } from "@/lib/i18n";
import { text } from "@/lib/i18n";

export function DataReadinessPanel({ readiness, language = "ms" }: { readiness: ReturnTypeOfReadiness; language?: Language }) {
  const issueLabels: Record<string, string> =
    language === "en"
      ? {
          "Jumlah TP tidak sepadan dengan jumlah murid": "TP total does not match pupil count",
          "Semua nilai TP belum diisi": "All TP values are still empty",
          "Murid belum ditaksir": "Pupils not yet assessed",
        }
      : {};
  return (
    <section className="rounded-lg border bg-white p-5">
      <div className="flex flex-col gap-3 border-b pb-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-medium text-teal-700">{text(language, { ms: "Kesediaan data", en: "Data readiness" })}</p>
          <h2 className="mt-1 text-lg font-semibold">{text(language, { ms: "Sebelum 21 Mei 2026", en: "Before 21 May 2026" })}</h2>
          <p className="mt-2 text-sm text-slate-600">{text(language, {
            ms: "Semak kelas dan subjek yang masih belum lengkap sebelum analisis rasmi digunakan.",
            en: "Check classes and subjects that are still incomplete before official analysis is used.",
          })}</p>
        </div>
        <p className="text-sm text-slate-500">{readiness.completionPercentage.toFixed(1)}% {text(language, { ms: "lengkap", en: "complete" })}</p>
      </div>
      <div className="mt-4 grid gap-4 md:grid-cols-3">
        <MetricCard label={text(language, { ms: "Rekod lengkap", en: "Complete records" })} value={readiness.completeRecords} tone="success" />
        <MetricCard label={text(language, { ms: "Rekod belum lengkap", en: "Incomplete records" })} value={readiness.incompleteRecords} tone="warning" />
        <MetricCard label={text(language, { ms: "Jumlah rekod", en: "Total records" })} value={readiness.totalRecords} />
      </div>
      <div className="mt-5 grid gap-5 lg:grid-cols-2">
        <div>
          <h3 className="text-sm font-medium text-slate-700">{text(language, { ms: "Kelas paling belum lengkap", en: "Most incomplete classes" })}</h3>
          <ul className="mt-3 space-y-2 text-sm">
            {readiness.incompleteClasses.slice(0, 6).map((item) => (
              <li key={item.className} className="flex items-center justify-between">
                <Link href={`/pbd/classes/${encodeURIComponent(item.className)}`} className="font-medium">{item.className}</Link>
                <span className="text-slate-500">{item.count} {text(language, { ms: "subjek", en: "subjects" })}</span>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <h3 className="text-sm font-medium text-slate-700">{text(language, { ms: "Subjek paling belum lengkap", en: "Most incomplete subjects" })}</h3>
          <ul className="mt-3 space-y-2 text-sm">
            {readiness.incompleteSubjects.slice(0, 6).map((item) => (
              <li key={item.subjectCode} className="flex items-center justify-between">
                <Link href={`/pbd/subjects/${encodeURIComponent(item.subjectCode)}`} className="font-medium">{item.subjectCode}</Link>
                <span className="text-slate-500">{item.count} {text(language, { ms: "kelas", en: "classes" })}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
      <div className="mt-5 border-t pt-4">
        <h3 className="text-sm font-medium text-slate-700">{text(language, { ms: "Ringkasan isu", en: "Issue summary" })}</h3>
        <ul className="mt-3 flex flex-wrap gap-2 text-sm">
          {readiness.issueSummary.map((item) => (
            <li key={item.issue} className="rounded-full bg-stone-100 px-3 py-1 text-stone-700">
              {issueLabels[item.issue] ?? item.issue}: {item.count}
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
