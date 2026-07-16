import { Document, Image as PdfImage, Page, StyleSheet, Text, View } from "@react-pdf/renderer";
import { pdfAssetSrc } from "@/pdf/templates/shared";
import type { SchoolPublicProfile } from "@/lib/config/schools";
import type { PbdInterventionEntry, PbdInterventionIssue } from "@/types/intervention";

const styles = StyleSheet.create({
  page: { padding: 28, paddingBottom: 38, fontSize: 8, color: "#172033" },
  header: { textAlign: "center", marginBottom: 12 },
  logo: { width: 38, height: 38, alignSelf: "center", marginBottom: 5 },
  school: { fontSize: 9, fontWeight: 700 },
  title: { fontSize: 15, fontWeight: 700, marginTop: 4, textTransform: "uppercase" },
  subtitle: { marginTop: 3, color: "#64748b" },
  metrics: { flexDirection: "row", gap: 8, marginBottom: 12 },
  metric: { flexGrow: 1, borderWidth: 1, borderColor: "#dbe2ea", backgroundColor: "#f8fafc", padding: 7 },
  metricLabel: { color: "#64748b", marginBottom: 3 },
  metricValue: { fontSize: 12, fontWeight: 700 },
  yearTitle: { marginTop: 12, marginBottom: 6, padding: 6, backgroundColor: "#ffedd5", borderLeftWidth: 3, borderLeftColor: "#d97706", fontSize: 11, fontWeight: 700 },
  classTitle: { marginTop: 7, marginBottom: 4, fontSize: 9.5, fontWeight: 700, color: "#0f766e" },
  tableHeader: { flexDirection: "row", backgroundColor: "#f1f5f9", paddingVertical: 5, fontWeight: 700 },
  tableRow: { flexDirection: "row", borderBottomWidth: 1, borderBottomColor: "#e2e8f0", paddingVertical: 5 },
  numberCol: { width: "5%", textAlign: "center" },
  nameCol: { width: "25%", paddingHorizontal: 4 },
  tpCol: { width: "8%", textAlign: "center" },
  issueCol: { width: "29%", paddingHorizontal: 4 },
  interventionCol: { width: "33%", paddingHorizontal: 4 },
  empty: { marginTop: 24, borderWidth: 1, borderColor: "#dbe2ea", backgroundColor: "#f8fafc", padding: 18, textAlign: "center", color: "#64748b" },
  issueSection: { marginTop: 14 },
  issueTitle: { fontSize: 10, fontWeight: 700, marginBottom: 5, color: "#92400e" },
  issueRow: { flexDirection: "row", borderBottomWidth: 1, borderBottomColor: "#fde68a", backgroundColor: "#fffbeb", padding: 5 },
  issueSubject: { width: "15%" },
  issueRowNumber: { width: "10%" },
  issueDetail: { width: "75%" },
  footer: { position: "absolute", bottom: 16, left: 28, right: 28, flexDirection: "row", justifyContent: "space-between", color: "#667085" },
});

function uniquePupilCount(entries: PbdInterventionEntry[]) {
  return new Set(entries.map((entry) => `${entry.normalizedStudentName}|${entry.normalizedClassName}`)).size;
}

