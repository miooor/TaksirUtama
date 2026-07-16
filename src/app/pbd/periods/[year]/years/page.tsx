import Link from "next/link";
import { AppShell } from "@/components/shared/AppShell";
import { getLanguage, text } from "@/lib/i18n";
import { getPbdPagePeriod, pbdBasePath } from "@/lib/pbdPages";

export default async function PbdPeriodYearsPage({ params }: { params: Promise<{ year: string }> }) {
  const period = await getPbdPagePeriod(params);
  const language = await getLanguage();
  return (
    <AppShell>
      <h1 className="text-2xl font-semibold">{text(language, { ms: "Tahun PBD", en: "PBD years" })} {period.year}</h1>
      <div className="mt-5 grid gap-4 md:grid-cols-3">
        {[1, 2, 3, 4, 5, 6].map((level) => (
          <Link key={level} href={`${pbdBasePath(period)}/years/${level}`} className="rounded-lg border bg-white p-5 font-semibold">
            {text(language, { ms: "Tahun", en: "Year" })} {level}
          </Link>
        ))}
      </div>
    </AppShell>
  );
}
