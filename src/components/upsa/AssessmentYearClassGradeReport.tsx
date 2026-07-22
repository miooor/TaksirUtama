import type { Language } from "@/lib/i18n";

const grades = ["A", "B", "C", "D", "E", "F"] as const;
const gradeColorClasses = {
  A: "bg-success",
  B: "bg-primary-500",
  C: "bg-info",
  D: "bg-accent-400",
  E: "bg-accent-600",
  F: "bg-danger",
} as const;

type ClassGradeComparison = {
  className: string;
  pupilCount: number;
  enteredCount: number;
  absentCount: number;
  gradeDistribution: Record<string, number>;
};

function chartMaximum(classes: ClassGradeComparison[]) {
  const largest = Math.max(...classes.flatMap((item) => grades.map((grade) => item.gradeDistribution[grade] ?? 0)), 1);
  return Math.max(5, Math.ceil(largest / 5) * 5);
}

function classLabel(className: string) {
  return className.replace(/^\d+\s*/, "");
}

export function AssessmentYearClassGradeReport({
  assessmentLabel,
  level,
  classes,
  language,
}: {
  assessmentLabel: string;
  level: string;
  classes: ClassGradeComparison[];
  language: Language;
}) {
  const maximum = chartMaximum(classes);
  const ticks = Array.from({ length: maximum / 5 + 1 }, (_, index) => maximum - index * 5);

  return (
    <article className="overflow-hidden rounded-xl border border-border-default bg-surface-card shadow-card">
      <header className="border-b border-border-default bg-surface-inset px-5 py-4 text-center">
        <h2 className="font-display text-xl font-bold uppercase tracking-wide text-text-primary">
          {language === "en" ? `${assessmentLabel} Grade Comparison · Year ${level}` : `Analisis Perbandingan Gred ${assessmentLabel} · Tahun ${level}`}
        </h2>
      </header>

      <div className="p-5">
        <div className="flex flex-wrap justify-center gap-4 text-xs text-text-secondary">
          {grades.map((grade) => (
            <span key={grade} className="inline-flex items-center gap-1.5">
              <span className={`h-3 w-3 rounded-sm ${gradeColorClasses[grade]}`} />
              {grade}
            </span>
          ))}
        </div>

        <div className="mt-5 overflow-x-auto pb-2">
          <div className="grid min-w-[44rem] grid-cols-[2.5rem_1fr] gap-3">
            <div className="flex h-64 flex-col justify-between pb-8 text-right text-[11px] tabular-nums text-text-muted">
              {ticks.map((tick) => <span key={tick}>{tick}</span>)}
            </div>
            <div className="relative h-64 border-b border-l border-border-strong">
              {ticks.map((tick) => (
                <span key={tick} className="pointer-events-none absolute inset-x-0 border-t border-border-default" style={{ bottom: `${(tick / maximum) * 100}%` }} />
              ))}
              <div className="absolute inset-0 flex items-end justify-around gap-5 px-4">
                {classes.map((item) => (
                  <div key={item.className} className="flex h-full min-w-24 flex-1 flex-col justify-end">
                    <div className="flex h-[calc(100%_-_2rem)] items-end justify-center gap-1">
                      {grades.map((grade) => {
                        const count = item.gradeDistribution[grade] ?? 0;
                        return (
                          <div key={grade} className="flex h-full min-w-3 max-w-7 flex-1 flex-col justify-end" title={`${item.className} ${grade}: ${count}`}>
                            <span className="mb-1 text-center text-[10px] font-semibold tabular-nums text-text-secondary">{count}</span>
                            <span className={`w-full rounded-t-sm ${gradeColorClasses[grade]}`} style={{ height: `${(count / maximum) * 100}%` }} />
                          </div>
                        );
                      })}
                    </div>
                    <span className="mt-2 truncate text-center text-xs font-semibold uppercase text-text-secondary" title={item.className}>{classLabel(item.className)}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="mt-7 overflow-x-auto rounded-lg border border-border-default">
          <table className="w-full min-w-[48rem] text-sm">
            <thead>
              <tr>
                <th className="border-b border-border-default bg-surface-inset px-3 py-3 text-left text-xs font-semibold uppercase tracking-wide text-text-muted">{language === "en" ? "Class" : "Kelas"}</th>
                {grades.map((grade) => <th key={grade} className="border-b border-border-default bg-surface-inset px-3 py-3 text-center text-xs font-semibold uppercase tracking-wide text-text-muted">{grade}</th>)}
                <th className="border-b border-border-default bg-surface-inset px-3 py-3 text-center text-xs font-semibold uppercase tracking-wide text-text-muted">{language === "en" ? "Grades entered" : "Gred diisi"}</th>
                <th className="border-b border-border-default bg-surface-inset px-3 py-3 text-center text-xs font-semibold uppercase tracking-wide text-text-muted">TH</th>
                <th className="border-b border-border-default bg-surface-inset px-3 py-3 text-center text-xs font-semibold uppercase tracking-wide text-text-muted">{language === "en" ? "Pupils" : "Murid"}</th>
              </tr>
            </thead>
            <tbody>
              {classes.map((item) => (
                <tr key={item.className} className="border-b border-border-default transition-colors last:border-b-0 hover:bg-surface-inset/60">
                  <td className="px-3 py-3 font-medium uppercase text-text-primary">{item.className}</td>
                  {grades.map((grade) => <td key={grade} className="px-3 py-3 text-center tabular-nums">{item.gradeDistribution[grade] ?? 0}</td>)}
                  <td className="px-3 py-3 text-center tabular-nums">{item.enteredCount}</td>
                  <td className="px-3 py-3 text-center tabular-nums">{item.absentCount}</td>
                  <td className="px-3 py-3 text-center tabular-nums">{item.pupilCount}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </article>
  );
}
