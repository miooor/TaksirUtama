import type {
  InterventionDashboardAnalysis,
  InterventionPupilSummary,
  PbdInterventionEntry,
} from "@/types/intervention";

function pupilKey(entry: PbdInterventionEntry) {
  return `${entry.normalizedStudentName}|${entry.normalizedClassName}`;
}

function comparePupils(a: InterventionPupilSummary, b: InterventionPupilSummary) {
  return (
    b.subjectCount - a.subjectCount ||
    a.lowestTp - b.lowestTp ||
    a.className.localeCompare(b.className, "ms") ||
    a.studentName.localeCompare(b.studentName, "ms")
  );
}

export function summarizeInterventionPupils(entries: PbdInterventionEntry[]): InterventionPupilSummary[] {
  const grouped = new Map<string, PbdInterventionEntry[]>();

  for (const entry of entries) {
    const key = pupilKey(entry);
    grouped.set(key, [...(grouped.get(key) ?? []), entry]);
  }

  return [...grouped.entries()]
    .map<InterventionPupilSummary>(([key, pupilEntries]) => {
      const subjects = [...new Set(pupilEntries.map((entry) => entry.subjectCode))].sort((a, b) => a.localeCompare(b, "ms"));
      const lowestTp = Math.min(...pupilEntries.map((entry) => entry.tp)) as 1 | 2;
      return {
        key,
        studentName: pupilEntries[0]!.studentName,
        className: pupilEntries[0]!.className,
        year: pupilEntries[0]!.year,
        subjects,
        lowestTp,
        subjectCount: subjects.length,
        priority: subjects.length >= 2 ? "high" : "single-subject",
        severity: lowestTp === 1 ? "urgent" : subjects.length >= 2 ? "coordinated" : "monitor",
        entries: [...pupilEntries].sort((a, b) => a.subjectCode.localeCompare(b.subjectCode, "ms")),
      };
    })
    .sort(comparePupils);
}

export function calculateInterventionDashboardAnalysis(entries: PbdInterventionEntry[]): InterventionDashboardAnalysis {
  const pupils = summarizeInterventionPupils(entries);
  const classCounts = [...new Map(
    pupils.reduce<Array<[string, number]>>((items, pupil) => {
      const existing = items.find(([className]) => className === pupil.className);
      if (existing) {
        existing[1] += 1;
      } else {
        items.push([pupil.className, 1]);
      }
      return items;
    }, []),
  ).entries()]
    .map(([className, pupilCount]) => ({ className, pupilCount }))
    .sort((a, b) => b.pupilCount - a.pupilCount || a.className.localeCompare(b.className, "ms"));

  const subjectCounts = [...new Map(
    entries.reduce<Array<[string, number]>>((items, entry) => {
      const existing = items.find(([subjectCode]) => subjectCode === entry.subjectCode);
      if (existing) {
        existing[1] += 1;
      } else {
        items.push([entry.subjectCode, 1]);
      }
      return items;
    }, []),
  ).entries()]
    .map(([subjectCode, entryCount]) => ({ subjectCode, entryCount }))
    .sort((a, b) => b.entryCount - a.entryCount || a.subjectCode.localeCompare(b.subjectCode, "ms"));

  const pairCounts = new Map<string, { subjects: [string, string]; pupilCount: number }>();
  for (const pupil of pupils.filter((item) => item.subjectCount >= 2)) {
    for (let left = 0; left < pupil.subjects.length; left += 1) {
      for (let right = left + 1; right < pupil.subjects.length; right += 1) {
        const subjects = [pupil.subjects[left]!, pupil.subjects[right]!] as [string, string];
        const key = subjects.join("|");
        const current = pairCounts.get(key);
        pairCounts.set(key, {
          subjects,
          pupilCount: (current?.pupilCount ?? 0) + 1,
        });
      }
    }
  }

  return {
    entries,
    pupils,
    totalEntries: entries.length,
    uniquePupils: pupils.length,
    highPriorityPupils: pupils.filter((pupil) => pupil.priority === "high").length,
    urgentPupils: pupils.filter((pupil) => pupil.severity === "urgent").length,
    subjectsWithEntries: new Set(entries.map((entry) => entry.subjectCode)).size,
    tp1Entries: entries.filter((entry) => entry.tp === 1).length,
    tp2Entries: entries.filter((entry) => entry.tp === 2).length,
    repeatedPupils: pupils.filter((pupil) => pupil.priority === "high"),
    classCounts,
    subjectCounts,
    overlapPairs: [...pairCounts.values()].sort(
      (a, b) => b.pupilCount - a.pupilCount || a.subjects.join(" + ").localeCompare(b.subjects.join(" + "), "ms"),
    ),
  };
}
