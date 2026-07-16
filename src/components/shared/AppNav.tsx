"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import type { Language } from "@/lib/i18n";

export function AppNav({
  language,
  defaultYear = "2026",
  years = [],
  upsaFallbackHref = "/upsa/classes",
  uasaFallbackHref = "/uasa",
  pbdFallbackHref = "/pbd",
  uasaReadyYears = [],
}: {
  language: Language;
  defaultYear?: string;
  years?: string[];
  upsaFallbackHref?: string;
  uasaFallbackHref?: string;
  pbdFallbackHref?: string;
  uasaReadyYears?: string[];
}) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const pathYear = pathname.match(/^\/assessments\/(\d{4})\//)?.[1] ?? pathname.match(/^\/pbd\/periods\/(\d{4})(?:\/|$)/)?.[1];
  const queryYear = searchParams.get("year");
  const selectedYear = (pathYear && years.includes(pathYear)) || (pathYear && years.length === 0)
    ? pathYear
      : queryYear && years.includes(queryYear)
      ? queryYear
      : defaultYear;
  const upsaHref = selectedYear ? `/assessments/${selectedYear}/upsa/classes` : upsaFallbackHref;
  const uasaHref = selectedYear && uasaReadyYears.includes(selectedYear) ? `/assessments/${selectedYear}/uasa/classes` : uasaFallbackHref;
  const pbdHref = selectedYear ? `/pbd/periods/${selectedYear}` : pbdFallbackHref;
  const items = [
    { href: selectedYear ? `/dashboard?year=${selectedYear}` : "/dashboard", label: "Dashboard", active: pathname === "/dashboard" },
    { href: upsaHref, label: "UPSA", active: pathname.startsWith(`/assessments/${selectedYear}/upsa`) || pathname.startsWith("/upsa") },
    { href: uasaHref, label: "UASA", active: pathname.startsWith(`/assessments/${selectedYear}/uasa`) || pathname.startsWith("/uasa") },
    { href: pbdHref, label: "PBD", active: pathname.startsWith(`/pbd/periods/${selectedYear}`) || pathname === "/pbd" },
    { href: `/dialog-prestasi?year=${selectedYear}`, label: "DP", active: pathname.startsWith("/dialog-prestasi") },
    { href: "/intervensi", label: language === "en" ? "INTERVENTION" : "INTERVENSI", active: pathname.startsWith("/intervensi") },
    { href: "/insights", label: language === "en" ? "Insight" : "Dapatan", active: pathname.startsWith("/insights") },
  ];
  return (
    <nav className="flex min-w-0 flex-wrap items-center gap-1 text-sm">
      {items.map((item) => {
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`rounded-md px-3 py-2 ${item.active ? "bg-teal-50 font-medium text-teal-800" : "text-slate-600 hover:bg-slate-50"}`}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
