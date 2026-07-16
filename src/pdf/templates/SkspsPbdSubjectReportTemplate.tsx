import { Document, Image as PdfImage, Page, StyleSheet, Text, View } from "@react-pdf/renderer";
import type { PbdSubjectAnalysis, PbdSubjectClassRecord, TpBand } from "@/types/pbd";
import { pdfAssetSrc } from "@/pdf/templates/shared";
import type { SchoolPublicProfile } from "@/lib/config/schools";

const bands: TpBand[] = ["TP1", "TP2", "TP3", "TP4", "TP5", "TP6"];
const bandColors: Record<TpBand, string> = {
  TP1: "#f9a8b8",
  TP2: "#f97316",
  TP3: "#fde047",
  TP4: "#16a34a",
  TP5: "#2563eb",
  TP6: "#7c3aed",
};

const plotHeight = 160;
const maxValueLabelBottom = 152;

const styles = StyleSheet.create({
  page: { padding: 28, fontSize: 8.5, color: "#172033" },
  landscapePage: { padding: 24, fontSize: 8, color: "#172033" },
  header: { textAlign: "center", marginBottom: 14 },
  logo: { width: 42, height: 42, alignSelf: "center", marginBottom: 6 },
  title: { fontSize: 15, fontWeight: 700, marginTop: 4 },
  yearTitle: { fontSize: 17, fontWeight: 700, textAlign: "center", textTransform: "uppercase" },
  yearTitleBox: { backgroundColor: "#ffedd5", borderWidth: 1, borderColor: "#d97706", padding: 8, marginBottom: 12 },
  row: { flexDirection: "row", gap: 8 },
  metric: { flexGrow: 1, backgroundColor: "#f8fafc", borderWidth: 1, borderColor: "#e2e8f0", padding: 8 },
  metricLabel: { color: "#64748b", marginBottom: 4 },
  metricValue: { fontSize: 13, fontWeight: 700 },
  section: { marginTop: 13 },
  sectionTitle: { fontSize: 11, fontWeight: 700, marginBottom: 7 },
  summaryRow: { flexDirection: "row", alignItems: "center", marginBottom: 7 },
  summaryLabel: { width: "10%", fontWeight: 700 },
  summaryTrack: { width: "62%", height: 11, backgroundColor: "#e2e8f0" },
  summaryValue: { width: "28%", textAlign: "right" },
  legend: { flexDirection: "row", justifyContent: "center", gap: 14, marginBottom: 8 },
  legendItem: { flexDirection: "row", alignItems: "center", gap: 4 },
  legendSwatch: { width: 8, height: 8 },
  chartFrame: { borderWidth: 1, borderColor: "#d97706", borderRadius: 12, padding: 10 },
  chartBody: { flexDirection: "row", height: 190 },
  yAxis: { width: 26, height: plotHeight, justifyContent: "space-between", alignItems: "flex-end", paddingRight: 5 },
  chartColumn: { flexGrow: 1 },
  plot: { flexGrow: 1, height: plotHeight, borderLeftWidth: 1, borderBottomWidth: 1, borderColor: "#94a3b8", position: "relative" },
  gridLine: { position: "absolute", left: 0, right: 0, borderTopWidth: 0.5, borderTopColor: "#dbe2ea" },
  groups: { position: "absolute", left: 8, right: 8, top: 0, bottom: 0, flexDirection: "row", justifyContent: "space-around" },
  classGroup: { flexGrow: 1, maxWidth: 120, alignItems: "center", justifyContent: "flex-end" },
  bars: { height: plotHeight, flexDirection: "row", alignItems: "flex-end", gap: 2 },
  barWrap: { width: 12, height: plotHeight, position: "relative", alignItems: "center" },
  barValue: { position: "absolute", width: 12, fontSize: 6.5, textAlign: "center" },
  bar: { position: "absolute", bottom: 0, width: 10 },
  xLabels: { flexDirection: "row", justifyContent: "space-around", paddingHorizontal: 8, paddingTop: 5 },
  classLabel: { flexGrow: 1, maxWidth: 120, fontSize: 7.5, fontWeight: 700, textTransform: "uppercase", textAlign: "center" },
  table: { marginTop: 14, borderWidth: 1, borderColor: "#d9dfeb" },
  tableHeader: { flexDirection: "row", backgroundColor: "#f1f5f9", paddingVertical: 6, fontWeight: 700 },
  tableRow: { flexDirection: "row", borderTopWidth: 1, borderTopColor: "#d9dfeb", paddingVertical: 6 },
  classCol: { width: "18%", paddingHorizontal: 5 },
  tpCol: { width: "7%", textAlign: "center" },
  percentCol: { width: "12%", textAlign: "center" },
  notAssessedCol: { width: "16%", textAlign: "center" },
  footer: { position: "absolute", bottom: 12, right: 24, color: "#667085" },
});

