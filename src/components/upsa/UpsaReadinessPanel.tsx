import { MetricCard } from "@/components/shared/MetricCard";
import type { ReturnTypeOfUpsaReadiness } from "@/types/readiness";
import type { Language } from "@/lib/i18n";
import { text } from "@/lib/i18n";

export function UpsaReadinessPanel({ readiness, language = "ms" }: { readiness: ReturnTypeOfUpsaReadiness; language?: Language }) {
  return (
    <section className="rounded-lg border bg-white p-5">
      <div className="flex items-end justify-between gap-4 border-b pb-4">
        <div>
          <p className="text-sm font-medium text-teal-700">{text(language, { ms: "Kesediaan data UPSA", en: "UPSA data readiness" })}</p>
          <h2 className="mt-1 text-lg font-semibold">{text(language, { ms: "Mengikut subjek", en: "By subject" })}</h2>
        </div>
        <p className="text-sm text-slate-500">{readiness.completionPercentage.toFixed(1)}% {text(language, { ms: "lengkap", en: "complete" })}</p>
      </div>
      <div className="mt-4 grid gap-4 md:grid-cols-4">
        <MetricCard label={text(language, { ms: "Sel markah diisi", en: "Filled mark cells" })} value={readiness.enteredCells} tone="success" />
        <MetricCard label={text(language, { ms: "Sel markah kosong", en: "Empty mark cells" })} value={readiness.missingCells} tone="warning" />
        <MetricCard label="TH" value={readiness.absentCells} />
        <MetricCard label={text(language, { ms: "Jumlah sel", en: "Total cells" })} value={readiness.totalCells} />
      </div>
      <div className="mt-5 overflow-x-auto rounded-lg border">
        <table className="min-w-[34rem] w-full text-sm">
          <thead className="bg-stone-50 text-left text-stone-600">
            <tr><th className="px-4 py-3">{text(language, { ms: "Subjek", en: "Subject" })}</th><th className="px-4 py-3">{text(language, { ms: "Diisi", en: "Filled" })}</th><th className="px-4 py-3">{text(language, { ms: "Kosong", en: "Empty" })}</th><th className="px-4 py-3">TH</th><th className="px-4 py-3">{text(language, { ms: "Peratus lengkap", en: "Completion rate" })}</th><th className="px-4 py-3">{text(language, { ms: "Status", en: "Status" })}</th></tr>
          </thead>
          <tbody>
            {readiness.subjectReadiness.map((subject) => (
              <tr key={subject.subjectCode} className="border-t">
                <td className="px-4 py-3 font-medium">{subject.subjectCode}</td>
                <td className="px-4 py-3">{subject.entered}</td>
                <td className="px-4 py-3">{subject.missing}</td>
                <td className="px-4 py-3">{subject.absent}</td>
                <td className="px-4 py-3">{subject.completionPercentage.toFixed(1)}%</td>
                <td className="px-4 py-3">
                  <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${subject.status === "Lengkap" ? "bg-emerald-50 text-emerald-700" : subject.status === "Belum diisi" ? "bg-amber-50 text-amber-700" : "bg-sky-50 text-sky-700"}`}>
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
