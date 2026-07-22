"use client";

import { Settings2 } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import type { Language } from "@/lib/i18n";

export function DashboardSettingsMenu({ language }: { language: Language }) {
  const pathname = usePathname();
  const router = useRouter();
  const lang = language;
  const isDashboard = pathname === "/" || pathname === "/dashboard";
  function updateTheme(nextTheme: "light" | "dark") {
    document.documentElement.classList.toggle("dark", nextTheme === "dark");
    document.documentElement.dataset.theme = nextTheme;
    localStorage.setItem("ssp-theme", nextTheme);
  }

  function updateLanguage(nextLanguage: Language) {
    document.cookie = `ssp_lang=${nextLanguage}; path=/; max-age=${60 * 60 * 24 * 365}; samesite=lax`;
    router.refresh();
  }

  return (
    <details className="relative">
      <summary className="flex cursor-pointer list-none items-center gap-2 rounded-lg border border-border-default px-3 py-1.5 text-sm font-medium text-text-secondary transition-colors hover:bg-surface-inset hover:text-text-primary">
        <Settings2 className="h-4 w-4" />
        <span>{lang === "en" ? "Settings" : "Tetapan"}</span>
      </summary>
      <div className="absolute left-0 top-full z-20 mt-2 w-[min(18rem,calc(100vw-2rem))] rounded-xl border border-border-default bg-surface-overlay p-4 shadow-overlay animate-fade-in">
        <>
          <Link href="/settings/data-sources" className="block rounded-lg border border-border-default px-3 py-2 text-sm font-medium text-text-secondary transition-colors hover:bg-surface-inset hover:text-text-primary">
            {lang === "en" ? "Data sources" : "Sumber data"}
          </Link>
          <div>
              <p className="mt-4 text-xs font-semibold uppercase tracking-wider text-text-muted">
                {lang === "en" ? "Language" : "Bahasa"}
              </p>
              <div className="mt-2 flex gap-2">
                <button
                  type="button"
                  onClick={() => updateLanguage("ms")}
                  className={`rounded-lg border px-3 py-1.5 text-sm transition-colors ${lang === "ms" ? "border-primary-200 bg-primary-50 font-semibold text-primary-700" : "border-border-default text-text-secondary hover:bg-surface-inset"}`}
                >
                  BM
                </button>
                <button
                  type="button"
                  onClick={() => updateLanguage("en")}
                  className={`rounded-lg border px-3 py-1.5 text-sm transition-colors ${lang === "en" ? "border-primary-200 bg-primary-50 font-semibold text-primary-700" : "border-border-default text-text-secondary hover:bg-surface-inset"}`}
                >
                  EN
                </button>
              </div>
          </div>

          <div className="mt-4 border-t border-border-default pt-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-text-muted">
              {lang === "en" ? "Appearance" : "Paparan"}
            </p>
            <div className="mt-2 flex gap-2">
              <button
                type="button"
                onClick={() => updateTheme("light")}
                className="flex flex-1 items-center justify-center rounded-lg border border-border-default px-3 py-2 text-sm text-text-secondary transition-colors hover:bg-surface-inset dark:border-border-default dark:bg-transparent dark:text-text-secondary"
              >
                {lang === "en" ? "Light" : "Cerah"}
              </button>
              <button
                type="button"
                onClick={() => updateTheme("dark")}
                className="flex flex-1 items-center justify-center rounded-lg border border-border-default px-3 py-2 text-sm text-text-secondary transition-colors hover:bg-surface-inset dark:border-primary-300 dark:bg-primary-50 dark:font-semibold dark:text-primary-700"
              >
                {lang === "en" ? "Dark" : "Gelap"}
              </button>
            </div>
          </div>

          {isDashboard ? (
            <form action="/api/admin/refresh" method="post" className="mt-4 border-t border-border-default pt-4">
              <input type="hidden" name="lang" value={lang} />
              <button className="w-full rounded-lg border border-border-default px-3 py-2 text-sm font-medium text-text-secondary transition-colors hover:bg-surface-inset hover:text-text-primary">
                {lang === "en" ? "Refresh data" : "Muat semula data"}
              </button>
            </form>
          ) : null}
        </>
      </div>
    </details>
  );
}