function percent(count: number, total: number) {
  return total ? (count / total) * 100 : 0;
}

function lowCount(record: PbdSubjectClassRecord) {
  return record.tpCounts.TP1 + record.tpCounts.TP2;
}

function highCount(record: PbdSubjectClassRecord) {
  return record.tpCounts.TP5 + record.tpCounts.TP6;
}

function totalAssessed(record: PbdSubjectClassRecord) {
  return Object.values(record.tpCounts).reduce((sum, value) => sum + value, 0);
}

function chartMaximum(records: PbdSubjectClassRecord[]) {
  const largest = Math.max(...records.flatMap((record) => bands.map((band) => record.tpCounts[band])), 1);
  return Math.max(5, Math.ceil(largest / 5) * 5);
}

function scaledBarHeight(count: number, maximum: number) {
  return (count / maximum) * plotHeight;
}

function valueLabelBottom(count: number, maximum: number) {
  return Math.min(scaledBarHeight(count, maximum) + 2, maxValueLabelBottom);
}

function classLabel(className: string) {
  return className.replace(/^\d+\s*/, "");
}

function Footer() {
  return <Text fixed style={styles.footer} render={({ pageNumber, totalPages }) => `Muka surat ${pageNumber} / ${totalPages}`} />;
}

function GroupedTpChart({ records }: { records: PbdSubjectClassRecord[] }) {
  const maximum = chartMaximum(records);
  const ticks = Array.from({ length: maximum / 5 + 1 }, (_, index) => maximum - index * 5);
  return (
    <View style={styles.chartFrame}>
      <View style={styles.legend}>
        {bands.map((band) => (
          <View key={band} style={styles.legendItem}>
            <View style={[styles.legendSwatch, { backgroundColor: bandColors[band] }]} />
            <Text>{band}</Text>
          </View>
        ))}
      </View>
      <View style={styles.chartBody}>
        <View style={styles.yAxis}>{ticks.map((tick) => <Text key={tick}>{tick}</Text>)}</View>
        <View style={styles.chartColumn}>
          <View style={styles.plot}>
            {ticks.map((tick) => <View key={tick} style={[styles.gridLine, { bottom: `${(tick / maximum) * 100}%` }]} />)}
            <View style={styles.groups}>
              {records.map((record) => (
                <View key={record.className} style={styles.classGroup}>
                  <View style={styles.bars}>
                    {bands.map((band) => {
                      const count = record.tpCounts[band];
                      const height = scaledBarHeight(count, maximum);
                      return (
                        <View key={band} style={styles.barWrap}>
                          <Text style={[styles.barValue, { bottom: valueLabelBottom(count, maximum) }]}>{count}</Text>
                          <View style={[styles.bar, { height, backgroundColor: bandColors[band] }]} />
                        </View>
                      );
                    })}
                  </View>
                </View>
              ))}
            </View>
          </View>
          <View style={styles.xLabels}>
            {records.map((record) => <Text key={record.className} style={styles.classLabel}>{classLabel(record.className)}</Text>)}
          </View>
        </View>
      </View>
    </View>
  );
}

