import { Document, Image as PdfImage, Page, StyleSheet, Text, View } from "@react-pdf/renderer";
import type { PbdSubjectAnalysis, PbdYearAnalysis, TpBand } from "@/types/pbd";
import { pdfAssetSrc } from "@/pdf/templates/shared";
import type { SchoolPublicProfile } from "@/lib/config/schools";
import { buildPbdTpSegments } from "@/lib/pdf/reportData";

const bands: TpBand[] = ["TP1", "TP2", "TP3", "TP4", "TP5", "TP6"];
const bandColors: Record<TpBand, string> = {
  TP1: "#be123c",
  TP2: "#ea580c",
  TP3: "#f59e0b",
  TP4: "#0ea5e9",
  TP5: "#0f766e",
  TP6: "#059669",
};

const styles = StyleSheet.create({
  page: { padding: 28, fontSize: 8.5, color: "#172033" },
  header: { textAlign: "center", marginBottom: 14 },
  logo: { width: 42, height: 42, alignSelf: "center", marginBottom: 6 },
  title: { fontSize: 15, fontWeight: 700, marginTop: 3 },
  row: { flexDirection: "row", gap: 8 },
  metric: { flexGrow: 1, backgroundColor: "#f8fafc", borderWidth: 1, borderColor: "#e2e8f0", padding: 8 },
  metricLabel: { color: "#64748b", marginBottom: 4 },
  metricValue: { fontSize: 13, fontWeight: 700 },
  section: { marginTop: 13 },
  sectionTitle: { fontSize: 11, fontWeight: 700, marginBottom: 7 },
  tableHeader: { flexDirection: "row", backgroundColor: "#f1f5f9", padding: 5, fontWeight: 700 },
  tableRow: { flexDirection: "row", borderBottomWidth: 1, borderBottomColor: "#d9dfeb", padding: 5 },
  subjectCol: { width: "14%" },
  wideCol: { width: "22%" },
  col: { width: "10%" },
  midCol: { width: "13%" },
  note: { marginTop: 5, color: "#64748b" },
  chartRow: { flexDirection: "row", alignItems: "center", marginBottom: 6 },
  chartLabel: { width: "15%", fontWeight: 700 },
  chartTrack: { width: "62%", height: 10, backgroundColor: "#e2e8f0", flexDirection: "row" },
  chartValue: { width: "23%", textAlign: "right" },
  segmentText: { color: "#ffffff", fontSize: 6, textAlign: "center" },
  compactLabels: { flexDirection: "row", flexWrap: "wrap", gap: 5, marginLeft: "15%", marginBottom: 4 },
  compactLabel: { fontSize: 6.5, color: "#475569" },
  legend: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 6 },
  legendItem: { flexDirection: "row", alignItems: "center", gap: 3 },
  swatch: { width: 8, height: 8 },
  weakBar: { height: 8, backgroundColor: "#be123c" },
  highBar: { height: 8, backgroundColor: "#059669" },
  splitTrack: { width: "50%", height: 8, backgroundColor: "#e2e8f0" },
  footer: { position: "absolute", bottom: 18, right: 28, color: "#667085" },
});

function percent(count: number, total: number) {
  return total ? (count / total) * 100 : 0;
}

function lowCount(subject: PbdSubjectAnalysis) {
  return subject.aggregateTpCounts.TP1 + subject.aggregateTpCounts.TP2;
}

function highCount(subject: PbdSubjectAnalysis) {
  return subject.aggregateTpCounts.TP5 + subject.aggregateTpCounts.TP6;
}

function totalAssessed(subject: PbdSubjectAnalysis) {
  return Object.values(subject.aggregateTpCounts).reduce((sum, value) => sum + value, 0);
}

