import type { InterventionPupilSummary, PbdInterventionEntry } from "@/types/intervention";

export type DialogInsightCategory =
  | "Risiko akademik"
  | "Jurang evidens UPSA/PBD"
  | "Penguasaan rendah PBD"
  | "Data perlu semakan"
  | "Kekuatan panitia";

export type DialogQuestion = {
  prompt: string;
  focus: "evidence" | "class" | "pupil" | "action";
};

export type DialogInsightFinding = {
  category: DialogInsightCategory;
  title: string;
  evidence: string;
  severity: "high" | "medium" | "positive";
};

export type DialogInsightClassRow = {
  className: string;
  year: number;
  upsaApplicable: boolean;
  upsaAverage: number | null;
  upsaPassPercentage: number | null;
  upsaFailCount: number;
  upsaEnteredCount: number;
  pbdLowCount: number;
  pbdLowPercentage: number;
  pbdHighCount: number;
  pbdHighPercentage: number;
  pbdTotalPupils: number;
  pbdNotAssessedCount: number;
  interventionCount: number;
  attentionScore: number;
};

export type DialogInsightBrief = {
  subjectCode: string;
  pbdSubjectCode: string;
  subjectName: string;
  selectedYear: number | null;
  selectedClass: string | null;
  attentionScore: number;
  attentionLevel: "Tinggi" | "Sederhana" | "Pantau";
  confidence: "Lengkap" | "Sebahagian" | "Perlu semakan" | "Tiada padanan UPSA/PBD";
  confidenceNotes: string[];
  whySelected: string;
  metrics: {
    upsaAverage: number | null;
    upsaPassPercentage: number | null;
    upsaFailCount: number;
    upsaEnteredCount: number;
    pbdLowCount: number;
    pbdLowPercentage: number;
    pbdHighCount: number;
    pbdHighPercentage: number;
    pbdTotalPupils: number;
    pbdNotAssessedCount: number;
    repeatedRiskPupils: number;
    upsaApplicable: boolean;
  };
  classRows: DialogInsightClassRow[];
  findings: DialogInsightFinding[];
  questions: DialogQuestion[];
  focusSuggestions: string[];
  handoffHref: string;
};

export type DialogSubjectSummary = {
  subjectCode: string;
  pbdSubjectCode: string;
  subjectName: string;
  category: DialogInsightCategory;
  attentionScore: number;
  attentionLevel: DialogInsightBrief["attentionLevel"];
  confidence: DialogInsightBrief["confidence"];
  upsaApplicable: boolean;
  upsaAverage: number | null;
  upsaPassPercentage: number | null;
  pbdLowPercentage: number;
  pbdHighPercentage: number;
  pbdLowCount: number;
  pbdHighCount: number;
  weakestClass: string | null;
  handoffHref: string;
};

export type DialogClassSummary = {
  className: string;
  year: number;
  category: DialogInsightCategory;
  attentionScore: number;
  upsaApplicable: boolean;
  upsaAverage: number | null;
  upsaPassPercentage: number | null;
  pbdLowPercentage: number;
  pbdHighPercentage: number;
  pbdLowCount: number;
  pbdHighCount: number;
  pbdTotalPupils: number;
  pbdNotAssessedCount: number;
  subjectsAtRisk: number;
  weakestSubjects: string[];
};

export type DialogComparisonPoint = {
  label: string;
  href?: string;
  x: number;
  y: number;
  risk: number;
  category: DialogInsightCategory;
  attentionLevel: DialogInsightBrief["attentionLevel"];
  detail: string;
};

export type DialogInsightOverview = {
  subjectSummaries: DialogSubjectSummary[];
  classSummaries: DialogClassSummary[];
  subjectAlignmentPoints: DialogComparisonPoint[];
  subjectRiskPoints: DialogComparisonPoint[];
  classAlignmentPoints: DialogComparisonPoint[];
  classRiskPoints: DialogComparisonPoint[];
};

export type InterventionTheme =
  | "Kehadiran"
  | "Literasi"
  | "Numerasi"
  | "Kerja Tidak Lengkap"
  | "Fokus/Sikap"
  | "Lain-lain";

export type DialogInterventionOwner = "Admin" | "KP" | "Guru Subjek" | "Guru Kelas";

export type DialogInterventionRow = {
  studentName: string;
  className: string;
  year: number;
  subjectCode: string;
  tp: 1 | 2;
  problem: string;
  intervention: string;
  theme: InterventionTheme;
  owner: DialogInterventionOwner;
  nextAction: string;
  priorityLabel: "Segera" | "Selaras" | "Pantau";
  subjectCount: number;
  repeatedRisk: boolean;
  pupil: InterventionPupilSummary;
  entry?: PbdInterventionEntry;
};
