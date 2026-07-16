import Link from "next/link";
import { AppShell } from "@/components/shared/AppShell";
import { listPbdSubjectTabs } from "@/lib/pbd/data";
import { getLanguage, text } from "@/lib/i18n";
import { getPbdPageContext, pbdBasePath } from "@/lib/pbdPages";

export default async function PbdPeriodSubjectsPage({ params }: { params: Promise<{ year: string }> }) {
  const { school, period } = await getPbdPageContext(params);
  const subjects = await listPbdSubjectTabs(school, period);
  const language = await getLanguage();
  return (
    <AppShell>
      <h1 className="text-2xl font-semibold">{text(language, { ms: "Subjek / Panitia", en: "Subjects / Panels" })} {period.year}</h1>
      <div className="mt-5 grid gap-4 md:grid-cols-3">
        {subjects.map((subject) => (
          <Link key={subject} href={`${pbdBasePath(period)}/subjects/${encodeURIComponent(subject)}`} className="rounded-lg border bg-white p-5 font-semibold">
            {subject}
          </Link>
        ))}
      </div>
    </AppShell>
  );
}