function TpStackedBar({ subject }: { subject: PbdSubjectAnalysis }) {
  const total = Math.max(totalAssessed(subject), 1);
  const segments = buildPbdTpSegments(subject.aggregateTpCounts, total);
  return (
    <View>
      <View style={styles.chartRow}>
        <Text style={styles.chartLabel}>{subject.subjectCode}</Text>
        <View style={styles.chartTrack}>
          {segments.map((segment) => (
            <View
              key={segment.band}
              style={{ width: `${segment.percentage}%`, backgroundColor: bandColors[segment.band], height: 10 }}
            >
              {segment.showInside ? <Text style={styles.segmentText}>{segment.count}</Text> : null}
            </View>
          ))}
        </View>
        <Text style={styles.chartValue}>
          {lowCount(subject)} TP1+TP2 | {highCount(subject)} TP5+TP6
        </Text>
      </View>
      <View style={styles.compactLabels}>
        {segments.map((segment) => <Text key={segment.band} style={styles.compactLabel}>{segment.label}</Text>)}
      </View>
    </View>
  );
}

function WeakStrongBar({ subject, max }: { subject: PbdSubjectAnalysis; max: number }) {
  const low = lowCount(subject);
  const high = highCount(subject);
  const total = Math.max(totalAssessed(subject), 1);
  return (
    <View style={styles.chartRow}>
      <Text style={styles.chartLabel}>{subject.subjectCode}</Text>
      <View style={styles.splitTrack}><View style={[styles.weakBar, { width: `${(low / max) * 100}%` }]} /></View>
      <View style={styles.splitTrack}><View style={[styles.highBar, { width: `${(high / max) * 100}%` }]} /></View>
      <Text style={styles.chartValue}>
        Lemah {low} ({percent(low, total).toFixed(1)}%) | Cemerlang {high} ({percent(high, total).toFixed(1)}%)
      </Text>
    </View>
  );
}

