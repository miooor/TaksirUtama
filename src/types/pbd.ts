export type TpBand = "TP1" | "TP2" | "TP3" | "TP4" | "TP5" | "TP6";

export type PbdSubjectClassRecord = {
  subjectCode: string;
  subjectName: string;
  className: string;
  year: number;
  tpCounts: Record<TpBand, number>;
  tpPercentages: Record<TpBand, number>;
  totalPupils: number;
  notAssessedCount: number;
  lowAchievementCount: number;
  lowAchievementPercentage: number;
  highAchievementCount: number;
  highAchievementPercentage: number;
  dominantTpBand: TpBand | null;
  dataIssues: string[];
};

export type PbdSubjectAnalysis = {
  subjectCode: string;
  subjectName: string;
  records: PbdSubjectClassRecord[];
  totalPupils: number;
  totalNotAssessed: number;
  aggregateTpCounts: Record<TpBand, number>;
  aggregateTpPercentages: Record<TpBand, number>;
  lowAchievementClasses: PbdSubjectClassRecord[];
  highAchievementClasses: PbdSubjectClassRecord[];
  dataIssues: string[];
};

export type PbdClassAnalysis = {
  className: string;
  year: number;
  subjectRecords: PbdSubjectClassRecord[];
  totalSubjects: number;
  subjectsWithLowAchievement: PbdSubjectClassRecord[];
  subjectsWithNotAssessed: PbdSubjectClassRecord[];
  dataIssues: string[];
};

export type PbdYearAnalysis = {
  year: number;
  classNames: string[];
  subjectAnalyses: PbdSubjectAnalysis[];
  classComparisons: Array<{
    className: string;
    totalSubjects: number;
    incompleteSubjects: number;
    lowAchievementSubjects: number;
    highAchievementAverage: number;
  }>;
  weakestSubjects: PbdSubjectAnalysis[];
  strongestSubjects: PbdSubjectAnalysis[];
  dataIssues: string[];
};
