import Link from "next/link";
import { Settings2 } from "lucide-react";
import { AppShell } from "@/components/shared/AppShell";
import { PageHeader } from "@/components/shared/PageHeader";
import { PbdSetupWorkspace } from "@/components/pbd/PbdSetupWorkspace";
import { requireRole } from "@/lib/auth/actor";
import { getDatabasePbdSetup } from "@/lib/db/pbd";
import { isDatabaseConfigured } from "@/lib/db/client";

export default async function PbdSetupPage({ searchParams }: { searchParams: Promise<{ year?: string; semester?: string }> }) {
  const context = await requireRole("school_admin", "platform_admin");
  const query = await searchParams;
  const year = query.year && /^\d{4}$/.test(query.year) ? query.year : context.school.defaultPbdPeriod?.year ?? "2026";
  const semester = query.semester === "2" ? "2" : "1";
  const configured = isDatabaseConfigured();
  const setup = configured ? await getDatabasePbdSetup(context, year, semester) : null;
  return <AppShell><PageHeader eyebrow="PBD" title="Setup PBD" description="Sediakan kelas, subjek dan penetapan sekali untuk sekolah ini." icon={Settings2} actions={<Link href={`/pbd/entry?year=${year}&semester=${semester}`} className="rounded-md border border-teal-800 px-3 py-2 text-sm font-medium text-teal-900">Isi Rumusan TP</Link>} />{configured ? <PbdSetupWorkspace setup={setup!} year={year} semester={semester} /> : <section className="mt-6 rounded-lg border border-stone-200 bg-white p-6 text-sm text-slate-600">Pangkalan data belum disambungkan. Tetapkan DATABASE_URL dan jalankan migrasi dahulu.</section>}</AppShell>;
}
