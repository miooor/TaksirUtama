import { Document, Image as PdfImage, Page, StyleSheet, Text, View } from "@react-pdf/renderer";
import { buildUpsaReportSubjectRows, gradeOrder, type UpsaReportSubjectRow, type UpsaYearSummaryReport } from "@/lib/pdf/reportData";
import { pdfAssetSrc } from "@/pdf/templates/shared";
import type { SchoolPublicProfile } from "@/lib/config/schools";

const gradeColors: Record<string, string> = {
  A: "#059669",
  B: "#0f766e",
  C: "#0ea5e9",
  D: "#f59e0b",
  E: "#ea580c",
  F: "#be123c",
  TH: "#64748b",
};

const comparisonPlotHeight = 160;
const maxComparisonValueLabelBottom = 152;

const styles = StyleSheet.create({
  page: { padding: 28, fontSize: 8.5, color: "#172033" },
  landscapePage: { padding: 24, fontSize: 8, color: "#172033" },
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
  chartLabel: { width: "15%", fontWeight: 700 },
  chartTrack: { width: "56%", height: 10, backgroundColor: "#e2e8f0", flexDirection: "row" },
  chartValue: { width: "29%", textAlign: "right" },
  splitTrack: { width: "28%", height: 9, backgroundColor: "#e2e8f0" },
  segmentText: { color: "#ffffff", fontSize: 6, textAlign: "center" },
  compactLabels: { flexDirection: "row", flexWrap: "wrap", gap: 5, marginLeft: "15%", marginBottom: 4 },
  compactLabel: { fontSize: 6.5, color: "#475569" },
  subject: { width: "15%" },
  col: { width: "8%" },
  mid: { width: "12%" },
  wide: { width: "18%" },
  note: { marginTop: 5, color: "#64748b" },
  legend: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 6 },
  legendItem: { flexDirection: "row", alignItems: "center", gap: 3 },
  swatch: { width: 8, height: 8 },
  footer: { position: "absolute", bottom: 18, right: 28, color: "#667085" },
  gradeTitleBox: { backgroundColor: "#ffedd5", borderWidth: 1, borderColor: "#d97706", padding: 8, marginBottom: 10 },
  gradeTitle: { fontSize: 16, fontWeight: 700, textAlign: "center", textTransform: "uppercase" },
  comparisonFrame: { borderWidth: 1, borderColor: "#d97706", borderRadius: 12, padding: 10 },
  comparisonLegend: { flexDirection: "row", justifyContent: "center", gap: 14, marginBottom: 8 },
  comparisonBody: { flexDirection: "row", height: 190 },
  yAxis: { width: 26, height: comparisonPlotHeight, justifyContent: "space-between", alignItems: "flex-end", paddingRight: 5 },
  comparisonChartColumn: { flexGrow: 1 },
  plot: { flexGrow: 1, height: comparisonPlotHeight, borderLeftWidth: 1, borderBottomWidth: 1, borderColor: "#94a3b8", position: "relative" },
  gridLine: { position: "absolute", left: 0, right: 0, borderTopWidth: 0.5, borderTopColor: "#dbe2ea" },
  classGroups: { position: "absolute", left: 8, right: 8, top: 0, bottom: 0, flexDirection: "row", justifyContent: "space-around" },
  classGroup: { flexGrow: 1, maxWidth: 120, alignItems: "center", justifyContent: "flex-end" },
  classBars: { height: comparisonPlotHeight, flexDirection: "row", alignItems: "flex-end", gap: 2 },
  gradeBarWrap: { width: 12, height: comparisonPlotHeight, position: "relative", alignItems: "center" },
  gradeBarValue: { position: "absolute", width: 12, fontSize: 6.5, textAlign: "center" },
  gradeBar: { position: "absolute", bottom: 0, width: 10 },
  classNames: { flexDirection: "row", justifyContent: "space-around", paddingHorizontal: 8, paddingTop: 5 },
  className: { flexGrow: 1, maxWidth: 120, fontSize: 7.5, fontWeight: 700, textTransform: "uppercase", textAlign: "center" },
  comparisonTable: { marginTop: 14, borderWidth: 1, borderColor: "#d9dfeb" },
  comparisonClassCol: { width: "20%", paddingHorizontal: 5 },
  comparisonGradeCol: { width: "8%", textAlign: "center" },
  comparisonMetaCol: { width: "10.66%", textAlign: "center" },
});

