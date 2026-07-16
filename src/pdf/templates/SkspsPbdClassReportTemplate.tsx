import { Document, Image as PdfImage, Page, StyleSheet, Text, View } from "@react-pdf/renderer";
import type { PbdClassAnalysis, PbdSubjectClassRecord } from "@/types/pbd";
import { pdfAssetSrc } from "@/pdf/templates/shared";
import type { SchoolPublicProfile } from "@/lib/config/schools";

const styles = StyleSheet.create({
  page: { padding: 28, fontSize: 8.5, color: "#172033" },
  header: { textAlign: "center", marginBottom: 14 },
  logo: { width: 42, height: 42, alignSelf: "center", marginBottom: 6 },
  title: { fontSize: 15, fontWeight: 700, marginTop: 4 },
  row: { flexDirection: "row", gap: 8 },
  metric: { flexGrow: 1, backgroundColor: "#f8fafc", borderWidth: 1, borderColor: "#e2e8f0", padding: 8 },
  metricLabel: { color: "#64748b", marginBottom: 4 },
  metricValue: { fontSize: 13, fontWeight: 700 },
  section: { marginTop: 13 },
  sectionTitle: { fontSize: 11, fontWeight: 700, marginBottom: 7 },
  tableHeader: { flexDirection: "row", backgroundColor: "#f1f5f9", padding: 5, fontWeight: 700 },
  tableRow: { flexDirection: "row", borderBottomWidth: 1, borderBottomColor: "#d9dfeb", padding: 5 },
  chartRow: { flexDirection: "row", alignItems: "center", marginBottom: 6 },
  chartLabel: { width: "18%", fontWeight: 700 },
  chartTrack: { width: "54%", height: 9, backgroundColor: "#e2e8f0" },
  chartValue: { width: "28%", textAlign: "right" },
  wide: { width: "19%" },
  col: { width: "10%" },
  mid: { width: "13%" },
  note: { marginTop: 5, color: "#64748b" },
  footer: { position: "absolute", bottom: 18, right: 28, color: "#667085" },
});

function totalLow(records: PbdSubjectClassRecord[]) {
  return records.reduce((sum, record) => sum + record.lowAchievementCount, 0);
}

function totalHigh(records: PbdSubjectClassRecord[]) {
  return records.reduce((sum, record) => sum + record.highAchievementCount, 0);
}

function totalPupils(records: PbdSubjectClassRecord[]) {
  return records.reduce((sum, record) => sum + record.totalPupils, 0);
}

function SubjectRiskBar({ record }: { record: PbdSubjectClassRecord }) {
  return (
    <View style={styles.chartRow}>
      <Text style={styles.chartLabel}>{record.subjectCode}</Text>
      <View style={styles.chartTrack}>
        <View style={{ height: 9, width: `${Math.max(3, Math.min(100, record.lowAchievementPercentage))}%`, backgroundColor: record.lowAchievementPercentage >= 20 ? "#be123c" : "#0f766e" }} />
      </View>
      <Text style={styles.chartValue}>TP1+TP2 {record.lowAchievementCount} ({record.lowAchievementPercentage.toFixed(1)}%)</Text>
    </View>
  );
}

