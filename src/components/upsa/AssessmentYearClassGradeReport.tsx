import type { Language } from "@/lib/i18n";

const grades = ["A", "B", "C", "D", "E", "F"] as const;
const gradeColorClasses = {
  A: "bg-emerald-600",
  B: "bg-teal-500",
  C: "bg-sky-500",
  D: "bg-amber-400",
  E: "bg-orange-500",
  F: "bg-rose-600",
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
    <article className="overflow-hidden rounded-xl border border-orange-200 bg-white">
      <header className="border-b border-orange-200 bg-orange-50 px-5 py-4 text-center">
        <h2 className="text-xl font-bold uppercase tracking-wide text-slate-900">
          {language === "en" ? `${assessmentLabel} Grade Comparison · Year ${level}` : `Analisis Perbandingan Gred ${assessmentLabel} · Tahun ${level}`}
        </h2>
      </header>

      <div className="p-5">
        <div className="flex flex-wrap justify-center gap-4 text-xs text-slate-600">
          {grades.map((grade) => (
            <span key={grade} className="inline-flex items-center gap-1.5">
              <span className={`h-3 w-3 rounded-sm ${gradeColorClasses[grade]}`} />
              {grade}
            </span>
          ))}
        </div>

        <div className="mt-5 overflow-x-auto pb-2">
          <div className="grid min-w-[44rem] grid-cols-[2.5rem_1fr] gap-3">
            <div className="flex h-64 flex-col justify-between pb-8 text-right text-[11px] text-slate-500">
              {ticks.map((tick) => <span key={tick}>{tick}</span>)}
            </div>
            <div className="relative h-64 border-b border-l border-slate-300">
              {ticks.map((tick) => (
                <span key={tick} className="pointer-events-none absolute inset-x-0 border-t border-slate-200" style={{ bottom: `${(tick / maximum) * 100}%` }} />
              ))}
              <div className="absolute inset-0 flex items-end justify-around gap-5 px-4">
                {classes.map((item) => (
                  <div key={item.className} className="flex h-full min-w-24 flex-1 flex-col justify-end">
                    <div className="flex h-[calc(100%_-_2rem)] items-end justify-center gap-1">
                      {grades.map((grade) => {
                        const count = item.gradeDistribution[grade] ?? 0;
                        return (
                          <div key={grade} className="flex h-full min-w-3 max-w-7 flex-1 flex-col justify-end" title={`${item.className} ${grade}: ${count}`}>
                            <span className="mb-1 text-center text-[10px] font-semibold text-slate-700">{count}</span>
                            <span className={`w-full rounded-t-sm ${gradeColorClasses[grade]}`} style={{ height: `${(count / maximum) * 100}%` }} />
                          </div>
                        );
                      })}
                    </div>
                    <span className="mt-2 truncate text-center text-xs font-medium uppercase text-slate-600" title={item.className}>{classLabel(item.className)}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="mt-7 overflow-x-auto rounded-lg border">
          <table className="w-full min-w-[48rem] text-sm">
            <thead className="bg-slate-50 text-left text-slate-600">
              <tr>
                <th className="px-3 py-3">{language === "en" ? "Class" : "Kelas"}</th>
                {grades.map((grade) => <th key={grade} className="px-3 py-3 text-center">{grade}</th>)}
                <th className="px-3 py-3 text-center">{language === "en" ? "Grades entered" : "Gred diisi"}</th>
                <th className="px-3 py-3 text-center">TH</th>
                <th className="px-3 py-3 text-center">{language === "en" ? "Pupils" : "Murid"}</th>
              </tr>
            </thead>
            <tbody>
              {classes.map((item) => (
                <tr key={item.className} className="border-t">
                  <td className="px-3 py-3 font-medium uppercase">{item.className}</td>
                  {grades.map((grade) => <td key={grade} className="px-3 py-3 text-center">{item.gradeDistribution[grade] ?? 0}</td>)}
                  <td className="px-3 py-3 text-center">{item.enteredCount}</td>
                  <td className="px-3 py-3 text-center">{item.absentCount}</td>
                  <td className="px-3 py-3 text-center">{item.pupilCount}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </article>
  );
}