const comparisonGrades = ["A", "B", "C", "D", "E", "F"] as const;

function gradeCount(subject: UpsaReportSubjectRow, grade: string) {
  return subject.gradeDistribution[grade] ?? 0;
}

function gradeTotal(subject: UpsaReportSubjectRow) {
  return Object.values(subject.gradeDistribution).reduce((sum, value) => sum + value, 0);
}

function GradeStackedBar({ subject }: { subject: UpsaReportSubjectRow }) {
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
              <View key={grade} style={{ width: `${width}%`, height: 10, backgroundColor: gradeColors[grade] }}>
                {count > 0 && width >= 8 ? <Text style={styles.segmentText}>{count}</Text> : null}
              </View>
            );
          })}
        </View>
        <Text style={styles.chartValue}>Lulus {subject.passCount} | Gagal {subject.failCount} | Diisi {subject.enteredCount}</Text>
      </View>
      <View style={styles.compactLabels}>
        {gradeOrder.map((grade) => <Text key={grade} style={styles.compactLabel}>{grade} {gradeCount(subject, grade)}</Text>)}
      </View>
    </View>
  );
}

function AveragePassBar({ subject, maxAverage }: { subject: UpsaReportSubjectRow; maxAverage: number }) {
  const average = subject.average ?? 0;
  return (
    <View style={styles.chartRow}>
      <Text style={styles.chartLabel}>{subject.subjectCode}</Text>
      <View style={styles.splitTrack}><View style={{ height: 9, width: `${(average / maxAverage) * 100}%`, backgroundColor: "#0f766e" }} /></View>
      <View style={styles.splitTrack}><View style={{ height: 9, width: `${subject.passPercentage ?? 0}%`, backgroundColor: "#0ea5e9" }} /></View>
      <Text style={styles.chartValue}>Purata {subject.average?.toFixed(1) ?? "-"} | Lulus {subject.passCount}/{subject.enteredCount} | Gagal {subject.failCount}</Text>
    </View>
  );
}

function SummaryPage({ report, school }: { report: UpsaYearSummaryReport; school: SchoolPublicProfile }) {
  const subjectRows = buildUpsaReportSubjectRows(report.overall.subjectAnalyses);
  const maxAverage = Math.max(...subjectRows.map((subject) => subject.average ?? 0), 1);
  const totalPass = subjectRows.reduce((sum, subject) => sum + subject.passCount, 0);
  const totalFail = subjectRows.reduce((sum, subject) => sum + subject.failCount, 0);

  return (
    <Page size="A4" style={styles.page}>
      <View style={styles.header}>
        <PdfImage src={pdfAssetSrc(school.logoPath)} style={styles.logo} />
        <Text>{school.name.toUpperCase()}</Text>
        <Text style={styles.title}>LAPORAN RINGKASAN {report.period.assessment.toUpperCase()} {report.period.year}</Text>
        <Text>{report.title}</Text>
      </View>

      <View style={styles.row}>
        <View style={styles.metric}><Text style={styles.metricLabel}>Kelas</Text><Text style={styles.metricValue}>{report.overall.classCount}</Text></View>
        <View style={styles.metric}><Text style={styles.metricLabel}>Murid</Text><Text style={styles.metricValue}>{report.overall.pupilCount}</Text></View>
        <View style={styles.metric}><Text style={styles.metricLabel}>Dengan Markah</Text><Text style={styles.metricValue}>{report.overall.pupilsWithMarks}</Text></View>
        <View style={styles.metric}><Text style={styles.metricLabel}>Purata</Text><Text style={styles.metricValue}>{report.overall.yearAverage?.toFixed(1) ?? "-"}</Text></View>
        <View style={styles.metric}><Text style={styles.metricLabel}>Lulus/Gagal</Text><Text style={styles.metricValue}>{totalPass}/{totalFail}</Text></View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Purata dan Kadar Lulus Mengikut Subjek</Text>
        {subjectRows.map((subject) => <AveragePassBar key={subject.subjectCode} subject={subject} maxAverage={maxAverage} />)}
      </View>

      <View style={styles.section} break>
        <Text style={styles.sectionTitle}>Taburan Gred Mengikut Subjek</Text>
        {subjectRows.map((subject) => <GradeStackedBar key={subject.subjectCode} subject={subject} />)}
        <View style={styles.legend}>
          {gradeOrder.map((grade) => (
            <View key={grade} style={styles.legendItem}><View style={[styles.swatch, { backgroundColor: gradeColors[grade] }]} /><Text>{grade}</Text></View>
          ))}
        </View>
      </View>

      <Text fixed style={styles.footer} render={({ pageNumber, totalPages }) => `Muka surat ${pageNumber} / ${totalPages}`} />
    </Page>
  );
}

