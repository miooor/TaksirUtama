import { Document, Image as PdfImage, Page, StyleSheet, Text, View } from "@react-pdf/renderer";
import type { UpsaClassAnalysis, UpsaClassResult } from "@/types/upsa";
import { pdfAssetSrc } from "@/pdf/templates/shared";
import type { SchoolPublicProfile } from "@/lib/config/schools";
import type { AssessmentPeriod } from "@/lib/config/periods";
import { buildUpsaReportSubjectRows, gradeOrder, type UpsaReportSubjectRow } from "@/lib/pdf/reportData";

const gradeColors: Record<string, string> = {
  A: "#059669",
  B: "#0f766e",
  C: "#0ea5e9",
  D: "#f59e0b",
  E: "#ea580c",
  F: "#be123c",
  TH: "#64748b",
};

const styles = StyleSheet.create({
  page: { padding: 28, fontSize: 8.5, color: "#172033" },
  header: { textAlign: "center", marginBottom: 14 },
  logo: { width: 42, height: 42, alignSelf: "center", marginBottom: 6 },
  title: { fontSize: 15, fontWeight: 700, marginTop: 4 },
  section: { marginTop: 13 },
  sectionTitle: { fontSize: 11, fontWeight: 700, marginBottom: 7 },
  row: { flexDirection: "row", gap: 8 },
  metric: { flexGrow: 1, backgroundColor: "#f8fafc", borderWidth: 1, borderColor: "#e2e8f0", padding: 8 },
  metricLabel: { color: "#64748b", marginBottom: 4 },
  metricValue: { fontSize: 13, fontWeight: 700 },
  tableHeader: { flexDirection: "row", backgroundColor: "#f1f5f9", padding: 5, fontWeight: 700 },
  tableRow: { flexDirection: "row", borderBottomWidth: 1, borderBottomColor: "#d9dfeb", padding: 5 },
  subject: { width: "14%" },
  small: { width: "9%" },
  medium: { width: "12%" },
  gradeCol: { width: "6%" },
  note: { marginTop: 5, color: "#667085" },
  listItem: { marginBottom: 3 },
  chartRow: { flexDirection: "row", alignItems: "center", marginBottom: 6 },
  chartLabel: { width: "15%", fontWeight: 700 },
  chartTrack: { width: "56%", height: 10, backgroundColor: "#e2e8f0", flexDirection: "row" },
  chartValue: { width: "29%", textAlign: "right" },
  splitTrack: { width: "28%", height: 9, backgroundColor: "#e2e8f0" },
  gradeSegmentText: { color: "#ffffff", fontSize: 6, textAlign: "center" },
  gradeCompactLabels: { flexDirection: "row", flexWrap: "wrap", gap: 5, marginLeft: "15%", marginBottom: 4 },
  gradeCompactLabel: { fontSize: 6.5, color: "#475569" },
  legend: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 6 },
  legendItem: { flexDirection: "row", alignItems: "center", gap: 3 },
  swatch: { width: 8, height: 8 },
  footer: { position: "absolute", bottom: 18, right: 28, color: "#667085" },
});

type SubjectAnalysis = UpsaClassAnalysis["subjectAnalyses"][number] | UpsaReportSubjectRow;

function gradeCount(subject: SubjectAnalysis, grade: string) {
  return subject.gradeDistribution[grade] ?? 0;
}

function gradeTotal(subject: SubjectAnalysis) {
  return Object.values(subject.gradeDistribution).reduce((sum, value) => sum + value, 0);
}

function GradeStackedBar({ subject }: { subject: SubjectAnalysis }) {
  const total = Math.max(gradeTotal(subject), 1);
  return (
    <View>
      <View style={styles.chartRow}>
        <Text style={styles.chartLabel}>{subject.subjectCode}</Text>
        <View style={styles.chartTrack}>
          {gradeOrder.map((grade) => {
            const count = gradeCount(subject, grade);
            const width = (count / total) * 100;
            return (
              <View
                key={grade}
                style={{
                  height: 10,
                  width: `${width}%`,
                  backgroundColor: gradeColors[grade],
                }}
              >
                {count > 0 && width >= 8 ? <Text style={styles.gradeSegmentText}>{count}</Text> : null}
              </View>
            );
          })}
        </View>
        <Text style={styles.chartValue}>Lulus {subject.passCount} | Gagal {subject.failCount} | Diisi {subject.enteredCount}</Text>
      </View>
      <View style={styles.gradeCompactLabels}>
        {gradeOrder.map((grade) => <Text key={grade} style={styles.gradeCompactLabel}>{grade} {gradeCount(subject, grade)}</Text>)}
      </View>
    </View>
  );
}

