import Link from "next/link";
import { AppShell } from "@/components/shared/AppShell";
import { PageHeader } from "@/components/shared/PageHeader";
import { DataSourceManager } from "@/components/settings/DataSourceManager";
import { requireActorContext } from "@/lib/auth/actor";
import { listPeriodYears } from "@/lib/config/periods";
import { isDatabaseConfigured } from "@/lib/db/client";
import { listWorkbookSources, toPublicWorkbookSource } from "@/lib/dataSources/repository";
import { env } from "@/lib/config/env";

export default async function DataSourcesPage() {
  const context = await requireActorContext();
  const sources = (await listWorkbookSources(context.school.id)).map(toPublicWorkbookSource).map((source) => ({
    ...source,
    lastCheckedAt: source.lastCheckedAt?.toISOString() ?? null,
    lastSuccessfulReadAt: source.lastSuccessfulReadAt?.toISOString() ?? null,
    createdAt: source.createdAt.toISOString(),
    updatedAt: source.updatedAt.toISOString(),
  }));
  const years = listPeriodYears(context.school.assessmentPeriods, context.school.pbdPeriods);
  const canManage = context.actor.role === "school_admin" || context.actor.role === "platform_admin";

  return (
    <AppShell>
      <PageHeader
        eyebrow="Tetapan sekolah"
        title="Sumber data Google Sheets"
        description="Sambungkan salinan templat rasmi tanpa mendedahkan data sekolah lain."
      />

      <section className="mt-6 grid gap-4 md:grid-cols-3">
        <div className="rounded-lg border bg-white p-5 md:col-span-2">
          <h2 className="font-semibold">Sebelum menampal pautan</h2>
          <ol className="mt-3 space-y-2 text-sm text-slate-600">
            <li>1. Muat turun dan salin templat rasmi ke Google Drive sekolah.</li>
            <li>2. Tukar schoolCode dalam tab _CONFIG kepada {context.school.code}.</li>
            <li>3. Kongsi buku kerja sebagai Viewer dengan akaun perkhidmatan di sebelah.</li>
            <li>4. Tampal pautan dan uji. Sumber lama kekal aktif sehingga sumber baharu lulus.</li>
          </ol>
          <div className="mt-4 flex flex-wrap gap-3 text-sm">
            <Link href={env.NEXT_PUBLIC_ASSESSMENT_TEMPLATE_URL ?? "/templates/templat-upsa-uasa-v1.xlsx"} className="rounded-md border px-3 py-2">Salin templat UPSA/UASA</Link>
            <Link href={env.NEXT_PUBLIC_PBD_TEMPLATE_URL ?? "/templates/templat-pbd-v1.xlsx"} className="rounded-md border px-3 py-2">Salin templat PBD</Link>
          </div>
        </div>
        <div className="rounded-lg border bg-white p-5">
          <h2 className="font-semibold">Akaun Viewer</h2>
          <p className="mt-3 break-words text-sm text-slate-600">{env.GOOGLE_SERVICE_ACCOUNT_EMAIL ?? "Belum dikonfigurasi"}</p>
          <p className="mt-3 text-sm text-slate-600">Berikan akses Viewer sahaja. Jangan berikan akses Editor.</p>
        </div>
      </section>

      <DataSourceManager sources={sources} years={years} canManage={canManage} databaseConfigured={isDatabaseConfigured()} />
    </AppShell>
  );
}
