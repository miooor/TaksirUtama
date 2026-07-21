import type { UpsaClassResult } from "@/types/upsa";
import { getRequiredUpsaMarkCells } from "@/lib/upsa/subjectPolicy";
import type { DataContractFinding } from "@/lib/readiness/dataContracts";

export function detectUnmatchedStudents(classResult: UpsaClassResult): DataContractFinding[] {
  const unmatched = classResult.students.filter((s) => s.matchStatus === "unmatched");
  if (unmatched.length === 0) return [];
  return [{
    severity: "warning",
    code: "registry_unmatched",
    location: classResult.className,
    message: `${unmatched.length} murid dalam ${classResult.className} tidak sepadan dengan daftar murid.`,
    action: "Padankan nama murid dalam sheet dengan daftar sekolah atau kemas kini daftar.",
  }];
}

export function calculateUpsaReadiness(results: UpsaClassResult[]) {
  const subjectMap = new Map<string, { entered: number; missing: number; absent: number }>();
  const classSummaries = results.map((result) => {
    const requiredCells = result.students.flatMap((student) => getRequiredUpsaMarkCells(student.subjects));
    const totalCells = requiredCells.length;
    const enteredCells = requiredCells.filter((cell) => cell.status === "marked").length;
    const missingCells = requiredCells.filter((cell) => cell.status === "missing").length;
    const absentCells = requiredCells.filter((cell) => cell.status === "absent").length;
    const completionDenominator = enteredCells + missingCells;

    for (const cell of requiredCells) {
      const current = subjectMap.get(cell.subjectCode) ?? { entered: 0, missing: 0, absent: 0 };
      if (cell.status === "marked") current.entered += 1;
      else if (cell.status === "missing") current.missing += 1;
      else current.absent += 1;
      subjectMap.set(cell.subjectCode, current);
    }

    return {
      className: result.className,
      totalCells,
      enteredCells,
      missingCells,
      absentCells,
      completionPercentage: completionDenominator ? (enteredCells / completionDenominator) * 100 : 100,
    };
  });

  const subjectReadiness = [...subjectMap.entries()].map(([subjectCode, value]) => {
    const completionTotal = value.entered + value.missing;
    const total = completionTotal + value.absent;
    return {
      subjectCode,
      entered: value.entered,
      missing: value.missing,
      absent: value.absent,
      total,
      completionPercentage: completionTotal ? (value.entered / completionTotal) * 100 : 100,
      status: value.missing === 0 ? "Lengkap" : value.entered === 0 ? "Belum diisi" : "Sebahagian",
    };
  }).sort((a, b) => a.subjectCode.localeCompare(b.subjectCode, "ms"));

  const totalCells = classSummaries.reduce((sum, item) => sum + item.totalCells, 0);
  const enteredCells = classSummaries.reduce((sum, item) => sum + item.enteredCells, 0);
  const missingCells = classSummaries.reduce((sum, item) => sum + item.missingCells, 0);
  const absentCells = classSummaries.reduce((sum, item) => sum + item.absentCells, 0);
  const completionDenominator = enteredCells + missingCells;

  return {
    totalCells,
    enteredCells,
    missingCells,
    absentCells,
    completionPercentage: completionDenominator ? (enteredCells / completionDenominator) * 100 : 100,
    classSummaries: [...classSummaries].sort((a, b) => a.completionPercentage - b.completionPercentage || a.className.localeCompare(b.className, "ms")),
    subjectReadiness,
  };
}

export function calculateUpsaCompletionHeatmap(results: UpsaClassResult[]) {
  const subjectCodes = [...new Set(results.flatMap((result) =>
    result.students.flatMap((student) => getRequiredUpsaMarkCells(student.subjects).map((cell) => cell.subjectCode)),
  ))]
    .sort((a, b) => a.localeCompare(b, "ms"));

  return {
    subjectCodes,
    rows: results
      .map((result) => ({
        className: result.className,
        subjects: subjectCodes.map((subjectCode) => {
          const matchingCells = result.students.flatMap((student) => getRequiredUpsaMarkCells(student.subjects).filter((cell) => cell.subjectCode === subjectCode));
          const entered = matchingCells.filter((cell) => cell.status === "marked").length;
          const missing = matchingCells.filter((cell) => cell.status === "missing").length;
          const absent = matchingCells.filter((cell) => cell.status === "absent").length;
          const total = matchingCells.length;
          const completionDenominator = entered + missing;
          return {
            subjectCode,
            entered,
            missing,
            absent,
            total,
            completionPercentage: completionDenominator ? (entered / completionDenominator) * 100 : 100,
          };
        }),
      }))
      .sort((a, b) => a.className.localeCompare(b.className, "ms")),
  };
}
