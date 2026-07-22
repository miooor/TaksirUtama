import { Suspense } from "react";
import { AppSidebar } from "@/components/shared/AppSidebar";
import { Breadcrumbs } from "@/components/shared/Breadcrumbs";
import { DashboardSettingsMenu } from "@/components/shared/DashboardSettingsMenu";
import { SiteFooter } from "@/components/shared/SiteFooter";
import { YearMenu } from "@/components/shared/YearMenu";
import { requireSchoolContext } from "@/lib/auth";
import { listPeriodYears } from "@/lib/config/periods";
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
  const uasaReadyYears = enabledAssessmentPeriods
    .filter((period) => period.assessment === "uasa" && isUasaDataAvailable(period))
    .map((period) => period.year);
  return (
    <div className="min-h-screen lg:flex">
      {chrome ? <AppSidebar schoolName={school!.name} systemName={school!.systemName} logoPath={school!.logoPath} year={defaultYear} controls={<>
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
                  <button className="w-full rounded-lg border border-border-default px-3 py-1.5 text-left text-sm text-text-secondary transition-colors hover:bg-surface-inset hover:text-text-primary">{language === "en" ? "Log out" : "Keluar"}</button>
                </form>
              )}
            </>} /> : null}
      <div className="min-w-0 flex-1">
      <main className="mx-auto min-w-0 max-w-7xl px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
        {chrome ? <Breadcrumbs language={language} /> : null}
        {children}
      </main>
      {chrome ? <SiteFooter school={school!} /> : null}
      </div>
    </div>
  );
}
