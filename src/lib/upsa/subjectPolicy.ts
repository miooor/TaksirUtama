import type { UpsaSubjectResult } from "@/types/upsa";

export const alternativeLanguageSubjectCodes = ["BA", "BTSK", "BCSK"] as const;
export const alternativeLanguageMissingCode = "BA/BTSK/BCSK";
export const religionMoralSubjectCodes = ["PAI", "MORAL"] as const;
export const religionMoralMissingCode = "PAI/MORAL";

const alternativeLanguageSubjectSet = new Set<string>(alternativeLanguageSubjectCodes);
const exclusiveSubjectGroups = [
  { subjectCodes: alternativeLanguageSubjectCodes, missingCode: alternativeLanguageMissingCode },
  { subjectCodes: religionMoralSubjectCodes, missingCode: religionMoralMissingCode },
];
const exclusiveSubjectCodeSet = new Set<string>(exclusiveSubjectGroups.flatMap((group) => [...group.subjectCodes]));

export function isAlternativeLanguageSubject(subjectCode: string) {
  return alternativeLanguageSubjectSet.has(subjectCode);
}

export function isExclusiveChoiceSubject(subjectCode: string) {
  return exclusiveSubjectCodeSet.has(subjectCode);
}

function hasGroupSubject(subjects: UpsaSubjectResult[], subjectCodes: readonly string[]) {
  return subjects.some((subject) => subjectCodes.includes(subject.subjectCode));
}

function hasGroupStatus(subjects: UpsaSubjectResult[], subjectCodes: readonly string[], status: UpsaSubjectResult["status"]) {
  return subjects.some((subject) => subjectCodes.includes(subject.subjectCode) && subject.status === status);
}

function getGroupStatus(subjects: UpsaSubjectResult[], subjectCodes: readonly string[]): UpsaSubjectResult["status"] {
  if (hasGroupStatus(subjects, subjectCodes, "marked")) return "marked";
  if (hasGroupStatus(subjects, subjectCodes, "absent")) return "absent";
  return "missing";
}

export function hasAlternativeLanguageMark(subjects: UpsaSubjectResult[]) {
  return hasGroupStatus(subjects, alternativeLanguageSubjectCodes, "marked");
}

export function hasAlternativeLanguageAbsence(subjects: UpsaSubjectResult[]) {
  return hasGroupStatus(subjects, alternativeLanguageSubjectCodes, "absent");
}

export function getMissingUpsaSubjectCodes(subjects: UpsaSubjectResult[]) {
  const missingSubjects = subjects
    .filter((subject) => !isExclusiveChoiceSubject(subject.subjectCode) && subject.status === "missing")
    .map((subject) => subject.subjectCode);

  for (const group of exclusiveSubjectGroups) {
    if (hasGroupSubject(subjects, group.subjectCodes) && getGroupStatus(subjects, group.subjectCodes) === "missing") {
      missingSubjects.push(group.missingCode);
    }
  }

  return missingSubjects;
}

export function getAbsentUpsaSubjectCodes(subjects: UpsaSubjectResult[]) {
  const absentSubjects = subjects
    .filter((subject) => !isExclusiveChoiceSubject(subject.subjectCode) && subject.status === "absent")
    .map((subject) => subject.subjectCode);

  for (const group of exclusiveSubjectGroups) {
    if (hasGroupSubject(subjects, group.subjectCodes) && getGroupStatus(subjects, group.subjectCodes) === "absent") {
      absentSubjects.push(group.missingCode);
    }
  }

  return absentSubjects;
}

export function getRequiredUpsaMarkCells(subjects: UpsaSubjectResult[]) {
  const cells = subjects
    .filter((subject) => !isExclusiveChoiceSubject(subject.subjectCode))
    .map((subject) => ({
      subjectCode: subject.subjectCode,
      status: subject.status,
    }));

  for (const group of exclusiveSubjectGroups) {
    if (hasGroupSubject(subjects, group.subjectCodes)) {
      cells.push({
        subjectCode: group.missingCode,
        status: getGroupStatus(subjects, group.subjectCodes),
      });
    }
  }

  return cells;
}
