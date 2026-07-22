import type { UpsaStudentResult } from "@/types/upsa";
import type { SchoolPublicProfile } from "@/lib/config/schools";

const gradeScale = [
  { grade: "A", marks: "82-100", description: "CEMERLANG" },
  { grade: "B", marks: "66-81", description: "KEPUJIAN" },
  { grade: "C", marks: "50-65", description: "BAIK" },
  { grade: "D", marks: "35-49", description: "MEMUASKAN" },
  { grade: "E", marks: "20-34", description: "MENCAPAI TAHAP MINIMUM" },
  { grade: "F", marks: "0-19", description: "TIDAK MENCAPAI TAHAP MINIMUM" },
];

export function UpsaSlipPreview({ student, slipTitle, school }: { student: UpsaStudentResult; slipTitle: string; school: SchoolPublicProfile }) {
  const printedSubjects = student.subjects.filter((subject) => subject.status !== "missing");

  return (
    <section id={student.id} className="slip-sheet px-8 py-7 print:shadow-none">
      <div className="h-20" aria-hidden="true" />

      <div className="mx-auto max-w-[650px] border bg-slate-100 px-4 py-2 text-center">
        <h2 className="text-lg font-bold uppercase">Slip Keputusan</h2>
        <p className="text-lg font-bold uppercase">{slipTitle}</p>
      </div>

      <dl className="mx-auto mt-8 max-w-[650px] space-y-3 text-sm font-bold uppercase">
        <div className="grid grid-cols-[88px_16px_1fr]">
          <dt>Nama</dt>
          <dd>:</dd>
          <dd>{student.name}</dd>
        </div>
        <div className="grid grid-cols-[88px_16px_1fr]">
          <dt>Kelas</dt>
          <dd>:</dd>
          <dd>{student.className}</dd>
        </div>
      </dl>

      <div className="mx-auto mt-4 max-w-[650px] overflow-hidden border border-slate-900">
        <table className="w-full border-collapse text-sm uppercase">
          <thead className="bg-slate-100 text-left">
            <tr>
              <th className="w-[10%] border-r border-slate-900 px-3 py-1 text-center">Bil</th>
              <th className="w-[58%] border-r border-slate-900 px-3 py-1">Mata Pelajaran</th>
              <th className="w-[16%] border-r border-slate-900 px-3 py-1 text-center">Markah</th>
              <th className="w-[16%] px-3 py-1 text-center">Gred</th>
            </tr>
          </thead>
          <tbody>
            {printedSubjects.map((subject, index) => (
              <tr key={subject.subjectCode} className="border-t border-slate-900">
                <td className="border-r border-slate-900 px-3 py-1 text-center">{index + 1}</td>
                <td className="border-r border-slate-900 px-3 py-1">{subject.subjectName}</td>
                <td className="border-r border-slate-900 px-3 py-1 text-center">{subject.status === "absent" ? "TH" : subject.mark}</td>
                <td className="px-3 py-1 text-center">{subject.grade ?? "-"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mx-auto mt-7 max-w-[650px] overflow-hidden border border-slate-900">
        <table className="w-full border-collapse text-sm font-bold uppercase">
          <thead className="bg-slate-100">
            <tr>
              <th className="w-[19%] border-r border-slate-900 px-3 py-1">Gred</th>
              <th className="w-[20%] border-r border-slate-900 px-3 py-1">Markah</th>
              <th className="px-3 py-1">Taksiran Gred</th>
            </tr>
          </thead>
          <tbody>
            {gradeScale.map((item) => (
              <tr key={item.grade} className="border-t border-slate-900">
                <td className="border-r border-slate-900 px-3 py-1 text-center">{item.grade}</td>
                <td className="border-r border-slate-900 px-3 py-1 text-center">{item.marks}</td>
                <td className="px-3 py-1 text-center">{item.description}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mx-auto mt-12 flex max-w-[700px] justify-between text-center text-sm">
        <div className="w-[44%]">
          <div className="border-b border-dotted border-slate-900" />
          <p className="mt-2 italic">({student.teacherName})</p>
          <p className="font-bold">GURU KELAS</p>
        </div>
        <div className="w-[44%]">
          <div className="border-b border-dotted border-slate-900" />
          <p className="mt-2 text-xs italic">({school.headteacher.name})</p>
          <p className="font-bold">{school.name.toUpperCase()}</p>
        </div>
      </div>

      <div className="mt-14 text-center text-sm">
        <p className="font-bold">Tandatangan Ibu Bapa</p>
        <div className="mx-auto mt-8 w-56 border-b border-dotted border-slate-900" />
      </div>

      <p className="mt-8 text-xs italic">* Untuk kegunaan sekolah sahaja.</p>
    </section>
  );
}
