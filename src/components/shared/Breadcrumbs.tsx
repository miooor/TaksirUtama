"use client";

import Link from "next/link";
import { ChevronRight } from "lucide-react";
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
    <nav className="mb-5 flex min-w-0 flex-wrap items-center gap-1 text-sm" aria-label="Breadcrumb">
      <Link href="/dashboard" className="rounded-md px-1.5 py-0.5 text-text-muted transition-colors hover:bg-surface-inset hover:text-text-primary">Dashboard</Link>
      {crumbs.map((crumb, index) => (
          <span key={crumb.href} className="flex min-w-0 items-center gap-1">
            <ChevronRight className="h-3.5 w-3.5 shrink-0 text-text-disabled" aria-hidden="true" />
            {index === crumbs.length - 1 ? (
              <span className="truncate px-1.5 py-0.5 font-medium text-text-primary">{crumb.label}</span>
            ) : (
              <Link href={crumb.href} className="truncate rounded-md px-1.5 py-0.5 text-text-muted transition-colors hover:bg-surface-inset hover:text-text-primary">{crumb.label}</Link>
            )}
          </span>
      ))}
    </nav>
  );
}
