import { ChartColumnStacked } from "lucide-react";
import { SectionHeading } from "@/components/shared/SectionHeading";
import type { Language } from "@/lib/i18n";
import { text } from "@/lib/i18n";

const gradeOrder = ["A", "B", "C", "D", "E", "F"] as const;

const gradeColorClasses = {
  A: "bg-emerald-600",
  B: "bg-teal-500",
  C: "bg-sky-500",
  D: "bg-amber-400",
  E: "bg-orange-500",
  F: "bg-rose-600",
} as const;

const gradeLabelColorClasses = {
  A: "text-white",
  B: "text-white",
  C: "text-white",
  D: "text-slate-900",
  E: "text-white",
  F: "text-white",
} as const;

type Grade = (typeof gradeOrder)[number];

type SubjectComparison = {
  subjectCode: string;
  classes: Array<{
    className: string;
    enteredCount: number;
    gradeDistribution: Record<string, number>;
  }>;
};

type ChartColumn = {
  label: string;
  totalPupils: number;
  gradeCounts: Record<Grade, number>;
  gradePercentages: Record<Grade, number>;
};

function makeColumn(label: string, totalPupils: number, gradeDistribution: Record<string, number>): ChartColumn {
  const gradeCounts = Object.fromEntries(
    gradeOrder.map((grade) => [grade, gradeDistribution[grade] ?? 0]),
  ) as Record<Grade, number>;

  return {
    label,
    totalPupils,
    gradeCounts,
    gradePercentages: Object.fromEntries(
      gradeOrder.map((grade) => [grade, totalPupils ? (gradeCounts[grade] / totalPupils) * 100 : 0]),
    ) as Record<Grade, number>,
  };
}

function makeTotalColumn(classes: SubjectComparison["classes"]): ChartColumn {
  const totalPupils = classes.reduce((sum, item) => sum + item.enteredCount, 0);
  const gradeDistribution = Object.fromEntries(
    gradeOrder.map((grade) => [
      grade,
      classes.reduce((sum, item) => sum + (item.gradeDistribution[grade] ?? 0), 0),
    ]),
  );

  return makeColumn("Jumlah", totalPupils, gradeDistribution);
}

export function UpsaSubjectGradeStackedColumns({
  year,
  comparisons,
  language,
}: {
  year: string;
  comparisons: SubjectComparison[];
  language: Language;
}) {
  return (
    <section className="rounded-lg border bg-white p-5">
      <SectionHeading
        icon={ChartColumnStacked}
        tone="violet"
        title={text(language, { ms: "Perbandingan gred mengikut kelas", en: "Grade comparison by class" })}
      />
      <div className="mt-6 space-y-8">
        {comparisons.map((comparison) => {
          const columns = [
            ...comparison.classes.map((item) => makeColumn(item.className, item.enteredCount, item.gradeDistribution)),
            makeTotalColumn(comparison.classes),
          ];

          return (
            <div key={comparison.subjectCode}>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h3 className="text-sm font-semibold text-slate-700">
                  {comparison.subjectCode} · Tahun {year}
                </h3>
                <div className="flex flex-wrap gap-3 text-xs text-slate-600">
                  {gradeOrder.map((grade) => (
                    <span key={grade} className="inline-flex items-center gap-1.5">
                      <span className={`h-2.5 w-2.5 rounded-full ${gradeColorClasses[grade]}`} />
                      {grade}
                    </span>
                  ))}
                </div>
              </div>

              <div className="mt-4 overflow-x-auto pb-2">
                <div className="mx-auto w-fit min-w-max">
                  <div className="grid grid-cols-[2.5rem_auto] gap-3">
                    <div className="mt-8 flex h-56 flex-col justify-between text-right text-[11px] text-slate-500">
                      {[100, 75, 50, 25, 0].map((tick) => (
                        <span key={tick}>{tick}%</span>
                      ))}
                    </div>

                    <div>
                      <div className="relative">
                        <div className="pointer-events-none absolute inset-x-0 top-8 h-56">
                          {[0, 25, 50, 75, 100].map((tick) => (
                            <span
                              key={tick}
                              className="absolute inset-x-0 border-t border-slate-200"
                              style={{ bottom: `${tick}%` }}
                            />
                          ))}
                        </div>

                        <div className="relative flex items-end gap-5">
                          {columns.map((column) => (
                            <div key={column.label} className="flex w-20 shrink-0 flex-col items-center">
                              <span className="mb-2 text-xs font-medium text-slate-600">{column.totalPupils}</span>
                              <div className="flex h-56 w-full flex-col-reverse overflow-hidden rounded-t-md border border-slate-200 bg-slate-50">
                                {gradeOrder.map((grade) => {
                                  const count = column.gradeCounts[grade];
                                  const percentage = column.gradePercentages[grade];
                                  const showLabel = count > 0 && percentage >= 8;

                                  return (
                                    <div
                                      key={grade}
                                      className={`flex items-center justify-center ${gradeColorClasses[grade]}`}
                                      style={{ height: `${percentage}%` }}
                                      title={`${column.label} ${grade}: ${count} (${percentage.toFixed(1)}%)`}
                                    >
                                      {showLabel ? (
                                        <span className={`text-[11px] font-semibold leading-none tabular-nums ${gradeLabelColorClasses[grade]}`}>
                                          {count}
                                        </span>
                                      ) : null}
                                    </div>
                                  );
                                })}
                              </div>
                              <span className="mt-3 text-center text-xs font-medium text-slate-700">{column.label}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
