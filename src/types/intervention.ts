export type InterventionPriority = "high" | "single-subject";
export type InterventionSeverity = "urgent" | "coordinated" | "monitor";

export type PbdInterventionEntry = {
  subjectCode: string;
  studentName: string;
  normalizedStudentName: string;
  className: string;
  normalizedClassName: string;
  year: number;
  tp: 1 | 2;
  problem: string;
  intervention: string;
};

export type PbdInterventionIssue = {
  subjectCode: string;
  rowNumber: number;
  studentName: string;
  className: string;
  reason: string;
};

export type PbdInterventionParseResult = {
  entries: PbdInterventionEntry[];
  issues: PbdInterventionIssue[];
};

export type InterventionPupilSummary = {
  key: string;
  studentName: string;
  className: string;
  year: number;
  subjects: string[];
  lowestTp: 1 | 2;
  subjectCount: number;
  priority: InterventionPriority;
  severity: InterventionSeverity;
  entries: PbdInterventionEntry[];
};

export type InterventionDashboardAnalysis = {
  entries: PbdInterventionEntry[];
  pupils: InterventionPupilSummary[];
  totalEntries: number;
  uniquePupils: number;
  highPriorityPupils: number;
  urgentPupils: number;
  subjectsWithEntries: number;
  tp1Entries: number;
  tp2Entries: number;
  repeatedPupils: InterventionPupilSummary[];
  classCounts: Array<{ className: string; pupilCount: number }>;
  subjectCounts: Array<{ subjectCode: string; entryCount: number }>;
  overlapPairs: Array<{ subjects: [string, string]; pupilCount: number }>;
};
