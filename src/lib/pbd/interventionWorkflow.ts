import type { PbdInterventionEntry } from "@/types/intervention";

export type InterventionCoverage = {
  tp: 1 | 2;
  expected: number | null;
  recorded: number;
  difference: number | null;
  status: "unavailable" | "missing" | "complete" | "excess";
  label: string;
};

export function calculateInterventionCoverage(
  tp: 1 | 2,
  expected: number | null,
  entries: Pick<PbdInterventionEntry, "tp" | "active">[],
): InterventionCoverage {
  const recorded = entries.filter((item) => item.active !== false && item.tp === tp).length;
  if (expected === null) return { tp, expected, recorded, difference: null, status: "unavailable", label: `TP${tp}: ${recorded} direkod · Rumusan belum dihantar` };
  const difference = recorded - expected;
  if (difference < 0) return { tp, expected, recorded, difference, status: "missing", label: `TP${tp}: ${recorded}/${expected} · Kurang ${Math.abs(difference)}` };
  if (difference > 0) return { tp, expected, recorded, difference, status: "excess", label: `TP${tp}: ${recorded}/${expected} · Lebih ${difference}` };
  return { tp, expected, recorded, difference, status: "complete", label: `TP${tp}: ${recorded}/${expected} · Lengkap` };
}
