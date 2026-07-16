import type { Language } from "@/lib/i18n";
import type { PbdSubjectClassRecord, TpBand } from "@/types/pbd";

const bands: TpBand[] = ["TP1", "TP2", "TP3", "TP4", "TP5", "TP6"];
const bandColorClasses: Record<TpBand, string> = {
  TP1: "bg-rose-300",
  TP2: "bg-orange-500",
  TP3: "bg-yellow-300",
  TP4: "bg-emerald-600",
  TP5: "bg-blue-600",
  TP6: "bg-violet-600",
};

function chartMaximum(records: PbdSubjectClassRecord[]) {
  const largest = Math.max(...records.flatMap((record) => bands.map((band) => record.tpCounts[band])), 1);
  return Math.max(5, Math.ceil(largest / 5) * 5);
}

function classLabel(className: string) {
  return className.replace(/^\d+\s*/, "");
}

export function PbdYearClassComparisonReport({
  title,
  records,
  language = "ms",
}: {
  title: string;
  records: PbdSubjectClassRecord[];
  language?: Language;
}) {
  const recordsByYear = [...records]
    .sort((a, b) => a.year - b.year || a.className.localeCompare(b.className, "ms"))
    .reduce((groups, record) => {
      const yearRecords = groups.get(record.year) ?? [];
      yearRecords.push(record);
      groups.set(record.year, yearRecords);
      return groups;
    }, new Map<number, PbdSubjectClassRecord[]>());

  return (
    <section className="space-y-6">
      {[...recordsByYear.entries()].map(([year, yearRecords]) => {
        const maximum = chartMaximum(yearRecords);
        const ticks = Array.from({ length: maximum / 5 + 1 }, (_, index) => maximum - index * 5);
        return (
          <article key={year} className="overflow-hidden rounded-xl border border-orange-200 bg-white">
            <header className="border-b border-orange-200 bg-orange-50 px-5 py-4 text-center">
              <h2 className="text-xl font-bold uppercase tracking-wide text-slate-900">{title} {year}</h2>
            </header>

            <div className="p-5">
              <div className="flex flex-wrap justify-center gap-4 text-xs text-slate-600">
                {bands.map((band) => (
                  <span key={band} className="inline-flex items-center gap-1.5">
                    <span className={`h-3 w-3 rounded-sm ${bandColorClasses[band]}`} />
                    {band}
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
                      {yearRecords.map((record) => (
                        <div key={record.className} className="flex h-full min-w-24 flex-1 flex-col justify-end">
                          <div className="flex h-[calc(100%_-_2rem)] items-end justify-center gap-1">
                            {bands.map((band) => {
                              const count = record.tpCounts[band];
                              return (
                                <div key={band} className="flex h-full min-w-3 max-w-7 flex-1 flex-col justify-end" title={`${record.className} ${band}: ${count}`}>
                                  <span className="mb-1 text-center text-[10px] font-semibold text-slate-700">{count}</span>
                                  <span className={`w-full rounded-t-sm ${bandColorClasses[band]}`} style={{ height: `${(count / maximum) * 100}%` }} />
                                </div>
                              );
                            })}
                          </div>
                          <span className="mt-2 truncate text-center text-xs font-medium uppercase text-slate-600" title={record.className}>{classLabel(record.className)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-7 overflow-x-auto rounded-lg border">
                <table className="w-full min-w-[52rem] text-sm">
                  <thead className="bg-slate-50 text-left text-slate-600">
                    <tr>
                      <th className="px-3 py-3">{language === "en" ? "Class" : "Kelas"}</th>
                      {bands.map((band) => <th key={band} className="px-3 py-3 text-center">{band}</th>)}
                      <th className="px-3 py-3 text-center">TP1+TP2</th>
                      <th className="px-3 py-3 text-center">TP5+TP6</th>
                      <th className="px-3 py-3 text-center">{language === "en" ? "Not assessed" : "Belum ditaksir"}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {yearRecords.map((record) => (
                      <tr key={record.className} className="border-t">
                        <td className="px-3 py-3 font-medium uppercase">{record.className}</td>
                        {bands.map((band) => <td key={band} className="px-3 py-3 text-center">{record.tpCounts[band]}</td>)}
                        <td className="px-3 py-3 text-center">{record.lowAchievementPercentage.toFixed(1)}%</td>
                        <td className="px-3 py-3 text-center">{record.highAchievementPercentage.toFixed(1)}%</td>
                        <td className="px-3 py-3 text-center">{record.notAssessedCount}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </article>
        );
      })}
    </section>
  );
}
