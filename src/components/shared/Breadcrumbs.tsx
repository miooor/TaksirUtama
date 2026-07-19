"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { Language } from "@/lib/i18n";

const labels: Record<string, string> = {
  dashboard: "Dashboard",
  readiness: "Semak data",
  upsa: "UPSA",
  classes: "Kelas",
  analysis: "Analisis",
  slips: "Slip",
  pbd: "PBD",
  subjects: "Subjek",
  years: "Tahun",
  insights: "Dapatan",
  "dialog-prestasi": "Dialog Prestasi",
  school: "Sekolah",
  setup: "Setup Sekolah",
  interventions: "Intervensi",
  entry: "Isi",
};

export function Breadcrumbs({ language }: { language: Language }) {
  const pathname = usePathname();
  const segments = pathname.split("/").filter(Boolean);
  if (!segments.length || pathname === "/dashboard") return null;
  const crumbs = segments.map((segment, index) => ({
    href: `/${segments.slice(0, index + 1).join("/")}`,
    label:
      language === "en"
        ? ({
            readiness: "Data readiness",
            classes: "Classes",
            analysis: "Analysis",
            slips: "Slips",
            subjects: "Subjects",
            years: "Years",
            insights: "Insight",
          }[segment] ?? labels[segment] ?? decodeURIComponent(segment))
        : labels[segment] ?? decodeURIComponent(segment),
  }));
  return (
    <nav className="mb-5 flex flex-wrap items-center gap-2 text-sm text-slate-600">
      <Link href="/dashboard">Dashboard</Link>
      {crumbs.map((crumb) => (
          <span key={crumb.href} className="flex items-center gap-2">
            <span>/</span>
            <Link href={crumb.href}>{crumb.label}</Link>
          </span>
      ))}
    </nav>
  );
}
