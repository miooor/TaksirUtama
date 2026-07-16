import { Document, Image as PdfImage, Page, StyleSheet, Text, View } from "@react-pdf/renderer";
import { pdfAssetSrc } from "@/pdf/templates/shared";
import type { SchoolPublicProfile } from "@/lib/config/schools";
import type { UpsaStudentResult } from "@/types/upsa";

const gradeScale = [
  { grade: "A", marks: "82-100", description: "CEMERLANG" },
  { grade: "B", marks: "66-81", description: "KEPUJIAN" },
  { grade: "C", marks: "50-65", description: "BAIK" },
  { grade: "D", marks: "35-49", description: "MEMUASKAN" },
  { grade: "E", marks: "20-34", description: "MENCAPAI TAHAP MINIMUM" },
  { grade: "F", marks: "0-19", description: "TIDAK MENCAPAI TAHAP MINIMUM" },
];

const styles = StyleSheet.create({
  page: {
    paddingHorizontal: 42,
    paddingTop: 28,
    paddingBottom: 24,
    fontSize: 10,
    color: "#111827",
  },
  letterhead: {
    width: "100%",
    height: 84,
    objectFit: "contain",
    marginBottom: 12,
  },
  titleBox: {
    borderWidth: 1,
    borderColor: "#111827",
    backgroundColor: "#e5e7eb",
    paddingVertical: 8,
    paddingHorizontal: 14,
    marginHorizontal: 24,
    marginBottom: 18,
  },
  title: {
    textAlign: "center",
    fontSize: 14,
    fontWeight: 700,
    lineHeight: 1.2,
  },
  identityBlock: {
    marginHorizontal: 24,
    marginBottom: 12,
  },
  identityRow: {
    flexDirection: "row",
    marginBottom: 7,
    fontSize: 11,
    fontWeight: 700,
  },
  identityLabel: {
    width: 72,
  },
  identityColon: {
    width: 14,
  },
  table: {
    marginHorizontal: 24,
    borderTopWidth: 1,
    borderLeftWidth: 1,
    borderColor: "#111827",
  },
  row: {
    flexDirection: "row",
  },
  cell: {
    borderRightWidth: 1,
    borderBottomWidth: 1,
    borderColor: "#111827",
    paddingVertical: 3,
    paddingHorizontal: 6,
    minHeight: 18,
    justifyContent: "center",
  },
  headerCell: {
    backgroundColor: "#e5e7eb",
    fontWeight: 700,
  },
  bilCol: {
    width: "10%",
    textAlign: "center",
  },
  subjectCol: {
    width: "58%",
  },
  markCol: {
    width: "16%",
    textAlign: "center",
  },
  gradeCol: {
    width: "16%",
    textAlign: "center",
  },
  gradeTable: {
    marginTop: 18,
  },
  gradeColSmall: {
    width: "19%",
    textAlign: "center",
  },
  gradeColMarks: {
    width: "20%",
    textAlign: "center",
  },
  gradeColDescription: {
    width: "61%",
    textAlign: "center",
  },
  signatures: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 42,
    marginHorizontal: 10,
  },
  signatureBlock: {
    width: "44%",
    alignItems: "center",
  },
  signatureLine: {
    width: "100%",
    borderBottomWidth: 1,
    borderBottomColor: "#111827",
    marginBottom: 4,
  },
  signatureName: {
    fontStyle: "italic",
    fontSize: 9,
    marginBottom: 2,
  },
  signatureRole: {
    fontWeight: 700,
  },
  parentSignature: {
    alignItems: "center",
    marginTop: 52,
  },
  parentTitle: {
    fontWeight: 700,
    marginBottom: 22,
  },
  parentLine: {
    width: 180,
    borderBottomWidth: 1,
    borderBottomColor: "#111827",
    marginBottom: 4,
  },
  note: {
    position: "absolute",
    left: 28,
    bottom: 10,
    fontSize: 8,
    fontStyle: "italic",
  },
});