export function SkspsPbdClassReportTemplate({ analysis, school }: { analysis: PbdClassAnalysis; school: SchoolPublicProfile }) {
  const recordsByRisk = [...analysis.subjectRecords].sort((a, b) => b.lowAchievementCount - a.lowAchievementCount || a.subjectCode.localeCompare(b.subjectCode, "ms"));
  const pupils = totalPupils(analysis.subjectRecords);
  const low = totalLow(analysis.subjectRecords);
  const high = totalHigh(analysis.subjectRecords);
  const notAssessed = analysis.subjectRecords.reduce((sum, record) => sum + record.notAssessedCount, 0);

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <PdfImage src={pdfAssetSrc(school.logoPath)} style={styles.logo} />
          <Text>{school.name.toUpperCase()}</Text>
          <Text style={styles.title}>LAPORAN PBD KELAS</Text>
          <Text>{analysis.className}</Text>
        </View>

        <View style={styles.row}>
          <View style={styles.metric}><Text style={styles.metricLabel}>Subjek</Text><Text style={styles.metricValue}>{analysis.totalSubjects}</Text></View>
          <View style={styles.metric}><Text style={styles.metricLabel}>Jumlah Rekod Murid</Text><Text style={styles.metricValue}>{pupils}</Text></View>
          <View style={styles.metric}><Text style={styles.metricLabel}>TP1+TP2</Text><Text style={styles.metricValue}>{low}</Text></View>
          <View style={styles.metric}><Text style={styles.metricLabel}>TP5+TP6</Text><Text style={styles.metricValue}>{high}</Text></View>
          <View style={styles.metric}><Text style={styles.metricLabel}>Belum Ditaksir</Text><Text style={styles.metricValue}>{notAssessed}</Text></View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Subjek Mengikut Risiko PBD</Text>
          {recordsByRisk.map((record) => <SubjectRiskBar key={record.subjectCode} record={record} />)}
          <Text style={styles.note}>Bar menunjukkan bilangan dan peratus TP1+TP2 bagi kelas ini.</Text>
        </View>

        <View style={styles.section} break>
          <Text style={styles.sectionTitle}>Ringkasan Subjek</Text>
          <View style={styles.tableHeader}>
            <Text style={styles.wide}>Subjek</Text>
            <Text style={styles.mid}>Murid</Text>
            <Text style={styles.mid}>Dominan</Text>
            <Text style={styles.mid}>TP1+TP2</Text>
            <Text style={styles.mid}>TP5+TP6</Text>
            <Text style={styles.wide}>Isu Data</Text>
          </View>
          {recordsByRisk.map((record) => (
            <View key={record.subjectCode} style={styles.tableRow}>
              <Text style={styles.wide}>{record.subjectCode}</Text>
              <Text style={styles.mid}>{record.totalPupils}</Text>
              <Text style={styles.mid}>{record.dominantTpBand ?? "-"}</Text>
              <Text style={styles.mid}>{record.lowAchievementCount} ({record.lowAchievementPercentage.toFixed(1)}%)</Text>
              <Text style={styles.mid}>{record.highAchievementCount} ({record.highAchievementPercentage.toFixed(1)}%)</Text>
              <Text style={styles.wide}>{record.dataIssues.join(", ") || "-"}</Text>
            </View>
          ))}
        </View>

        <Text fixed style={styles.footer} render={({ pageNumber, totalPages }) => `Muka surat ${pageNumber} / ${totalPages}`} />
      </Page>

      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <Text style={styles.title}>DAPATAN RINGKAS KELAS</Text>
          <Text>{analysis.className}</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Fokus Dialog Prestasi</Text>
          <Text style={styles.note}>Subjek lemah: {analysis.subjectsWithLowAchievement.length}. Subjek belum lengkap: {analysis.subjectsWithNotAssessed.length}. Jumlah TP1+TP2: {low}. Jumlah TP5+TP6: {high}.</Text>
          {recordsByRisk.slice(0, 10).map((record) => (
            <Text key={record.subjectCode} style={styles.note}>
              {record.subjectCode}: TP1+TP2 {record.lowAchievementCount} murid, TP5+TP6 {record.highAchievementCount} murid, belum ditaksir {record.notAssessedCount}.
            </Text>
          ))}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Subjek Perlu Semakan Data</Text>
          {analysis.subjectsWithNotAssessed.length ? analysis.subjectsWithNotAssessed.map((record) => (
            <Text key={record.subjectCode} style={styles.note}>{record.subjectCode}: {record.notAssessedCount} murid belum ditaksir.</Text>
          )) : <Text style={styles.note}>Tiada subjek dengan isu belum ditaksir.</Text>}
        </View>

        <Text fixed style={styles.footer} render={({ pageNumber, totalPages }) => `Muka surat ${pageNumber} / ${totalPages}`} />
      </Page>
    </Document>
  );
}
