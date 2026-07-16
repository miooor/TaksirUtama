import type { PbdSubjectClassRecord } from "@/types/pbd";

export function calculatePbdReadiness(records: PbdSubjectClassRecord[]) {
  const incompleteRecords = records.filter((record) => record.dataIssues.length > 0);
  const totalRecords = records.length;
  const completeRecords = totalRecords - incompleteRecords.length;
  const classMap = new Map<string, number>();
  const subjectMap = new Map<string, number>();
  const issueMap = new Map<string, number>();

  for (const record of incompleteRecords) {
    classMap.set(record.className, (classMap.get(record.className) ?? 0) + 1);
    subjectMap.set(record.subjectCode, (subjectMap.get(record.subjectCode) ?? 0) + 1);
    for (const issue of record.dataIssues) {
      issueMap.set(issue, (issueMap.get(issue) ?? 0) + 1);
    }
  }

  return {
    totalRecords,
    completeRecords,
    incompleteRecords: incompleteRecords.length,
    completionPercentage: totalRecords ? (completeRecords / totalRecords) * 100 : 0,
    incompleteClasses: [...classMap.entries()]
      .map(([className, count]) => ({ className, count }))
      .sort((a, b) => b.count - a.count || a.className.localeCompare(b.className, "ms")),
    incompleteSubjects: [...subjectMap.entries()]
      .map(([subjectCode, count]) => ({ subjectCode, count }))
      .sort((a, b) => b.count - a.count || a.subjectCode.localeCompare(b.subjectCode, "ms")),
    issueSummary: [...issueMap.entries()]
      .map(([issue, count]) => ({ issue, count }))
      .sort((a, b) => b.count - a.count || a.issue.localeCompare(b.issue, "ms")),
  };
}

export function calculatePbdNotAssessedHeatmap(records: PbdSubjectClassRecord[]) {
  const subjectCodes = [...new Set(records.map((record) => record.subjectCode))].sort((a, b) => a.localeCompare(b, "ms"));
  const classNames = [...new Set(records.map((record) => record.className))].sort((a, b) => a.localeCompare(b, "ms"));

  return {
    subjectCodes,
    rows: classNames.map((className) => ({
      className,
      subjects: subjectCodes.map((subjectCode) => {
        const record = records.find((item) => item.className === className && item.subjectCode === subjectCode);
        return {
          subjectCode,
          notAssessedCount: record?.notAssessedCount ?? 0,
        };
      }),
    })),
  };
}
