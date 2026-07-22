import Link from "next/link";
import { AppShell } from "@/components/shared/AppShell";
import { Card, CardContent } from "@/components/ui/card";
import { listPbdClasses } from "@/lib/pbd/data";
import { getLanguage, text } from "@/lib/i18n";
import { getPbdPageContext, pbdBasePath, pbdSemesterHref } from "@/lib/pbdPages";

export default async function PbdPeriodClassesPage({ params, searchParams }: { params: Promise<{ year: string }>; searchParams: Promise<{ semester?: string }> }) {
  const query = await searchParams;
  const { school, period, semester } = await getPbdPageContext(params, query.semester);
  const classes = await listPbdClasses(school, period);
  const language = await getLanguage();
  const grouped = Map.groupBy(classes, (className) => className[0]);
  return (
    <AppShell>
      <h1 className="font-display text-2xl font-bold tracking-tight text-text-primary">{text(language, { ms: "Kelas PBD", en: "PBD classes" })} · Semester {semester} · {period.year}</h1>
      <div className="mt-6 space-y-6">
        {[...grouped.entries()].map(([level, levelClasses]) => (
          <section key={level}>
            <h2 className="font-display text-lg font-semibold text-text-primary">{text(language, { ms: "Tahun", en: "Year" })} {level}</h2>
            <div className="mt-3 grid gap-4 md:grid-cols-3">
              {levelClasses.map((className) => (
                <Link key={className} href={pbdSemesterHref(`${pbdBasePath(period)}/classes/${encodeURIComponent(className)}`, semester)} className="group">
                  <Card hover className="h-full">
                    <CardContent className="p-5 font-semibold text-text-primary group-hover:text-primary-700">
                      {className}
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          </section>
        ))}
      </div>
    </AppShell>
  );
}
