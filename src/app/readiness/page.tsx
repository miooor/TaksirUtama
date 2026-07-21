import Link from "next/link";
import { AppShell } from "@/components/shared/AppShell";
import { MetricCard } from "@/components/shared/MetricCard";
import { PageHeader } from "@/components/shared/PageHeader";
import { DataReadinessPanel } from "@/components/pbd/DataReadinessPanel";
import { getAllPbdRecords } from "@/lib/pbd/data";
import { calculatePbdReadiness } from "@/lib/pbd/readiness";
import { getAllAssessmentClassResultsWithRegistry } from "@/lib/upsa/data";
import { calculateUpsaReadiness, detectUnmatchedStudents } from "@/lib/upsa/readiness";
import { requireActorContext } from "@/lib/auth/actor";
import { assessmentClassPath } from "@/lib/assessmentPages";
import { ClipboardCheck, School } from "lucide-react";
import { SectionHeading } from "@/components/shared/SectionHeading";
import { getLanguage, text } from "@/lib/i18n";
import { getSchoolPreflightReport } from "@/lib/readiness/preflight";

export default async function ReadinessPage() {
  const context = await requireActorContext();
  const school = context.school;
  const { defaultPbdPeriod, defaultUpsaPeriod } = school;
  const [pbdResult, upsaResult, preflight] = await Promise.all([
    defaultPbdPeriod ? getAllPbdRecords(school, defaultPbdPeriod).then((data) => ({ data, error: null })).catch((error: Error) => ({ data: [], error })) : Promise.resolve({ data: [], error: null }),
    defaultUpsaPeriod ? getAllAssessmentClassResultsWithRegistry(context, defaultUpsaPeriod).then((data) => ({ data, error: null })).catch((error: Error) => ({ data: [], error })) : Promise.resolve({ data: [], error: null }),
    getSchoolPreflightReport(school),
  ]);
  const pbdRecords = pbdResult.data;
  const upsaResults = upsaResult.data;
  const pbdReadiness = calculatePbdReadiness(pbdRecords);
  const upsaReadiness = calculateUpsaReadiness(upsaResults);
  const unmatchedFindings = upsaResults.flatMap((result) => detectUnmatchedStudents(result));
  const language = await getLanguage();

  return (
    <AppShell>
      <PageHeader
        eyebrow={text(language, { ms: "Semakan data", en: "Data review" })}
        title={text(language, { ms: "Kesediaan data PBD dan UPSA", en: "PBD and UPSA data readiness" })}
        description={text(language, {
          ms: "Semak kelengkapan pengisian sebelum analisis rasmi atau slip digunakan.",
          en: "Check whether data entry is complete before official analysis or slips are used.",
        })}
        icon={ClipboardCheck}
      />

      <section className="mt-6 rounded-lg border bg-white p-5">
        <h2 className="text-lg font-semibold">Status sambungan dan format</h2>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          {preflight.map((report) => (
            <article key={report.key} className="rounded-md bg-stone-50 p-4">
              <div className="flex items-center justify-between gap-3">
                <h3 className="font-semibold">{report.label}</h3>
                <span className={report.status === "ready" ? "text-sm font-medium text-teal-700" : report.status === "warning" ? "text-sm font-medium text-amber-700" : "text-sm font-medium text-rose-700"}>
                  {report.status === "ready" ? "Sedia" : report.status === "warning" ? "Amaran" : "Belum sedia"}
                </span>
              </div>
              {report.findings.length ? (
                <ul className="mt-3 space-y-3 text-sm">
                  {report.findings.map((finding) => (
                    <li key={`${finding.code}:${finding.location}`}>
                      <p className="font-medium">{finding.location}: {finding.message}</p>
                      <p className="mt-1 text-slate-600">{finding.action}</p>
                    </li>
                  ))}
                </ul>
              ) : <p className="mt-2 text-sm text-slate-600">Buku kerja boleh dibaca dan mematuhi skema versi 1.</p>}
            </article>
          ))}
        </div>
        {pbdResult.error || upsaResult.error ? <p className="mt-4 text-sm font-medium text-rose-700" role="alert">Sebahagian analisis dikunci sehingga isu data di atas diselesaikan.</p> : null}
      </section>

      {unmatchedFindings.length > 0 ? (
        <section className="mt-6 rounded-lg border bg-white p-5">
          <h2 className="text-lg font-semibold">Padanan daftar murid</h2>
          <p className="mt-1 text-sm text-slate-600">Murid dalam sheet pentaksiran yang tidak sepadan dengan daftar sekolah.</p>
          <ul className="mt-4 space-y-3 text-sm">
            {unmatchedFindings.map((finding) => (
              <li key={`${finding.code}:${finding.location}`} className="rounded-md bg-amber-50 p-3">
                <p className="font-medium">{finding.location}: {finding.message}</p>
                <p className="mt-1 text-slate-600">{finding.action}</p>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <div className="mt-6">
        <DataReadinessPanel readiness={pbdReadiness} language={language} />
      </div>

      <section className="mt-6 rounded-lg border bg-white p-5">
        <div className="flex flex-col gap-3 border-b pb-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <SectionHeading
              icon={School}
              tone="sky"
              title={text(language, { ms: "Kesediaan UPSA mengikut kelas", en: "UPSA readiness by class" })}
              description={text(language, {
                ms: "Kenal pasti kelas yang masih mempunyai markah kosong supaya tindakan susulan boleh dibuat dengan cepat.",
                en: "Identify classes with missing marks so follow-up can happen quickly.",
              })}
            />
          </div>
          <p className="text-sm text-slate-500">
            {upsaReadiness.completionPercentage.toFixed(1)}% {text(language, { ms: "lengkap", en: "complete" })}
          </p>
        </div>

        <div className="mt-4 grid gap-4 md:grid-cols-4">
          <MetricCard label={text(language, { ms: "Sel markah diisi", en: "Marks entered" })} value={upsaReadiness.enteredCells} tone="success" />
          <MetricCard label={text(language, { ms: "Sel markah kosong", en: "Missing marks" })} value={upsaReadiness.missingCells} tone="warning" />
          <MetricCard label="TH" value={upsaReadiness.absentCells} />
          <MetricCard label={text(language, { ms: "Jumlah sel", en: "Total cells" })} value={upsaReadiness.totalCells} />
        </div>

        <div className="mt-5 overflow-x-auto rounded-lg border">
          <table className="min-w-[32rem] w-full text-sm">
            <thead className="bg-stone-50 text-left text-stone-600">
              <tr>
                <th className="px-4 py-3">{text(language, { ms: "Kelas", en: "Class" })}</th>
                <th className="px-4 py-3">{text(language, { ms: "Diisi", en: "Entered" })}</th>
                <th className="px-4 py-3">{text(language, { ms: "Kosong", en: "Missing" })}</th>
                <th className="px-4 py-3">TH</th>
                <th className="px-4 py-3">{text(language, { ms: "Peratus lengkap", en: "Completion" })}</th>
                <th className="px-4 py-3">{text(language, { ms: "Tindakan", en: "Action" })}</th>
              </tr>
            </thead>
            <tbody>
              {upsaReadiness.classSummaries.map((item) => (
                <tr key={item.className} className="border-t">
                  <td className="px-4 py-3 font-medium">{item.className}</td>
                  <td className="px-4 py-3">{item.enteredCells}</td>
                  <td className="px-4 py-3">{item.missingCells}</td>
                  <td className="px-4 py-3">{item.absentCells}</td>
                  <td className="px-4 py-3">{item.completionPercentage.toFixed(1)}%</td>
                  <td className="px-4 py-3">
                    <Link href={defaultUpsaPeriod ? assessmentClassPath(defaultUpsaPeriod, item.className) : `/upsa/classes/${encodeURIComponent(item.className)}`} className="action-primary text-sm">
                      {text(language, { ms: "Buka kelas", en: "Open class" })}
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </AppShell>
  );
}
