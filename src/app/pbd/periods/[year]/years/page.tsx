import Link from "next/link";
import { AppShell } from "@/components/shared/AppShell";
import { Card, CardContent } from "@/components/ui/card";
import { getLanguage, text } from "@/lib/i18n";
import { getPbdPageContext, pbdBasePath, pbdSemesterHref } from "@/lib/pbdPages";

export default async function PbdPeriodYearsPage({ params, searchParams }: { params: Promise<{ year: string }>; searchParams: Promise<{ semester?: string }> }) {
  const query = await searchParams;
  const { period, semester } = await getPbdPageContext(params, query.semester);
  const language = await getLanguage();
  return (
    <AppShell>
      <h1 className="font-display text-2xl font-bold tracking-tight text-text-primary">{text(language, { ms: "Tahun PBD", en: "PBD years" })} · Semester {semester} · {period.year}</h1>
      <div className="mt-5 grid gap-4 md:grid-cols-3">
        {[1, 2, 3, 4, 5, 6].map((level) => (
          <Link key={level} href={pbdSemesterHref(`${pbdBasePath(period)}/years/${level}`, semester)} className="group">
            <Card hover className="h-full">
              <CardContent className="p-5 font-semibold text-text-primary group-hover:text-primary-700">
                {text(language, { ms: "Tahun", en: "Year" })} {level}
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </AppShell>
  );
}
