import Link from "next/link";
import { BookOpenCheck } from "lucide-react";
import { AppShell } from "@/components/shared/AppShell";
import { PageHeader } from "@/components/shared/PageHeader";
import { DataReadinessPanel } from "@/components/pbd/DataReadinessPanel";
import { calculatePbdReadiness } from "@/lib/pbd/readiness";
import { getAllPbdRecords, listPbdClassesFromRecords, listPbdSubjectTabs } from "@/lib/pbd/data";
import { getLanguage, text } from "@/lib/i18n";
import { getPbdPageContext, pbdBasePath } from "@/lib/pbdPages";

export default async function PbdPeriodHomePage({ params }: { params: Promise<{ year: string }> }) {
  const { school, period } = await getPbdPageContext(params);
  const [subjects, records] = await Promise.all([listPbdSubjectTabs(school, period), getAllPbdRecords(school, period)]);
  const classes = listPbdClassesFromRecords(records);
  const readiness = calculatePbdReadiness(records);
  const language = await getLanguage();
  const base = pbdBasePath(period);

  return (
    <AppShell>
      <PageHeader eyebrow={`PBD ${period.year}`} title={text(language, { ms: "Pilih analisis", en: "Choose analysis" })} description={period.reportName} icon={BookOpenCheck} actions={<Link href={`/pbd/entry?year=${period.year}&semester=${period.semester ?? "1"}`} className="rounded-md border px-3 py-2 text-sm font-medium">{text(language, { ms: "Isi PBD", en: "Enter PBD" })}</Link>} />
      <div className="mt-6 grid gap-4 md:grid-cols-3">
        <Link href={`${base}/subjects`} className="group rounded-lg border bg-white p-5 hover:bg-stone-50">
          <h2 className="font-semibold">{text(language, { ms: "Subjek / Panitia", en: "Subjects / Panels" })}</h2>
          <p className="mt-2 text-sm text-slate-600">{subjects.length} {text(language, { ms: "subjek", en: "subjects" })}</p>
        </Link>
        <Link href={`${base}/classes`} className="group rounded-lg border bg-white p-5 hover:bg-stone-50">
          <h2 className="font-semibold">{text(language, { ms: "Kelas", en: "Classes" })}</h2>
          <p className="mt-2 text-sm text-slate-600">{classes.length} {text(language, { ms: "kelas", en: "classes" })}</p>
        </Link>
        <Link href={`${base}/years`} className="group rounded-lg border bg-white p-5 hover:bg-stone-50">
          <h2 className="font-semibold">{text(language, { ms: "Tahun", en: "Years" })}</h2>
          <p className="mt-2 text-sm text-slate-600">{text(language, { ms: "Tahun 1 hingga 6", en: "Years 1 to 6" })}</p>
        </Link>
      </div>
      <div className="mt-6"><DataReadinessPanel readiness={readiness} language={language} /></div>
    </AppShell>
  );
}
