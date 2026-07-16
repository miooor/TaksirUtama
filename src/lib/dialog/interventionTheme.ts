import type { DialogInterventionOwner, InterventionTheme } from "@/types/dialog";

const themePatterns: Array<{ theme: InterventionTheme; patterns: RegExp[] }> = [
  { theme: "Kehadiran", patterns: [/hadir/i, /ponteng/i, /absen/i, /attendance/i] },
  { theme: "Literasi", patterns: [/baca/i, /bacaan/i, /tulis/i, /menulis/i, /eja/i, /karangan/i, /literasi/i] },
  { theme: "Numerasi", patterns: [/kira/i, /nombor/i, /operasi/i, /sifir/i, /matematik/i, /numerasi/i] },
  { theme: "Kerja Tidak Lengkap", patterns: [/tidak lengkap/i, /kerja rumah/i, /latihan/i, /tugasan/i, /buku/i] },
  { theme: "Fokus/Sikap", patterns: [/fokus/i, /sikap/i, /motivasi/i, /minat/i, /cuai/i, /pasif/i, /disiplin/i] },
];

export function classifyInterventionTheme(problem: string, intervention = ""): InterventionTheme {
  const source = `${problem} ${intervention}`;
  return themePatterns.find((item) => item.patterns.some((pattern) => pattern.test(source)))?.theme ?? "Lain-lain";
}

export function ownerForInterventionTheme(theme: InterventionTheme): DialogInterventionOwner {
  if (theme === "Kehadiran") return "Guru Kelas";
  if (theme === "Literasi" || theme === "Numerasi") return "KP";
  if (theme === "Kerja Tidak Lengkap" || theme === "Fokus/Sikap") return "Guru Subjek";
  return "KP";
}

export function nextActionForInterventionTheme(theme: InterventionTheme) {
  if (theme === "Kehadiran") return "Semak kehadiran dan maklumkan Guru Kelas/Admin jika berulang.";
  if (theme === "Literasi") return "Susun kumpulan kecil bacaan/tulisan dan semak evidence mingguan.";
  if (theme === "Numerasi") return "Susun latih tubi kemahiran asas dan semak penguasaan semula.";
  if (theme === "Kerja Tidak Lengkap") return "Tetapkan latihan minimum dan semakan buku secara berkala.";
  if (theme === "Fokus/Sikap") return "Tetapkan pemantauan ringkas bersama Guru Kelas dan Guru Subjek.";
  return "Sahkan punca isu dan pilih tindakan panitia yang sesuai.";
}