function YearDetailTable({ records }: { records: PbdSubjectClassRecord[] }) {
  return (
    <View style={styles.table}>
      <View style={styles.tableHeader}>
        <Text style={styles.classCol}>Kelas</Text>
        {bands.map((band) => <Text key={band} style={styles.tpCol}>{band}</Text>)}
        <Text style={styles.percentCol}>TP1+TP2</Text>
        <Text style={styles.percentCol}>TP5+TP6</Text>
        <Text style={styles.notAssessedCol}>Belum ditaksir</Text>
      </View>
      {records.map((record) => {
        const total = totalAssessed(record);
        return (
          <View key={record.className} style={styles.tableRow}>
            <Text style={styles.classCol}>{record.className.toUpperCase()}</Text>
            {bands.map((band) => <Text key={band} style={styles.tpCol}>{record.tpCounts[band]}</Text>)}
            <Text style={styles.percentCol}>{percent(lowCount(record), total).toFixed(1)}%</Text>
            <Text style={styles.percentCol}>{percent(highCount(record), total).toFixed(1)}%</Text>
            <Text style={styles.notAssessedCol}>{record.notAssessedCount}</Text>
          </View>
        );
      })}
    </View>
  );
}

export function SkspsPbdSubjectReportTemplate({ analysis, school }: { analysis: PbdSubjectAnalysis; school: SchoolPublicProfile }) {
  const recordsByYear = [...analysis.records]
    .sort((a, b) => a.year - b.year || a.className.localeCompare(b.className, "ms"))
    .reduce((groups, record) => {
      const records = groups.get(record.year) ?? [];
      records.push(record);
      groups.set(record.year, records);
      return groups;
    }, new Map<number, PbdSubjectClassRecord[]>());
  const totalLow = analysis.aggregateTpCounts.TP1 + analysis.aggregateTpCounts.TP2;
  const totalHigh = analysis.aggregateTpCounts.TP5 + analysis.aggregateTpCounts.TP6;

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <PdfImage src={pdfAssetSrc(school.logoPath)} style={styles.logo} />
          <Text>{school.name.toUpperCase()}</Text>
          <Text style={styles.title}>LAPORAN ANALISIS PBD SUBJEK</Text>
          <Text>{analysis.subjectName} ({analysis.subjectCode})</Text>
        </View>
        <View style={styles.row}>
          <View style={styles.metric}><Text style={styles.metricLabel}>Kelas</Text><Text style={styles.metricValue}>{analysis.records.length}</Text></View>
          <View style={styles.metric}><Text style={styles.metricLabel}>Jumlah Murid</Text><Text style={styles.metricValue}>{analysis.totalPupils}</Text></View>
          <View style={styles.metric}><Text style={styles.metricLabel}>TP1+TP2</Text><Text style={styles.metricValue}>{totalLow}</Text></View>
          <View style={styles.metric}><Text style={styles.metricLabel}>TP5+TP6</Text><Text style={styles.metricValue}>{totalHigh}</Text></View>
          <View style={styles.metric}><Text style={styles.metricLabel}>Belum Ditaksir</Text><Text style={styles.metricValue}>{analysis.totalNotAssessed}</Text></View>
        </View>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Agihan TP Keseluruhan</Text>
          {bands.map((band) => {
            const value = analysis.aggregateTpCounts[band];
            const max = Math.max(...Object.values(analysis.aggregateTpCounts), 1);
            return (
              <View key={band} style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>{band}</Text>
                <View style={styles.summaryTrack}><View style={{ height: 11, width: `${(value / max) * 100}%`, backgroundColor: bandColors[band] }} /></View>
                <Text style={styles.summaryValue}>{value} murid ({percent(value, analysis.totalPupils).toFixed(1)}%)</Text>
              </View>
            );
          })}
        </View>
        <Footer />
      </Page>

      {[...recordsByYear.entries()].map(([year, records]) => (
        <Page key={year} size="A4" orientation="landscape" style={styles.landscapePage}>
          <View style={styles.yearTitleBox}>
            <Text style={styles.yearTitle}>Analisis Perbandingan TP Tahun {year}</Text>
          </View>
          <Text style={{ textAlign: "center", marginBottom: 8 }}>{analysis.subjectName} ({analysis.subjectCode})</Text>
          <GroupedTpChart records={records} />
          <YearDetailTable records={records} />
          <Footer />
        </Page>
      ))}
    </Document>
  );
}
