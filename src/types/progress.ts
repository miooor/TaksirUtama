/** Direction of movement using a five-percentage-point threshold. */
export type MovementDirection = "improved" | "stable" | "declined" | "incomplete";

/** Pupil-level UPSA→UASA movement for a single subject. */
export type PupilMovement = {
  studentId: string;
  displayName: string;
  className: string;
  previousClassName?: string;
  subjectCode: string;
  upsaMark: number | null;
  upsaMaxMark: number;
  uasaMark: number | null;
  uasaMaxMark: number;
  upsaPercent: number | null;
  uasaPercent: number | null;
  delta: number | null;
  direction: MovementDirection;
};

/** Aggregated movement for a class, subject, year, or whole school. */
export type AggregateMovement = {
  label: string;
  matchedCount: number;
  improvedCount: number;
  stableCount: number;
  declinedCount: number;
  averageDelta: number | null;
  upsaAveragePercent: number | null;
  uasaAveragePercent: number | null;
  coverageRatio: number;
};

/** TP distribution snapshot for one semester. */
export type TpDistribution = {
  low: number;
  mid: number;
  high: number;
  notAssessed: number;
  total: number;
};

/** PBD semester-to-semester distribution shift at class-subject level. */
export type PbdSemesterMovement = {
  className: string;
  subjectCode: string;
  sem1: TpDistribution | null;
  sem2: TpDistribution | null;
  lowDelta: number | null;
  highDelta: number | null;
  direction: MovementDirection;
};

/** Combined evidence label for a class-subject row. */
export type EvidenceLabel = "improving" | "declining" | "stable" | "mixed" | "incomplete";

/** Combined evidence row merging examination and PBD signals. */
export type CombinedEvidenceRow = {
  className: string;
  subjectCode: string;
  subjectName: string;
  level: number;
  exam: AggregateMovement | null;
  pbd: PbdSemesterMovement | null;
  matchedPupilCount: number;
  totalPupilCount: number;
  coverageRatio: number;
  label: EvidenceLabel;
};

/** Coverage summary for the progress model. */
export type ProgressCoverage = {
  totalEnrolled: number;
  matchedInBoth: number;
  upsaOnly: number;
  uasaOnly: number;
  unmatched: number;
};

/** Top-level progress model returned by the comparison engine. */
export type ProgressModel = {
  year: string;
  level: number | null;
  pupilMovements: PupilMovement[];
  classMovements: AggregateMovement[];
  subjectMovements: AggregateMovement[];
  schoolMovement: AggregateMovement | null;
  pbdMovements: PbdSemesterMovement[];
  evidenceRows: CombinedEvidenceRow[];
  coverage: ProgressCoverage;
  warnings: string[];
};