function StudentSlipPage({ student, slipTitle, school }: { student: UpsaStudentResult; slipTitle: string; school: SchoolPublicProfile }) {
  const printedSubjects = student.subjects.filter((subject) => subject.status !== "missing");

  return (
    <Page size="A4" style={styles.page}>
      <PdfImage src={pdfAssetSrc(school.letterheadPath)} style={styles.letterhead} />

      <View style={styles.titleBox}>
        <Text style={styles.title}>SLIP KEPUTUSAN</Text>
        <Text style={styles.title}>{slipTitle}</Text>
      </View>

      <View style={styles.identityBlock}>
        <View style={styles.identityRow}>
          <Text style={styles.identityLabel}>NAMA</Text>
          <Text style={styles.identityColon}>:</Text>
          <Text>{student.name}</Text>
        </View>
        <View style={styles.identityRow}>
          <Text style={styles.identityLabel}>KELAS</Text>
          <Text style={styles.identityColon}>:</Text>
          <Text>{student.className}</Text>
        </View>
      </View>

      <View style={styles.table}>
        <View style={styles.row}>
          <Text style={[styles.cell, styles.headerCell, styles.bilCol]}>BIL</Text>
          <Text style={[styles.cell, styles.headerCell, styles.subjectCol]}>MATA PELAJARAN</Text>
          <Text style={[styles.cell, styles.headerCell, styles.markCol]}>MARKAH</Text>
          <Text style={[styles.cell, styles.headerCell, styles.gradeCol]}>GRED</Text>
        </View>
        {printedSubjects.map((subject, index) => (
          <View key={subject.subjectCode} style={styles.row}>
            <Text style={[styles.cell, styles.bilCol]}>{index + 1}</Text>
            <Text style={[styles.cell, styles.subjectCol]}>{subject.subjectName.toUpperCase()}</Text>
            <Text style={[styles.cell, styles.markCol]}>{subject.status === "absent" ? "TH" : subject.mark}</Text>
            <Text style={[styles.cell, styles.gradeCol]}>{subject.grade ?? "-"}</Text>
          </View>
        ))}
      </View>

      <View style={[styles.table, styles.gradeTable]}>
        <View style={styles.row}>
          <Text style={[styles.cell, styles.headerCell, styles.gradeColSmall]}>GRED</Text>
          <Text style={[styles.cell, styles.headerCell, styles.gradeColMarks]}>MARKAH</Text>
          <Text style={[styles.cell, styles.headerCell, styles.gradeColDescription]}>TAKSIRAN GRED</Text>
        </View>
        {gradeScale.map((item) => (
          <View key={item.grade} style={styles.row}>
            <Text style={[styles.cell, styles.gradeColSmall, { fontWeight: 700 }]}>{item.grade}</Text>
            <Text style={[styles.cell, styles.gradeColMarks, { fontWeight: 700 }]}>{item.marks}</Text>
            <Text style={[styles.cell, styles.gradeColDescription, { fontWeight: 700 }]}>{item.description}</Text>
          </View>
        ))}
      </View>

      <View style={styles.signatures}>
        <View style={styles.signatureBlock}>
          <View style={styles.signatureLine} />
          <Text style={styles.signatureName}>({student.teacherName})</Text>
          <Text style={styles.signatureRole}>GURU KELAS</Text>
        </View>
        <View style={styles.signatureBlock}>
          <View style={styles.signatureLine} />
          <Text style={styles.signatureName}>({school.headteacher.name})</Text>
          <Text style={styles.signatureRole}>{school.headteacher.title.toUpperCase()} {school.name.toUpperCase()}</Text>
        </View>
      </View>

      <View style={styles.parentSignature}>
        <Text style={styles.parentTitle}>Tandatangan Ibu Bapa</Text>
        <View style={styles.parentLine} />
      </View>

      <Text style={styles.note}>* Untuk kegunaan sekolah sahaja.</Text>
    </Page>
  );
}

export function SkspsUpsaSlipTemplate({ student, slipTitle, school }: { student: UpsaStudentResult; slipTitle: string; school: SchoolPublicProfile }) {
  return (
    <Document>
      <StudentSlipPage student={student} slipTitle={slipTitle} school={school} />
    </Document>
  );
}

export function SkspsUpsaClassSlipTemplate({ students, slipTitle, school }: { students: UpsaStudentResult[]; slipTitle: string; school: SchoolPublicProfile }) {
  return (
    <Document>
      {students.map((student) => (
        <StudentSlipPage key={student.id} student={student} slipTitle={slipTitle} school={school} />
      ))}
    </Document>
  );
}