export function DialogPrestasiInterventionReportTemplate({
  subjectCode,
  calendarYear,
  reportName,
  entries,
  issues,
  school,
}: {
  subjectCode: string;
  calendarYear: string;
  reportName: string;
  entries: PbdInterventionEntry[];
  issues: PbdInterventionIssue[];
  school: SchoolPublicProfile;
}) {
  const sortedEntries = [...entries].sort(
    (a, b) => a.year - b.year || a.className.localeCompare(b.className, "ms") || a.studentName.localeCompare(b.studentName, "ms"),
  );
  const entriesByYear = Map.groupBy(sortedEntries, (entry) => entry.year);

  return (
    <Document>
      <Page size="A4" style={styles.page} wrap>
        <View style={styles.header}>
          <PdfImage src={pdfAssetSrc(school.logoPath)} style={styles.logo} />
          <Text style={styles.school}>{school.name.toUpperCase()}</Text>
          <Text style={styles.title}>Intervensi dan Isu · {subjectCode}</Text>
          <Text style={styles.subtitle}>{reportName.includes(calendarYear) ? reportName : `${reportName} · ${calendarYear}`}</Text>
        </View>

        <View style={styles.metrics}>
          <View style={styles.metric}><Text style={styles.metricLabel}>Murid</Text><Text style={styles.metricValue}>{uniquePupilCount(entries)}</Text></View>
          <View style={styles.metric}><Text style={styles.metricLabel}>Entri</Text><Text style={styles.metricValue}>{entries.length}</Text></View>
          <View style={styles.metric}><Text style={styles.metricLabel}>TP1</Text><Text style={styles.metricValue}>{entries.filter((entry) => entry.tp === 1).length}</Text></View>
          <View style={styles.metric}><Text style={styles.metricLabel}>TP2</Text><Text style={styles.metricValue}>{entries.filter((entry) => entry.tp === 2).length}</Text></View>
          <View style={styles.metric}><Text style={styles.metricLabel}>Isu data</Text><Text style={styles.metricValue}>{issues.length}</Text></View>
        </View>

        {entriesByYear.size ? [...entriesByYear.entries()].map(([year, yearEntries]) => {
          const byClass = Map.groupBy(yearEntries, (entry) => entry.className);
          return (
            <View key={year}>
              <Text style={styles.yearTitle}>TAHUN {year}</Text>
              {[...byClass.entries()].map(([className, classEntries]) => (
                <View key={className}>
                  <Text style={styles.classTitle}>{className} · {classEntries.length} entri</Text>
                  <View style={styles.tableHeader} wrap={false}>
                    <Text style={styles.numberCol}>Bil.</Text>
                    <Text style={styles.nameCol}>Nama murid</Text>
                    <Text style={styles.tpCol}>TP</Text>
                    <Text style={styles.issueCol}>Isu / masalah</Text>
                    <Text style={styles.interventionCol}>Intervensi</Text>
                  </View>
                  {classEntries.map((entry, index) => (
                    <View key={`${entry.normalizedStudentName}-${entry.className}-${index}`} style={styles.tableRow} wrap={false}>
                      <Text style={styles.numberCol}>{index + 1}</Text>
                      <Text style={styles.nameCol}>{entry.studentName}</Text>
                      <Text style={styles.tpCol}>TP{entry.tp}</Text>
                      <Text style={styles.issueCol}>{entry.problem}</Text>
                      <Text style={styles.interventionCol}>{entry.intervention}</Text>
                    </View>
                  ))}
                </View>
              ))}
            </View>
          );
        }) : <Text style={styles.empty}>Tiada murid TP1 atau TP2 direkodkan untuk subjek ini.</Text>}

        {issues.length ? (
          <View style={styles.issueSection} break>
            <Text style={styles.issueTitle}>ISU DATA YANG MEMERLUKAN SEMAKAN</Text>
            {issues.map((issue) => (
              <View key={`${issue.subjectCode}-${issue.rowNumber}-${issue.reason}`} style={styles.issueRow} wrap={false}>
                <Text style={styles.issueSubject}>{issue.className || subjectCode}</Text>
                <Text style={styles.issueRowNumber}>Baris {issue.rowNumber}</Text>
                <Text style={styles.issueDetail}>{issue.studentName ? `${issue.studentName}: ` : ""}{issue.reason}</Text>
              </View>
            ))}
          </View>
        ) : null}

        <View fixed style={styles.footer}>
          <Text>Dokumen Dialog Prestasi Ketua Panitia</Text>
          <Text render={({ pageNumber, totalPages }) => `Muka surat ${pageNumber} / ${totalPages}`} />
        </View>
      </Page>
    </Document>
  );
}