function LevelPage({ level }: { level: UpsaYearSummaryReport["levels"][number] }) {
  const subjectRows = buildUpsaReportSubjectRows(level.analysis.subjectAnalyses);

  return (
    <Page size="A4" style={styles.page}>
      <View style={styles.header}>
        <Text style={styles.title}>PERINCIAN TAHUN {level.level}</Text>
        <Text>Kelas {level.analysis.classCount} | Murid {level.analysis.pupilCount} | Purata {level.analysis.yearAverage?.toFixed(1) ?? "-"}</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Jadual Subjek Tahun {level.level}</Text>
        <View style={styles.tableHeader}>
          <Text style={styles.subject}>Subjek</Text>
          <Text style={styles.mid}>Diisi</Text>
          <Text style={styles.mid}>Hilang</Text>
          <Text style={styles.mid}>TH</Text>
          <Text style={styles.mid}>Purata</Text>
          <Text style={styles.mid}>Lulus</Text>
          <Text style={styles.mid}>Gagal</Text>
          <Text style={styles.mid}>Kadar</Text>
        </View>
        {subjectRows.map((subject) => (
          <View key={subject.subjectCode} style={styles.tableRow}>
            <Text style={styles.subject}>{subject.subjectCode}</Text>
            <Text style={styles.mid}>{subject.enteredCount}</Text>
            <Text style={styles.mid}>{subject.missingCount}</Text>
            <Text style={styles.mid}>{subject.absentCount}</Text>
            <Text style={styles.mid}>{subject.average?.toFixed(1) ?? "-"}</Text>
            <Text style={styles.mid}>{subject.passCount}</Text>
            <Text style={styles.mid}>{subject.failCount}</Text>
            <Text style={styles.mid}>{subject.passPercentage?.toFixed(1) ?? "-"}%</Text>
          </View>
        ))}
      </View>

      <View style={styles.section} break>
        <Text style={styles.sectionTitle}>Perbandingan Kelas</Text>
        <View style={styles.tableHeader}>
          <Text style={styles.wide}>Kelas</Text>
          <Text style={styles.mid}>Murid</Text>
          <Text style={styles.mid}>Purata</Text>
          <Text style={styles.mid}>Intervensi</Text>
        </View>
        {level.analysis.classSummaries.map((summary) => (
          <View key={summary.className} style={styles.tableRow}>
            <Text style={styles.wide}>{summary.className}</Text>
            <Text style={styles.mid}>{summary.pupilCount}</Text>
            <Text style={styles.mid}>{summary.classAverage?.toFixed(1) ?? "-"}</Text>
            <Text style={styles.mid}>{summary.interventionCount}</Text>
          </View>
        ))}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Dapatan Ringkas</Text>
        <Text style={styles.note}>Murid perlu intervensi: {level.analysis.interventionPupils.length}. Murid cemerlang: {level.analysis.highAchievers.length}. Isu markah kosong: {level.analysis.missingMarks.length}. TH: {level.analysis.absentPupils.length}.</Text>
      </View>

      <Text fixed style={styles.footer} render={({ pageNumber, totalPages }) => `Muka surat ${pageNumber} / ${totalPages}`} />
    </Page>
  );
}

function comparisonMaximum(classes: UpsaYearSummaryReport["levels"][number]["analysis"]["classGradeComparisons"]) {
  const largest = Math.max(...classes.flatMap((item) => comparisonGrades.map((grade) => item.gradeDistribution[grade] ?? 0)), 1);
  return Math.max(5, Math.ceil(largest / 5) * 5);
}

function scaledComparisonBarHeight(count: number, maximum: number) {
  return (count / maximum) * comparisonPlotHeight;
}

function comparisonValueLabelBottom(count: number, maximum: number) {
  return Math.min(scaledComparisonBarHeight(count, maximum) + 2, maxComparisonValueLabelBottom);
}

