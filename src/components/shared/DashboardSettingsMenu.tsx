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
      <summary className="flex cursor-pointer list-none items-center gap-2 rounded-md border px-3 py-1.5 text-sm">
        <Settings2 className="h-4 w-4" />
        <span>{lang === "en" ? "Settings" : "Tetapan"}</span>
      </summary>
      <div className="absolute left-0 top-full z-20 mt-2 w-[min(18rem,calc(100vw-2rem))] rounded-md border bg-white p-4 shadow-[0_10px_24px_rgba(15,23,42,0.16)]">
        <>
          <Link href="/settings/data-sources" className="block rounded-md border px-3 py-2 text-sm font-medium hover:bg-slate-50">
            {lang === "en" ? "Data sources" : "Sumber data"}
          </Link>
          <div>
              <p className="mt-4 text-xs font-medium uppercase text-slate-500">
                {lang === "en" ? "Language" : "Bahasa"}
              </p>
              <div className="mt-2 flex gap-2">
                <button
                  type="button"
                  onClick={() => updateLanguage("ms")}
                  className={`rounded-md border px-3 py-1.5 text-sm ${lang === "ms" ? "bg-teal-50 font-medium text-teal-800" : ""}`}
                >
                  BM
                </button>
                <button
                  type="button"
                  onClick={() => updateLanguage("en")}
                  className={`rounded-md border px-3 py-1.5 text-sm ${lang === "en" ? "bg-teal-50 font-medium text-teal-800" : ""}`}
                >
                  EN
                </button>
              </div>
          </div>

          <div className="mt-4 border-t pt-4">
            <p className="text-xs font-medium uppercase text-slate-500">
              {lang === "en" ? "Appearance" : "Paparan"}
            </p>
            <div className="mt-2 flex gap-2">
              <button
                type="button"
                onClick={() => updateTheme("light")}
                className="flex flex-1 items-center justify-center rounded-md border bg-teal-50 px-3 py-2 text-sm font-medium text-teal-800 dark:bg-transparent dark:font-normal dark:text-current"
              >
                {lang === "en" ? "Light" : "Cerah"}
              </button>
              <button
                type="button"
                onClick={() => updateTheme("dark")}
                className="flex flex-1 items-center justify-center rounded-md border px-3 py-2 text-sm dark:bg-teal-50 dark:font-medium dark:text-teal-800"
              >
                {lang === "en" ? "Dark" : "Gelap"}
              </button>
            </div>
          </div>

          {isDashboard ? (
            <form action="/api/admin/refresh" method="post" className="mt-4 border-t pt-4">
              <input type="hidden" name="lang" value={lang} />
              <button className="w-full rounded-md border px-3 py-2 text-sm font-medium hover:bg-slate-50">
                {lang === "en" ? "Refresh data" : "Muat semula data"}
              </button>
            </form>
          ) : null}
        </>
      </div>
    </details>
  );
}