export function SkspsPbdYearReportTemplate({ analysis, school }: { analysis: PbdYearAnalysis; school: SchoolPublicProfile }) {
  const totalPupils = analysis.subjectAnalyses.reduce((sum, subject) => sum + subject.totalPupils, 0);
  const totalLow = analysis.subjectAnalyses.reduce((sum, subject) => sum + lowCount(subject), 0);
  const totalHigh = analysis.subjectAnalyses.reduce((sum, subject) => sum + highCount(subject), 0);
  const totalNotAssessed = analysis.subjectAnalyses.reduce((sum, subject) => sum + subject.totalNotAssessed, 0);
  const maxWeakStrong = Math.max(...analysis.subjectAnalyses.flatMap((subject) => [lowCount(subject), highCount(subject)]), 1);
  const subjectsByAttention = [...analysis.subjectAnalyses].sort((a, b) => lowCount(b) - lowCount(a) || highCount(a) - highCount(b));

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <PdfImage src={pdfAssetSrc(school.logoPath)} style={styles.logo} />
          <Text>{school.name.toUpperCase()}</Text>
          <Text style={styles.title}>LAPORAN ANALISIS PBD TAHUN</Text>
          <Text>Tahun {analysis.year}</Text>
        </View>

        <View style={styles.row}>
          <View style={styles.metric}><Text style={styles.metricLabel}>Kelas</Text><Text style={styles.metricValue}>{analysis.classNames.length}</Text></View>
          <View style={styles.metric}><Text style={styles.metricLabel}>Subjek</Text><Text style={styles.metricValue}>{analysis.subjectAnalyses.length}</Text></View>
          <View style={styles.metric}><Text style={styles.metricLabel}>Jumlah Rekod Murid</Text><Text style={styles.metricValue}>{totalPupils}</Text></View>
          <View style={styles.metric}><Text style={styles.metricLabel}>TP1+TP2</Text><Text style={styles.metricValue}>{totalLow}</Text></View>
          <View style={styles.metric}><Text style={styles.metricLabel}>TP5+TP6</Text><Text style={styles.metricValue}>{totalHigh}</Text></View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Taburan TP Mengikut Subjek</Text>
          {subjectsByAttention.map((subject) => <TpStackedBar key={subject.subjectCode} subject={subject} />)}
          <View style={styles.legend}>
            {bands.map((band) => (
              <View key={band} style={styles.legendItem}><View style={[styles.swatch, { backgroundColor: bandColors[band] }]} /><Text>{band}</Text></View>
            ))}
          </View>
        </View>

        <View style={styles.section} break>
          <Text style={styles.sectionTitle}>Subjek Lemah vs Cemerlang (Bilangan Murid)</Text>
          {subjectsByAttention.map((subject) => <WeakStrongBar key={subject.subjectCode} subject={subject} max={maxWeakStrong} />)}
          <Text style={styles.note}>Lemah = TP1+TP2. Cemerlang = TP5+TP6. Carta menggunakan bilangan murid; peratus ditunjukkan dalam label.</Text>
        </View>

        <View style={styles.section} break>
          <Text style={styles.sectionTitle}>Jadual Perbandingan Subjek</Text>
          <View style={styles.tableHeader}>
            <Text style={styles.subjectCol}>Subjek</Text>
            <Text style={styles.midCol}>Murid</Text>
            {bands.map((band) => <Text key={band} style={styles.col}>{band}</Text>)}
            <Text style={styles.midCol}>TP1+TP2</Text>
            <Text style={styles.midCol}>TP5+TP6</Text>
            <Text style={styles.midCol}>Belum Ditaksir</Text>
          </View>
          {subjectsByAttention.map((subject) => {
            const total = totalAssessed(subject);
            return (
              <View key={subject.subjectCode} style={styles.tableRow}>
                <Text style={styles.subjectCol}>{subject.subjectCode}</Text>
                <Text style={styles.midCol}>{subject.totalPupils}</Text>
                {bands.map((band) => <Text key={band} style={styles.col}>{subject.aggregateTpCounts[band]}</Text>)}
                <Text style={styles.midCol}>{lowCount(subject)} ({percent(lowCount(subject), total).toFixed(1)}%)</Text>
                <Text style={styles.midCol}>{highCount(subject)} ({percent(highCount(subject), total).toFixed(1)}%)</Text>
                <Text style={styles.midCol}>{subject.totalNotAssessed}</Text>
              </View>
            );
          })}
        </View>
      </Page>

      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <Text style={styles.title}>PERINCIAN KELAS DAN FOKUS TINDAKAN</Text>
          <Text>Tahun {analysis.year}</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Perbandingan Kelas</Text>
          <View style={styles.tableHeader}>
            <Text style={styles.wideCol}>Kelas</Text>
            <Text style={styles.midCol}>Subjek</Text>
            <Text style={styles.midCol}>Subjek Lemah</Text>
            <Text style={styles.midCol}>Subjek Belum Lengkap</Text>
            <Text style={styles.midCol}>Purata TP5+TP6</Text>
          </View>
          {analysis.classComparisons
            .sort((a, b) => b.lowAchievementSubjects - a.lowAchievementSubjects || b.incompleteSubjects - a.incompleteSubjects)
            .map((row) => (
              <View key={row.className} style={styles.tableRow}>
                <Text style={styles.wideCol}>{row.className}</Text>
                <Text style={styles.midCol}>{row.totalSubjects}</Text>
                <Text style={styles.midCol}>{row.lowAchievementSubjects}</Text>
                <Text style={styles.midCol}>{row.incompleteSubjects}</Text>
                <Text style={styles.midCol}>{row.highAchievementAverage.toFixed(1)}%</Text>
              </View>
            ))}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Dapatan Ringkas Untuk Dialog Prestasi</Text>
          <Text style={styles.note}>Jumlah TP1+TP2: {totalLow} murid. Jumlah TP5+TP6: {totalHigh} murid. Belum ditaksir: {totalNotAssessed} rekod.</Text>
          {subjectsByAttention.slice(0, 8).map((subject) => (
            <Text key={subject.subjectCode} style={styles.note}>
              {subject.subjectCode}: TP1+TP2 {lowCount(subject)} murid, TP5+TP6 {highCount(subject)} murid, belum ditaksir {subject.totalNotAssessed}.
            </Text>
          ))}
        </View>

        <Text fixed style={styles.footer} render={({ pageNumber, totalPages }) => `Muka surat ${pageNumber} / ${totalPages}`} />
      </Page>
    </Document>
  );
}