function AveragePassBar({ subject, maxAverage }: { subject: SubjectAnalysis; maxAverage: number }) {
  const average = subject.average ?? 0;
  const pass = subject.passPercentage ?? 0;
  return (
    <View style={styles.chartRow}>
      <Text style={styles.chartLabel}>{subject.subjectCode}</Text>
      <View style={styles.splitTrack}><View style={{ height: 9, width: `${(average / maxAverage) * 100}%`, backgroundColor: "#0f766e" }} /></View>
      <View style={styles.splitTrack}><View style={{ height: 9, width: `${pass}%`, backgroundColor: "#0ea5e9" }} /></View>
      <Text style={styles.chartValue}>Purata {subject.average?.toFixed(1) ?? "-"} | Lulus {subject.passCount}/{subject.enteredCount} ({subject.passPercentage?.toFixed(1) ?? "-"}%)</Text>
    </View>
  );
}

export function SkspsUpsaAnalysisReportTemplate({
  result,
  analysis,
  period,
  school,
}: {
  result: UpsaClassResult;
  analysis: UpsaClassAnalysis;
  period?: AssessmentPeriod;
  school: SchoolPublicProfile;
}) {
  const totalPass = analysis.subjectAnalyses.reduce((sum, subject) => sum + subject.passCount, 0);
  const totalFail = analysis.subjectAnalyses.reduce((sum, subject) => sum + subject.failCount, 0);
  const totalEntered = analysis.subjectAnalyses.reduce((sum, subject) => sum + subject.enteredCount, 0);
  const sortedSubjects = [...analysis.subjectAnalyses].sort((a, b) => (a.average ?? 0) - (b.average ?? 0) || a.subjectCode.localeCompare(b.subjectCode, "ms"));
  const reportSubjectRows = buildUpsaReportSubjectRows(analysis.subjectAnalyses);
  const maxReportAverage = Math.max(...reportSubjectRows.map((subject) => subject.average ?? 0), 1);

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <PdfImage src={pdfAssetSrc(school.logoPath)} style={styles.logo} />
          <Text>{school.name.toUpperCase()}</Text>
          <Text style={styles.title}>LAPORAN ANALISIS {period ? `${period.assessment.toUpperCase()} ${period.year}` : "UPSA 2026"}</Text>
          <Text>{result.className} | {result.teacherName}</Text>
        </View>

        <View style={styles.row}>
          <View style={styles.metric}><Text style={styles.metricLabel}>Murid</Text><Text style={styles.metricValue}>{analysis.pupilCount}</Text></View>
          <View style={styles.metric}><Text style={styles.metricLabel}>Dengan Markah</Text><Text style={styles.metricValue}>{analysis.pupilsWithMarks}</Text></View>
          <View style={styles.metric}><Text style={styles.metricLabel}>Purata Kelas</Text><Text style={styles.metricValue}>{analysis.classAverage?.toFixed(1) ?? "-"}</Text></View>
          <View style={styles.metric}><Text style={styles.metricLabel}>Lulus/Gagal</Text><Text style={styles.metricValue}>{totalPass}/{totalFail}</Text></View>
          <View style={styles.metric}><Text style={styles.metricLabel}>Intervensi</Text><Text style={styles.metricValue}>{analysis.interventionPupils.length}</Text></View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Purata dan Kadar Lulus Mengikut Subjek</Text>
          {reportSubjectRows.map((subject) => <AveragePassBar key={subject.subjectCode} subject={subject} maxAverage={maxReportAverage} />)}
          <Text style={styles.note}>Bar kiri = purata markah. Bar kanan = kadar lulus. Label menunjukkan bilangan murid, bukan peratus sahaja.</Text>
        </View>

        <View style={styles.section} break>
          <Text style={styles.sectionTitle}>Taburan Gred Mengikut Subjek</Text>
          {reportSubjectRows.map((subject) => <GradeStackedBar key={subject.subjectCode} subject={subject} />)}
          <View style={styles.legend}>
            {gradeOrder.map((grade) => (
              <View key={grade} style={styles.legendItem}><View style={[styles.swatch, { backgroundColor: gradeColors[grade] }]} /><Text>{grade}</Text></View>
            ))}
          </View>
        </View>

        <View style={styles.section} break>
          <Text style={styles.sectionTitle}>Jadual Analisis Subjek</Text>
          <View style={styles.tableHeader}>
            <Text style={styles.subject}>Subjek</Text>
            <Text style={styles.small}>Diisi</Text>
            <Text style={styles.small}>Hilang</Text>
            <Text style={styles.small}>TH</Text>
            <Text style={styles.small}>Purata</Text>
            <Text style={styles.medium}>Lulus</Text>
            <Text style={styles.medium}>Gagal</Text>
            <Text style={styles.medium}>Kadar Lulus</Text>
          </View>
          {sortedSubjects.map((subject) => (
            <View key={subject.subjectCode} style={styles.tableRow}>
              <Text style={styles.subject}>{subject.subjectCode}</Text>
              <Text style={styles.small}>{subject.enteredCount}</Text>
              <Text style={styles.small}>{subject.missingCount}</Text>
              <Text style={styles.small}>{subject.absentCount}</Text>
              <Text style={styles.small}>{subject.average?.toFixed(1) ?? "-"}</Text>
              <Text style={styles.medium}>{subject.passCount}</Text>
              <Text style={styles.medium}>{subject.failCount}</Text>
              <Text style={styles.medium}>{subject.passPercentage?.toFixed(1) ?? "-"}%</Text>
            </View>
          ))}
          <Text style={styles.note}>Markah kosong dikira sebagai isu data; TH dikira sebagai tidak hadir, bukan markah gagal.</Text>
        </View>

        <Text fixed style={styles.footer} render={({ pageNumber, totalPages }) => `Muka surat ${pageNumber} / ${totalPages}`} />
      </Page>

      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <Text style={styles.title}>TABURAN GRED DAN SENARAI TINDAKAN</Text>
          <Text>{result.className}</Text>
        </View>

        <View style={styles.section} break>
          <Text style={styles.sectionTitle}>Bilangan Gred Mengikut Subjek</Text>
          <View style={styles.tableHeader}>
            <Text style={styles.subject}>Subjek</Text>
            {gradeOrder.map((grade) => <Text key={grade} style={styles.gradeCol}>{grade}</Text>)}
            <Text style={styles.medium}>Jumlah Gred</Text>
            <Text style={styles.medium}>Purata</Text>
            <Text style={styles.medium}>Lulus</Text>
          </View>
          {sortedSubjects.map((subject) => (
            <View key={subject.subjectCode} style={styles.tableRow}>
              <Text style={styles.subject}>{subject.subjectCode}</Text>
              {gradeOrder.map((grade) => <Text key={grade} style={styles.gradeCol}>{gradeCount(subject, grade)}</Text>)}
              <Text style={styles.medium}>{gradeTotal(subject)}</Text>
              <Text style={styles.medium}>{subject.average?.toFixed(1) ?? "-"}</Text>
              <Text style={styles.medium}>{subject.passCount}/{subject.enteredCount}</Text>
            </View>
          ))}
        </View>

        <View style={styles.row}>
          <View style={[styles.section, { width: "50%" }]}>
            <Text style={styles.sectionTitle}>Murid Perlu Intervensi</Text>
            {analysis.interventionPupils.length ? analysis.interventionPupils.slice(0, 18).map((student) => (
              <Text key={student.id} style={styles.listItem}>{student.name} - purata {student.average?.toFixed(1) ?? "-"}</Text>
            )) : <Text style={styles.note}>Tiada murid dalam senarai intervensi.</Text>}
          </View>

          <View style={[styles.section, { width: "50%" }]}>
            <Text style={styles.sectionTitle}>Murid Cemerlang</Text>
            {analysis.highAchievers.length ? analysis.highAchievers.slice(0, 18).map((student) => (
              <Text key={student.id} style={styles.listItem}>{student.name} - purata {student.average?.toFixed(1) ?? "-"}</Text>
            )) : <Text style={styles.note}>Tiada rekod cemerlang berdasarkan syarat semasa.</Text>}
          </View>
        </View>

        <View style={styles.row}>
          <View style={[styles.section, { width: "50%" }]}>
            <Text style={styles.sectionTitle}>Isu Data: Markah Kosong</Text>
            {analysis.missingMarks.length ? analysis.missingMarks.slice(0, 16).map((item) => (
              <Text key={item.studentName} style={styles.listItem}>{item.studentName}: {item.subjects.join(", ")}</Text>
            )) : <Text style={styles.note}>Tiada isu markah kosong.</Text>}
          </View>

          <View style={[styles.section, { width: "50%" }]}>
            <Text style={styles.sectionTitle}>TH / Tak Hadir</Text>
            {analysis.absentPupils.length ? analysis.absentPupils.slice(0, 16).map((item) => (
              <Text key={item.studentName} style={styles.listItem}>{item.studentName}: {item.subjects.join(", ")}</Text>
            )) : <Text style={styles.note}>Tiada rekod TH.</Text>}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Dapatan Ringkas Untuk Dialog Prestasi</Text>
          <Text style={styles.note}>Jumlah markah subjek diisi: {totalEntered}. Jumlah lulus: {totalPass}. Jumlah gagal: {totalFail}.</Text>
          {sortedSubjects.slice(0, 8).map((subject) => (
            <Text key={subject.subjectCode} style={styles.note}>
              {subject.subjectCode}: purata {subject.average?.toFixed(1) ?? "-"}, lulus {subject.passCount}/{subject.enteredCount}, gagal {subject.failCount}, F {gradeCount(subject, "F")} murid.
            </Text>
          ))}
        </View>

        <Text fixed style={styles.footer} render={({ pageNumber, totalPages }) => `Muka surat ${pageNumber} / ${totalPages}`} />
      </Page>
    </Document>
  );
}
