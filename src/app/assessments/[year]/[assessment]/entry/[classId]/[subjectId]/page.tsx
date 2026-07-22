import { ArrowLeft, Database, PenLine } from "lucide-react";
import { AppShell } from "@/components/shared/AppShell";
import { PageHeader } from "@/components/shared/PageHeader";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { AssessmentEntryGrid } from "@/components/upsa/AssessmentEntryGrid";
import { requireRole } from "@/lib/auth/actor";
import { isDatabaseConfigured } from "@/lib/db/client";
import { getAssessmentEntryGrid } from "@/lib/db/assessmentEntry";

function levelLabel(kind: string, number: number | null) {
  if (kind === "peralihan") return "Peralihan";
  const label = kind === "tingkatan" ? "Tingkatan" : "Tahun";
  return number ? `${label} ${number}` : label;
}

export default async function AssessmentEntryGridPage({ params }: { params: Promise<{ year: string; assessment: string; classId: string; subjectId: string }> }) {
  const context = await requireRole("school_admin", "platform_admin");
  const { year, assessment, classId, subjectId } = await params;
  const assessmentType = assessment === "uasa" ? "uasa" : "upsa";
  const label = assessmentType.toUpperCase();
  const databaseConfigured = isDatabaseConfigured();

  const grid = databaseConfigured ? await getAssessmentEntryGrid(context, year, assessmentType, classId, subjectId) : null;
  const basePath = `/assessments/${year}/${assessmentType}`;

  return (
    <AppShell>
      <PageHeader
        eyebrow={`${label} ${year}`}
        title={grid ? `${grid.className} · ${grid.subjectName}` : "Pengisian Markah"}
        description={grid ? `${levelLabel(grid.levelKind, grid.levelNumber)} · ${grid.students.length} murid` : ""}
        icon={PenLine}
        actions={<Button variant="outline" size="sm" icon={ArrowLeft} href={`${basePath}/entry`}>Semua kelas</Button>}
      />
      {!databaseConfigured || !grid ? (
        <EmptyState
          icon={Database}
          title="Pangkalan data belum disambungkan"
          description="Tetapkan DATABASE_URL untuk mengaktifkan pengisian markah."
          className="mt-6"
        />
      ) : (
        <AssessmentEntryGrid
          year={year}
          assessmentType={assessmentType}
          classId={classId}
          subjectId={subjectId}
          students={grid.students}
          status={grid.status}
          subjectCode={grid.subjectCode}
          subjectName={grid.subjectName}
          className={grid.className}
        />
      )}
    </AppShell>
  );
}
