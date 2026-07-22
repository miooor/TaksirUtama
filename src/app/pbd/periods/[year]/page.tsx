import { BookOpenCheck } from "lucide-react";
import { AppShell } from "@/components/shared/AppShell";
import { PageHeader } from "@/components/shared/PageHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { getAllPbdRecords, listPbdClassesFromRecords, listPbdSubjectTabs } from "@/lib/pbd/data";
import { getLanguage, text } from "@/lib/i18n";
import { getPbdPageContext, pbdBasePath, pbdSemesterHref } from "@/lib/pbdPages";

export default async function PbdPeriodHomePage({ params, searchParams }: { params: Promise<{ year: string }>; searchParams: Promise<{ semester?: string }> }) {
  const query = await searchParams;
  const { school, period, semester } = await getPbdPageContext(params, query.semester);
  const [subjects, records] = await Promise.all([listPbdSubjectTabs(school, period), getAllPbdRecords(school, period)]);
  const classes = listPbdClassesFromRecords(records);
  const language = await getLanguage();
  const base = pbdBasePath(period);

  return (
    <AppShell>
      <PageHeader eyebrow={`Semester ${semester} · ${period.year}`} title={text(language, { ms: "Pilih analisis", en: "Choose analysis" })} description={period.reportName} icon={BookOpenCheck} actions={<Button variant="outline" size="sm" href={`/pbd/entry?year=${period.year}&semester=${semester}`}>{text(language, { ms: "Isi PBD", en: "Enter PBD" })}</Button>} />
      <div className="mt-6 grid gap-4 md:grid-cols-3">
        {[
          { href: pbdSemesterHref(`${base}/subjects`, semester), title: text(language, { ms: "Subjek / Panitia", en: "Subjects / Panels" }), desc: `${subjects.length} ${text(language, { ms: "subjek", en: "subjects" })}` },
          { href: pbdSemesterHref(`${base}/classes`, semester), title: text(language, { ms: "Kelas", en: "Classes" }), desc: `${classes.length} ${text(language, { ms: "kelas", en: "classes" })}` },
          { href: pbdSemesterHref(`${base}/years`, semester), title: text(language, { ms: "Tahun", en: "Years" }), desc: text(language, { ms: "Tahun 1 hingga 6", en: "Years 1 to 6" }) },
        ].map((item) => (
          <a key={item.href} href={item.href} className="group">
            <Card hover className="h-full">
              <CardContent className="p-5">
                <h2 className="font-display font-semibold text-text-primary group-hover:text-primary-700">{item.title}</h2>
                <p className="mt-2 text-sm tabular-nums text-text-muted">{item.desc}</p>
              </CardContent>
            </Card>
          </a>
        ))}
      </div>
    </AppShell>
  );
}
