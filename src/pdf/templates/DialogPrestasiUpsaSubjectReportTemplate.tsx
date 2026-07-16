import { Document, Image as PdfImage, Page, StyleSheet, Text, View } from "@react-pdf/renderer";
import { dialogPrestasiGrades, type DialogPrestasiUpsaLevelComparison, type DialogPrestasiUpsaSubjectReport } from "@/lib/dialogPrestasi/reportData";
import { pdfAssetSrc } from "@/pdf/templates/shared";
import type { SchoolPublicProfile } from "@/lib/config/schools";

const gradeColors: Record<string, string> = {
  A: "#059669",
  B: "#0f766e",
  C: "#0ea5e9",
  D: "#f59e0b",
  E: "#ea580c",
  F: "#be123c",
};

const plotHeight = 160;
const maxValueLabelBottom = 152;

const styles = StyleSheet.create({
  page: { padding: 24, fontSize: 8, color: "#172033" },
  titleBox: { backgroundColor: "#ffedd5", borderWidth: 1, borderColor: "#d97706", padding: 7, marginBottom: 7 },
  titleRow: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8 },
  logo: { width: 26, height: 26 },
  title: { fontSize: 16, fontWeight: 700, textAlign: "center", textTransform: "uppercase" },
  subtitle: { textAlign: "center", marginBottom: 8, color: "#475569" },
  chartFrame: { borderWidth: 1, borderColor: "#d97706", borderRadius: 12, padding: 10 },
  legend: { flexDirection: "row", justifyContent: "center", gap: 14, marginBottom: 8 },
  legendItem: { flexDirection: "row", alignItems: "center", gap: 4 },
  swatch: { width: 8, height: 8 },
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
  empty: { height: 190, alignItems: "center", justifyContent: "center", color: "#64748b" },
  table: { marginTop: 13, borderWidth: 1, borderColor: "#d9dfeb" },
  tableHeader: { flexDirection: "row", backgroundColor: "#f1f5f9", paddingVertical: 6, fontWeight: 700 },
  tableRow: { flexDirection: "row", borderTopWidth: 1, borderTopColor: "#d9dfeb", paddingVertical: 6 },
  classCol: { width: "25%", paddingHorizontal: 5 },
  gradeCol: { width: "8%", textAlign: "center" },
  metaCol: { width: "13.5%", textAlign: "center" },
  footer: { position: "absolute", bottom: 12, right: 24, color: "#667085" },
});

function maximum(level: DialogPrestasiUpsaLevelComparison) {
  const largest = Math.max(...level.classes.flatMap((item) => dialogPrestasiGrades.map((grade) => item.gradeDistribution[grade] ?? 0)), 1);
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

function ComparisonChart({ level }: { level: DialogPrestasiUpsaLevelComparison }) {
  if (!level.classes.length) {
    return <View style={[styles.chartFrame, styles.empty]}><Text>Tiada data kelas untuk Tahun {level.level}.</Text></View>;
  }
  const max = maximum(level);
  const ticks = Array.from({ length: max / 5 + 1 }, (_, index) => max - index * 5);
  return (
    <View style={styles.chartFrame}>
      <View style={styles.legend}>
        {dialogPrestasiGrades.map((grade) => (
          <View key={grade} style={styles.legendItem}><View style={[styles.swatch, { backgroundColor: gradeColors[grade] }]} /><Text>{grade}</Text></View>
        ))}
      </View>
      <View style={styles.chartBody}>
        <View style={styles.yAxis}>{ticks.map((tick) => <Text key={tick}>{tick}</Text>)}</View>
        <View style={styles.chartColumn}>
          <View style={styles.plot}>
            {ticks.map((tick) => <View key={tick} style={[styles.gridLine, { bottom: `${(tick / max) * 100}%` }]} />)}
            <View style={styles.groups}>
              {level.classes.map((item) => (
                <View key={item.className} style={styles.classGroup}>
                  <View style={styles.bars}>
                    {dialogPrestasiGrades.map((grade) => {
                      const count = item.gradeDistribution[grade] ?? 0;
                      const height = scaledBarHeight(count, max);
                      return (
                        <View key={grade} style={styles.barWrap}>
                          <Text style={[styles.barValue, { bottom: valueLabelBottom(count, max) }]}>{count}</Text>
                          <View style={[styles.bar, { height, backgroundColor: gradeColors[grade] }]} />
                        </View>
                      );
                    })}
                  </View>
                </View>
              ))}
            </View>
          </View>
          <View style={styles.xLabels}>
            {level.classes.map((item) => <Text key={item.className} style={styles.classLabel}>{classLabel(item.className)}</Text>)}
          </View>
        </View>
      </View>
    </View>
  );
}

function ComparisonTable({ level }: { level: DialogPrestasiUpsaLevelComparison }) {
  if (!level.classes.length) return null;
  return (
    <View style={styles.table}>
      <View style={styles.tableHeader}>
        <Text style={styles.classCol}>Kelas</Text>
        {dialogPrestasiGrades.map((grade) => <Text key={grade} style={styles.gradeCol}>{grade}</Text>)}
        <Text style={styles.metaCol}>Gred diisi</Text>
        <Text style={styles.metaCol}>TH</Text>
      </View>
      {level.classes.map((item) => (
        <View key={item.className} style={styles.tableRow}>
          <Text style={styles.classCol}>{item.className.toUpperCase()}</Text>
          {dialogPrestasiGrades.map((grade) => <Text key={grade} style={styles.gradeCol}>{item.gradeDistribution[grade] ?? 0}</Text>)}
          <Text style={styles.metaCol}>{item.enteredCount}</Text>
          <Text style={styles.metaCol}>{item.absentCount}</Text>
        </View>
      ))}
    </View>
  );
}

export function DialogPrestasiUpsaSubjectReportTemplate({ report, school }: { report: DialogPrestasiUpsaSubjectReport; school: SchoolPublicProfile }) {
  return (
    <Document>
      {report.levels.map((level) => (
        <Page key={level.level} size="A4" orientation="landscape" style={styles.page}>
          <View style={styles.titleBox}>
            <View style={styles.titleRow}>
              <PdfImage src={pdfAssetSrc(school.logoPath)} style={styles.logo} />
              <Text style={styles.title}>Analisa Perbandingan {report.assessmentLabel} Tahun {level.level}</Text>
            </View>
          </View>
          <Text style={styles.subtitle}>{report.subjectName} ({report.subjectCode}) · {report.assessmentName} · {school.name}</Text>
          <ComparisonChart level={level} />
          <ComparisonTable level={level} />
          <Text fixed style={styles.footer} render={({ pageNumber, totalPages }) => `Muka surat ${pageNumber} / ${totalPages}`} />
        </Page>
      ))}
    </Document>
  );
}