function comparisonClassLabel(className: string) {
  return className.replace(/^\d+\s*/, "");
}

function GradeComparisonPage({ report, level }: { report: UpsaYearSummaryReport; level: UpsaYearSummaryReport["levels"][number] }) {
  const classes = level.analysis.classGradeComparisons;
  const maximum = comparisonMaximum(classes);
  const ticks = Array.from({ length: maximum / 5 + 1 }, (_, index) => maximum - index * 5);

  return (
    <Page size="A4" orientation="landscape" style={styles.landscapePage}>
      <View style={styles.gradeTitleBox}>
        <Text style={styles.gradeTitle}>Analisis Perbandingan Gred {report.period.assessment.toUpperCase()} · Tahun {level.level}</Text>
      </View>
      <Text style={{ textAlign: "center", marginBottom: 8 }}>{report.period.examName}</Text>

      <View style={styles.comparisonFrame}>
        <View style={styles.comparisonLegend}>
          {comparisonGrades.map((grade) => (
            <View key={grade} style={styles.legendItem}>
              <View style={[styles.swatch, { backgroundColor: gradeColors[grade] }]} />
              <Text>{grade}</Text>
            </View>
          ))}
        </View>
        <View style={styles.comparisonBody}>
          <View style={styles.yAxis}>{ticks.map((tick) => <Text key={tick}>{tick}</Text>)}</View>
          <View style={styles.comparisonChartColumn}>
            <View style={styles.plot}>
              {ticks.map((tick) => <View key={tick} style={[styles.gridLine, { bottom: `${(tick / maximum) * 100}%` }]} />)}
              <View style={styles.classGroups}>
                {classes.map((item) => (
                  <View key={item.className} style={styles.classGroup}>
                    <View style={styles.classBars}>
                      {comparisonGrades.map((grade) => {
                        const count = item.gradeDistribution[grade] ?? 0;
                        const height = scaledComparisonBarHeight(count, maximum);
                        return (
                          <View key={grade} style={styles.gradeBarWrap}>
                            <Text style={[styles.gradeBarValue, { bottom: comparisonValueLabelBottom(count, maximum) }]}>{count}</Text>
                            <View style={[styles.gradeBar, { height, backgroundColor: gradeColors[grade] }]} />
                          </View>
                        );
                      })}
                    </View>
                  </View>
                ))}
              </View>
            </View>
            <View style={styles.classNames}>
              {classes.map((item) => <Text key={item.className} style={styles.className}>{comparisonClassLabel(item.className)}</Text>)}
            </View>
          </View>
        </View>
      </View>

      <View style={styles.comparisonTable}>
        <View style={styles.tableHeader}>
          <Text style={styles.comparisonClassCol}>Kelas</Text>
          {comparisonGrades.map((grade) => <Text key={grade} style={styles.comparisonGradeCol}>{grade}</Text>)}
          <Text style={styles.comparisonMetaCol}>Gred diisi</Text>
          <Text style={styles.comparisonMetaCol}>TH</Text>
          <Text style={styles.comparisonMetaCol}>Murid</Text>
        </View>
        {classes.map((item) => (
          <View key={item.className} style={styles.tableRow}>
            <Text style={styles.comparisonClassCol}>{item.className.toUpperCase()}</Text>
            {comparisonGrades.map((grade) => <Text key={grade} style={styles.comparisonGradeCol}>{item.gradeDistribution[grade] ?? 0}</Text>)}
            <Text style={styles.comparisonMetaCol}>{item.enteredCount}</Text>
            <Text style={styles.comparisonMetaCol}>{item.absentCount}</Text>
            <Text style={styles.comparisonMetaCol}>{item.pupilCount}</Text>
          </View>
        ))}
      </View>

      <Text fixed style={styles.footer} render={({ pageNumber, totalPages }) => `Muka surat ${pageNumber} / ${totalPages}`} />
    </Page>
  );
}

export function SkspsUpsaYearSummaryReportTemplate({ report, school }: { report: UpsaYearSummaryReport; school: SchoolPublicProfile }) {
  return (
    <Document>
      <SummaryPage report={report} school={school} />
      {report.levels.flatMap((level) => [
        <LevelPage key={`${level.level}-detail`} level={level} />,
        <GradeComparisonPage key={`${level.level}-comparison`} report={report} level={level} />,
      ])}
    </Document>
  );
}
