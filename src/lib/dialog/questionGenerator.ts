import type { DialogInsightBrief, DialogQuestion } from "@/types/dialog";

export function generateDialogQuestions(brief: Pick<DialogInsightBrief, "findings" | "classRows" | "subjectCode" | "metrics">): DialogQuestion[] {
  const questions: DialogQuestion[] = [];
  const weakestClass = brief.classRows[0];

  for (const finding of brief.findings) {
    if (finding.category === "Risiko akademik") {
      questions.push({
        focus: "class",
        prompt: weakestClass
          ? `Apakah punca utama ${weakestClass.className} menjadi kelas perhatian bagi ${brief.subjectCode}, dan evidence murid mana perlu dibawa ke intervensi?`
          : `Apakah punca utama risiko akademik bagi ${brief.subjectCode}?`,
      });
    }
    if (finding.category === "Penguasaan rendah PBD") {
      questions.push({
        focus: "action",
        prompt: `Kemahiran asas manakah yang perlu dipulihkan dahulu untuk murid TP1/TP2 ${brief.subjectCode}?`,
      });
    }
    if (finding.category === "Jurang evidens UPSA/PBD") {
      questions.push({
        focus: "evidence",
        prompt: "Adakah tugasan PBD, item UPSA, atau standard pentaksiran perlu disemak semula supaya evidence lebih sejajar?",
      });
    }
    if (finding.category === "Data perlu semakan") {
      questions.push({
        focus: "evidence",
        prompt: "Data manakah yang perlu dilengkapkan sebelum keputusan intervensi dimuktamadkan?",
      });
    }
    if (finding.category === "Kekuatan panitia") {
      questions.push({
        focus: "action",
        prompt: `Amalan kelas manakah dalam ${brief.subjectCode} boleh dikongsi kepada kelas lain?`,
      });
    }
  }

  if (brief.metrics.repeatedRiskPupils > 0) {
    questions.push({
      focus: "pupil",
      prompt: `Siapakah antara ${brief.metrics.repeatedRiskPupils} murid risiko berulang yang perlu tindakan bersama KP, Guru Subjek dan Guru Kelas minggu ini?`,
    });
  }

  return [...new Map(questions.map((question) => [question.prompt, question])).values()].slice(0, 5);
}

export function generateFocusSuggestions(brief: Pick<DialogInsightBrief, "findings" | "classRows" | "subjectCode">) {
  const weakestClasses = brief.classRows.slice(0, 3).map((row) => row.className);
  const suggestions = brief.findings.map((finding) => {
    if (finding.category === "Risiko akademik") return `Utamakan analisis item UPSA dan latihan berfokus untuk ${weakestClasses.join(", ") || brief.subjectCode}.`;
    if (finding.category === "Penguasaan rendah PBD") return "Bina kumpulan kecil TP1/TP2 dengan kemahiran asas yang sama.";
    if (finding.category === "Jurang evidens UPSA/PBD") return "Semak semula evidence PBD berbanding item UPSA sebelum menetapkan sasaran.";
    if (finding.category === "Data perlu semakan") return "Lengkapkan data yang belum ditaksir dan sahkan padanan subjek/kelas.";
    return "Kongsi amalan kelas kuat sebagai rujukan panitia.";
  });
  return [...new Set(suggestions)].slice(0, 4);
}
