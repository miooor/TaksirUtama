/** Per-school subject record from the school_subjects table. */
export type SchoolSubjectRecord = {
  id: string;
  code: string;
  name: string;
  aliases: string[];
  active: boolean;
};

const aliases: Record<string, string> = {
  BAHASAMELAYU: "BM",
  BM: "BM",
  BAHASAINGGERIS: "BI",
  BI: "BI",
  MATEMATIK: "MATE",
  MATE: "MATE",
  MATH: "MATE",
  SAINS: "SAINS",
  SCIENCE: "SAINS",
  SEJARAH: "SEJARAH",
  PENDIDIKANISLAM: "PAI",
  PISLAM: "PAI",
  PAI: "PAI",
  PENDIDIKANMORAL: "MORAL",
  PMORAL: "MORAL",
  MORAL: "MORAL",
  PENDIDIKANJASMANIDANKESIHATAN: "PJK",
  PENDIDIKANJASMANIKESIHATAN: "PJK",
  PJK: "PJK",
  PK: "PJK",
  PENDIDIKANSENIVISUAL: "PSV",
  PSV: "PSV",
  PENDIDIKANMUZIK: "MUZIK",
  MUZIK: "MUZIK",
  REKABENTUKDANTEKNOLOGI: "RBT",
  RBT: "RBT",
  BAHASAARAB: "BA",
  BARAB: "BA",
  BA: "BA",
  BAHASACINASK: "BCSK",
  BCHINA: "BCSK",
  BCSK: "BCSK",
  BAHASATAMILSK: "BTSK",
  BTAMIL: "BTSK",
  BTSK: "BTSK",
};

export const subjectNames: Record<string, string> = {
  BA: "Bahasa Arab",
  BI: "Bahasa Inggeris",
  BM: "Bahasa Melayu",
  MATE: "Matematik",
  SAINS: "Sains",
  RBT: "Reka Bentuk dan Teknologi",
  PJK: "Pendidikan Jasmani dan Kesihatan",
  SEJARAH: "Sejarah",
  PAI: "Pendidikan Islam",
  MORAL: "Pendidikan Moral",
  BTSK: "Bahasa Tamil SK",
  BCSK: "Bahasa Cina SK",
  MUZIK: "Pendidikan Muzik",
  PSV: "Pendidikan Seni Visual",
};

export function subjectAliasKey(value: unknown) {
  return String(value ?? "").trim().toLocaleUpperCase("ms").normalize("NFKD").replace(/[^A-Z0-9]/g, "");
}

export function normalizeSubjectCode(value: unknown) {
  const raw = String(value ?? "").trim().toLocaleUpperCase("ms");
  return aliases[subjectAliasKey(raw)] ?? raw;
}

export function subjectDisplayName(value: unknown, schoolSubjects?: SchoolSubjectRecord[]) {
  const code = normalizeSubjectCode(value);
  if (schoolSubjects) {
    const match = schoolSubjects.find((s) => s.code === code);
    if (match) return match.name;
  }
  return subjectNames[code] ?? (String(value ?? code).trim() || code);
}

/**
 * Resolve a raw subject label against a school's configured subjects.
 * Checks the school's aliases first, then falls back to the global alias map.
 * Returns the canonical school subject code, or the normalized global code.
 */
export function resolveSubjectFromSchool(schoolSubjects: SchoolSubjectRecord[], rawLabel: unknown): string {
  const key = subjectAliasKey(rawLabel);
  if (!key) return String(rawLabel ?? "").trim();
  for (const subject of schoolSubjects) {
    if (subjectAliasKey(subject.code) === key) return subject.code;
    if (subject.aliases.some((alias) => subjectAliasKey(alias) === key)) return subject.code;
    if (subjectAliasKey(subject.name) === key) return subject.code;
  }
  // Fall back to global alias resolution
  return normalizeSubjectCode(rawLabel);
}
