const pbdSubjectAliases: Record<string, string> = {
  BA: "B.ARAB",
  BTSK: "B.TAMIL",
  BCSK: "B.CHINA",
  PAI: "P.ISLAM",
  MORAL: "P.MORAL",
  PK: "PJK",
};

export function resolvePbdSubjectCode(upsaSubjectCode: string, pbdSubjectCodes: Iterable<string>) {
  const pbdSubjects = new Set(pbdSubjectCodes);
  if (pbdSubjects.has(upsaSubjectCode)) {
    return upsaSubjectCode;
  }

  const alias = pbdSubjectAliases[upsaSubjectCode];
  return alias && pbdSubjects.has(alias) ? alias : null;
}

export function resolveAssessmentSubjectCode(pbdSubjectCode: string, assessmentSubjectCodes: Iterable<string>) {
  return [...assessmentSubjectCodes].find(
    (assessmentCode) => resolvePbdSubjectCode(assessmentCode, [pbdSubjectCode]) === pbdSubjectCode,
  ) ?? null;
}
