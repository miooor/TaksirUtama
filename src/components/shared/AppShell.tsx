import Link from "next/link";
import Image from "next/image";
import { Suspense } from "react";
import { AppNav } from "@/components/shared/AppNav";
import { Breadcrumbs } from "@/components/shared/Breadcrumbs";
import { DashboardSettingsMenu } from "@/components/shared/DashboardSettingsMenu";
import { SiteFooter } from "@/components/shared/SiteFooter";
import { YearMenu } from "@/components/shared/YearMenu";
import { requireSchoolContext } from "@/lib/auth";
import { assessmentPath, listPeriodYears } from "@/lib/config/periods";
import { isUasaDataAvailable } from "@/lib/config/uasaAvailability";
import { getLanguage } from "@/lib/i18n";
import { hasClerk } from "@/lib/config/env";
import { ClerkLogoutButton } from "@/components/auth/ClerkLogoutButton";

export async function AppShell({ children, chrome = true }: { children: React.ReactNode; chrome?: boolean }) {
  const language = await getLanguage();
  const school = chrome ? await requireSchoolContext() : null;
  const assessmentPeriods = school?.assessmentPeriods ?? [];
  const pbdPeriods = school?.pbdPeriods ?? [];
  const defaultUpsaPeriod = school?.defaultUpsaPeriod ?? null;
  const defaultUasaPeriod = school?.defaultUasaPeriod ?? null;
  const defaultPbdPeriod = school?.defaultPbdPeriod ?? null;
  const enabledAssessmentPeriods = assessmentPeriods.filter((period) => period.enabled);
  const enabledPbdPeriods = pbdPeriods.filter((period) => period.enabled);
  const years = listPeriodYears(enabledAssessmentPeriods, enabledPbdPeriods);
  const defaultYear = defaultUpsaPeriod?.year ?? defaultUasaPeriod?.year ?? defaultPbdPeriod?.year ?? years[0] ?? "2026";
  const upsaHref = defaultUpsaPeriod ? assessmentPath(defaultUpsaPeriod, "/classes") : "/upsa/classes";
  const uasaReadyYears = enabledAssessmentPeriods
    .filter((period) => period.assessment === "uasa" && isUasaDataAvailable(period))
    .map((period) => period.year);
  const uasaHref = defaultUasaPeriod && isUasaDataAvailable(defaultUasaPeriod) ? assessmentPath(defaultUasaPeriod, "/classes") : "/uasa";
  const pbdHref = defaultPbdPeriod ? `/pbd/periods/${defaultPbdPeriod.year}` : "/pbd";
  return (
    <div className="min-h-screen">
      {chrome ? (
        <header className="border-b bg-stone-50">
          <div className="mx-auto flex max-w-6xl flex-col gap-4 px-4 py-4 sm:px-6 md:flex-row md:items-center md:justify-between">
            <Link href="/" className="flex min-w-0 items-center gap-3">
              <Image src={school!.logoPath} alt="" width={40} height={40} className="h-10 w-10 object-contain" />
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-slate-600">{school!.name}</p>
                <p className="truncate text-base font-semibold">{school!.systemName}</p>
              </div>
            </Link>
            <div className="flex min-w-0 flex-wrap items-center gap-2 md:justify-end">
              <AppNav
                language={language}
                defaultYear={defaultYear}
                years={years}
                upsaFallbackHref={upsaHref}
                uasaFallbackHref={uasaHref}
                uasaReadyYears={uasaReadyYears}
                pbdFallbackHref={pbdHref}
              />
              <YearMenu
                language={language}
                years={years}
                defaultYear={defaultYear}
                uasaReadyYears={uasaReadyYears}
              />
              <Suspense fallback={null}>
                <DashboardSettingsMenu language={language} />
              </Suspense>
              {hasClerk ? (
                <ClerkLogoutButton label={language === "en" ? "Log out" : "Keluar"} />
              ) : (
                <form action="/api/auth/logout" method="post">
                  <button className="rounded-md border px-3 py-1.5">{language === "en" ? "Log out" : "Keluar"}</button>
                </form>
              )}
            </div>
          </div>
        </header>
      ) : null}
      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
        {chrome ? <Breadcrumbs language={language} /> : null}
        {children}
      </main>
      {chrome ? <SiteFooter school={school!} /> : null}
    </div>
  );
}
