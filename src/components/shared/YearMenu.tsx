"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { useState } from "react";
import type { Language } from "@/lib/i18n";

function selectedYearFromPath(pathname: string) {
  return pathname.match(/^\/assessments\/(\d{4})\//)?.[1] ?? pathname.match(/^\/pbd\/periods\/(\d{4})(?:\/|$)/)?.[1] ?? null;
}

function hrefForYear(pathname: string, searchParams: { toString(): string }, year: string, uasaReadyYears: string[]) {
  if (pathname.startsWith("/assessments/")) {
    return pathname.replace(/^\/assessments\/\d{4}\//, `/assessments/${year}/`);
  }
  if (pathname.startsWith("/pbd/periods/")) {
    const params = new URLSearchParams(searchParams.toString());
    const query = params.toString();
    const nextPath = pathname.replace(/^\/pbd\/periods\/\d{4}/, `/pbd/periods/${year}`);
    return query ? `${nextPath}?${query}` : nextPath;
  }
  if (pathname === "/pbd/entry" || pathname === "/pbd/setup" || pathname === "/pbd/interventions/entry" || pathname === "/school/setup") {
    const params = new URLSearchParams(searchParams.toString());
    params.set("year", year);
    params.delete("classId");
    return `${pathname}?${params.toString()}`;
  }
  if (pathname.startsWith("/upsa")) {
    return `/assessments/${year}/upsa/classes`;
  }
  if (pathname.startsWith("/uasa")) {
    return uasaReadyYears.includes(year) ? `/assessments/${year}/uasa/classes` : `/uasa?year=${year}`;
  }
  if (pathname.startsWith("/pbd")) {
    const params = new URLSearchParams(searchParams.toString());
    const semester = params.get("semester") === "2" ? "2" : "1";
    return `/pbd/periods/${year}?semester=${semester}`;
  }

  const params = new URLSearchParams(searchParams.toString());
  params.set("year", year);
  const query = params.toString();
  return query ? `${pathname}?${query}` : pathname;
}

export function YearMenu({
  language,
  years,
  defaultYear,
  uasaReadyYears = [],
}: {
  language: Language;
  years: string[];
  defaultYear: string;
  uasaReadyYears?: string[];
}) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const pathYear = selectedYearFromPath(pathname);
  const queryYear = searchParams.get("year");
  const current = (pathYear && years.includes(pathYear) ? pathYear : null) ?? (queryYear && years.includes(queryYear) ? queryYear : null) ?? defaultYear;

  return (
    <div className="relative">
      <button type="button" onClick={() => setOpen((value) => !value)} className="rounded-md border px-3 py-1.5 text-sm">
        {language === "en" ? "Year" : "Tahun"} {current}
      </button>
      {open ? (
        <div className="absolute right-0 top-full z-20 mt-2 w-40 rounded-md border bg-white p-2 text-sm shadow-lg">
          {years.map((year) => (
            <Link
              key={year}
              href={hrefForYear(pathname, searchParams, year, uasaReadyYears)}
              onClick={() => setOpen(false)}
              className={`block rounded-md px-3 py-2 ${year === current ? "bg-teal-50 font-medium text-teal-800" : "hover:bg-slate-50"}`}
            >
              {year}
            </Link>
          ))}
        </div>
      ) : null}
    </div>
  );
}
