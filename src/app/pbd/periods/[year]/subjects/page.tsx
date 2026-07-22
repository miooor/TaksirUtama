import Link from "next/link";
import { AppShell } from "@/components/shared/AppShell";
import { Card, CardContent } from "@/components/ui/card";
import { listPbdSubjectTabs } from "@/lib/pbd/data";
import { getLanguage, text } from "@/lib/i18n";
import { getPbdPageContext, pbdBasePath, pbdSemesterHref } from "@/lib/pbdPages";

export default async function PbdPeriodSubjectsPage({ params, searchParams }: { params: Promise<{ year: string }>; searchParams: Promise<{ semester?: string }> }) {
  const query = await searchParams;
  const { school, period, semester } = await getPbdPageContext(params, query.semester);
  const subjects = await listPbdSubjectTabs(school, period);
  const language = await getLanguage();
  return (
    <AppShell>
      <h1 className="font-display text-2xl font-bold tracking-tight text-text-primary">{text(language, { ms: "Subjek / Panitia", en: "Subjects / Panels" })} · Semester {semester} · {period.year}</h1>
      <div className="mt-5 grid gap-4 md:grid-cols-3">
        {subjects.map((subject) => (
          <Link key={subject} href={pbdSemesterHref(`${pbdBasePath(period)}/subjects/${encodeURIComponent(subject)}`, semester)} className="group">
            <Card hover className="h-full">
              <CardContent className="p-5 font-semibold text-text-primary group-hover:text-primary-700">
                {subject}
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </AppShell>
  );
}
