// Fixed academic grading scale for UPSA/UASA marks.
//   82-100 -> A   66-81 -> B   50-65 -> C   35-49 -> D   20-34 -> E   0-19 -> F
// Used to derive a grade when marks are entered in-app (the Google Sheets path
// reads the grade from a sheet column instead).
export function gradeFromMark(mark: number): string {
  if (mark >= 82) return "A";
  if (mark >= 66) return "B";
  if (mark >= 50) return "C";
  if (mark >= 35) return "D";
  if (mark >= 20) return "E";
  return "F";
}
