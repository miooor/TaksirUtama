import Link from "next/link";
import { ArrowLeft, Database, PenLine } from "lucide-react";
import { AppShell } from "@/components/shared/AppShell";
import { PageHeader } from "@/components/shared/PageHeader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { ProgressBar } from "@/components/ui/progress-bar";
import { DataTable, TableShell, TD, TH, THead, TRow } from "@/components/ui/table";
import { requireRole } from "@/lib/auth/actor";
import { isDatabaseConfigured } from "@/lib/db/client";
import { getAssessmentEntryProgress, getClassesForEntry, type ClassForEntry } from "@/lib/db/assessmentEntry";

function levelLabel(kind: string, number: number | null) {
  if (kind === "peralihan") return "Peralihan";
  const label = kind === "tingkatan" ? "Tingkatan" : "Tahun";
  return number ? `${label} ${number}` : label;
}

function statusTone(status: string): "success" | "warning" | "neutral" {
  if (status === "final") return "success";
  if (status === "draft") return "warning";
  return "neutral";
}

function statusLabel(status: string, markedCount: number, enrolledCount: number) {
  if (status === "final") return "Muktamad";
  if (status === "draft") return `${markedCount}/${enrolledCount} diisi`;
  return "Kosong";
}

export default async function AssessmentEntryPage({ params }: { params: Promise<{ year: string; assessment: string }> }) {
  const context = await requireRole("school_admin", "platform_admin");
  const { year, assessment } = await params;
  const assessmentType = assessment === "uasa" ? "uasa" : "upsa";
  const label = assessmentType.toUpperCase();
  const databaseConfigured = isDatabaseConfigured();

  let progress: Awaited<ReturnType<typeof getAssessmentEntryProgress>> = [];
  let dbError: string | null = null;
  let classesForEntry: ClassForEntry[] = [];
  if (databaseConfigured) {
    try {
      progress = await getAssessmentEntryProgress(context, year, assessmentType);
      // If no progress rows, load classes directly to show them
      if (progress.length === 0) {
        try { classesForEntry = await getClassesForEntry(context, year); } catch { /* ignore */ }
      }
    } catch (error) {
      dbError = error instanceof Error ? error.message : "Ralat pangkalan data.";
    }
  }

  // Group by class
  const classes = [...new Map(progress.map((row) => [row.classId, { className: row.className, levelKind: row.levelKind, levelNumber: row.levelNumber }])).values()];
  const subjects = [...new Map(progress.map((row) => [row.subjectId, { subjectCode: row.subjectCode, subjectName: row.subjectName }])).values()];

  const basePath = `/assessments/${year}/${assessmentType}`;

  const finalCount = progress.filter((row) => row.status === "final").length;
  const draftCount = progress.filter((row) => row.status === "draft").length;

  return (
    <AppShell>
      <PageHeader
        eyebrow={`${label} ${year}`}
        title="Pengisian Markah"
        description="Masukkan markah mengikut kelas dan subjek."
        icon={PenLine}
        actions={
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" icon={ArrowLeft} href={`/assessments/${year}`}>Hub</Button>
            <Button variant="secondary" size="sm" href={`${basePath}/classes`}>Lihat analisis</Button>
          </div>
        }
      />

      {/* Progress summary */}
      {databaseConfigured && progress.length > 0 && (
        <Card className="mt-4">
          <CardContent className="flex flex-wrap items-center gap-4 px-5 py-3.5">
            <div className="text-sm">
              <span className="font-semibold tabular-nums text-text-primary">{finalCount}/{progress.length}</span>
              <span className="text-text-muted"> selesai ({progress.length > 0 ? Math.round((finalCount / progress.length) * 100) : 0}%)</span>
            </div>
            <ProgressBar value={finalCount} max={progress.length} size="sm" className="w-32" label="Kemajuan pengisian" />
            <div className="flex gap-2">
              <Badge tone="success">{finalCount} muktamad</Badge>
              <Badge tone="warning">{draftCount} draf</Badge>
              <Badge tone="neutral">{progress.length - finalCount - draftCount} kosong</Badge>
            </div>
          </CardContent>
        </Card>
      )}

      {!databaseConfigured ? (
        <EmptyState
          icon={Database}
          title="Pangkalan data belum disambungkan"
          description="Tetapkan DATABASE_URL, jalankan migrasi pangkalan data, kemudian buka semula halaman ini."
          className="mt-6"
        />
      ) : dbError ? (
        <EmptyState
          icon={Database}
          title="Data tidak dapat dimuatkan"
          description={dbError}
          className="mt-6"
          action={<Button variant="secondary" href="/school/setup">Buka Setup Sekolah</Button>}
        />
      ) : !progress.length && classesForEntry.length > 0 ? (
        <EmptyState
          icon={PenLine}
          title="Subjek belum ditetapkan ke kelas"
          description="Kelas berikut telah didaftarkan tetapi tiada subjek ditetapkan. Buka Setup Sekolah untuk menetapkan subjek ke kelas sebelum mengisi markah."
          className="mt-6"
          action={<Button variant="secondary" href="/school/setup">Buka Setup Sekolah</Button>}
        />
      ) : !progress.length ? (
        <EmptyState
          icon={PenLine}
          title="Tiada kelas dan subjek dikonfigurasi"
          description="Sediakan kelas, subjek, dan penetapan subjek ke kelas dalam Setup Sekolah sebelum mengisi markah."
          className="mt-6"
          action={<Button variant="secondary" href="/school/setup">Buka Setup Sekolah</Button>}
        />
      ) : (
        <div className="mt-6">
          <TableShell>
            <DataTable>
              <THead>
                <tr>
                  <TH sticky>Kelas</TH>
                  {subjects.map((subject) => (
                    <TH key={subject.subjectCode} align="center" className="whitespace-nowrap" >
                      <span title={subject.subjectName}>{subject.subjectCode}</span>
                    </TH>
                  ))}
                </tr>
              </THead>
              <tbody>
                {classes.map((cls) => (
                  <TRow key={cls.className}>
                    <TD sticky className="font-medium">
                      <span className="block text-text-primary">{cls.className}</span>
                      <span className="block text-xs text-text-disabled">{levelLabel(cls.levelKind, cls.levelNumber)}</span>
                    </TD>
                    {subjects.map((subject) => {
                      const row = progress.find((p) => p.className === cls.className && p.subjectCode === subject.subjectCode);
                      if (!row) return <TD key={subject.subjectCode} align="center" className="text-text-disabled">—</TD>;
                      return (
                        <TD key={subject.subjectCode} align="center">
                          <Link
                            href={`${basePath}/entry/${row.classId}/${row.subjectId}`}
                            className="inline-block transition-opacity hover:opacity-80"
                          >
                            <Badge tone={statusTone(row.status)}>{statusLabel(row.status, row.markedCount, row.enrolledCount)}</Badge>
                          </Link>
                        </TD>
                      );
                    })}
                  </TRow>
                ))}
              </tbody>
            </DataTable>
          </TableShell>
        </div>
      )}
    </AppShell>
  );
}
