import Link from "next/link";
import { AppShell } from "@/components/shared/AppShell";
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
      <h1 className="text-2xl font-semibold">{text(language, { ms: "Kelas PBD", en: "PBD classes" })} · Semester {semester} · {period.year}</h1>
      <div className="mt-6 space-y-6">
        {[...grouped.entries()].map(([level, levelClasses]) => (
          <section key={level}>
            <h2 className="text-lg font-semibold">{text(language, { ms: "Tahun", en: "Year" })} {level}</h2>
            <div className="mt-3 grid gap-4 md:grid-cols-3">
              {levelClasses.map((className) => (
                <Link key={className} href={pbdSemesterHref(`${pbdBasePath(period)}/classes/${encodeURIComponent(className)}`, semester)} className="rounded-lg border bg-white p-5 font-semibold">
                  {className}
                </Link>
              ))}
            </div>
          </section>
        ))}
      </div>
    </AppShell>
  );
}
