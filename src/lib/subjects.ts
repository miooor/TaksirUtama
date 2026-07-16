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

export function subjectDisplayName(value: unknown) {
  const code = normalizeSubjectCode(value);
  return subjectNames[code] ?? (String(value ?? code).trim() || code);
}
