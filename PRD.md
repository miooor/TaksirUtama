# PRD: UPSA Slip Generator & PBD Analysis App

## 1. Product Name

**Assessment Slip & Analysis Generator**

Working title: **Slip & Analisis SKSP**

## 2. Product Summary

A Vercel-hosted Next.js web app for two school assessment workflows:

1. **UPSA Module**
   - Reads student marks from the `MARKAH UPSA 2026` Google Sheet.
   - Generates individual student exam slips.
   - Generates class-level UPSA analysis for teachers.

2. **PBD Module**
   - Reads PBD summary data from the `RUMUSAN PBD PERTENGAHAN TAHUN 2026` Google Sheet.
   - Generates class, subject, year, and panitia-level PBD analysis.
   - Generates internal PBD analysis PDFs.
   - Does **not** generate individual PBD student slips in the MVP.

The app should work as a school-specific reporting system:

```text
Google Sheet data
→ Parse assessment data
→ Analyse class/subject/year performance
→ Generate PDF reports
→ Download / print
```

## 3. Key Decision

For this build cycle:

```text
UPSA = individual slips + class analysis
PBD = class/subject/year analysis only
```

Individual PBD student slips are explicitly deferred to a later phase because the current PBD Google Sheet is organised as subject-level/class-level summary data, not student-by-student TP records.

## 4. Problem Statement

The school currently uses Google Sheets to record UPSA and PBD data.

UPSA data is stored by class and can be used to generate individual student result slips. PBD data is stored by subject and class summary, making it suitable for analysis reports rather than individual student slips.

Teachers and administrators need a simple tool to:

- print UPSA slips for parents during Open Day;
- analyse UPSA results for intervention planning;
- analyse PBD achievement by class, subject, year, and panitia;
- export reports for internal school documentation.

## 5. Goals

### 5.1 UPSA Goals

1. Generate printable UPSA exam slips for each student by class.
2. Use one official school template.
3. Read data directly from the UPSA Google Sheet.
4. Avoid showing blank marks as failed grades.
5. Generate UPSA class analysis for teachers.
6. Generate UPSA class analysis PDF.

### 5.2 PBD Goals

1. Read PBD summary data from the PBD Google Sheet.
2. Analyse TP distribution by subject and class.
3. Analyse TP distribution by year.
4. Analyse subject/panitia performance.
5. Identify classes or subjects with low TP achievement.
6. Generate PBD analysis PDFs for teachers/admin/panitia.
7. Detect missing or incomplete PBD entries.

## 6. Non-Goals for MVP

The MVP will not include:

1. Individual PBD student slips.
2. Student-level PBD TP tracking.
3. Full drag-and-drop template builder.
4. Editing assessment data inside the app.
5. Replacing Google Sheets as source of truth.
6. Student/parent login.
7. Automatic WhatsApp/email sending to parents.
8. Item-level question analysis for UPSA.
9. Complex role management.

## 7. Target Users

### 7.1 Class Teacher

Needs to:

- Select own class.
- Preview and download UPSA student slips.
- View UPSA class analysis.
- View PBD class-level achievement summary.
- Identify classes/subjects requiring intervention based on assessment data.

### 7.2 Subject Teacher / Panitia

Needs to:

- View PBD TP distribution by subject.
- Compare classes within the same subject.
- Identify classes with high numbers of TP1/TP2.
- Export subject/panitia analysis.

### 7.3 Admin / School Leadership

Needs to:

- Review UPSA and PBD performance by class/year.
- Generate school-level reports.
- Check missing/incomplete assessment data.
- Standardise reporting format.

## 8. Data Sources

## 8.1 UPSA Google Sheet

Spreadsheet:

```text
MARKAH UPSA 2026
```

Spreadsheet ID:

```text
1dDMmivXqhgiLoe1hMgXsIC54Q8_VwnpjeUN-hhbZPcU
```

Current structure:

```text
Each class = one sheet tab
```

Examples:

```text
4 ANGSANA
4 ALAMANDA
4 AKASIA
4 ANGGERIK
4 AZALEA
5 ANGSANA
5 ALAMANDA
5 AKASIA
5 ANGGERIK
5 AZALEA
6 ANGSANA
6 ALAMANDA
6 AKASIA
6 ANGGERIK
6 AZALEA
```

### UPSA Sheet Layout Assumption

For each class tab:

```text
B8  = Class name
B9  = Class teacher name
Row 11 = subject headers
Row 12 = maximum marks
Row 13 onward = student data
Column A = Bil
Column B = Student name
Column C onward = alternating subject mark and grade columns
```

Example:

```text
A: BIL
B: NAMA
C: BM
D: GRED
E: BI
F: GRED
G: MATE
H: GRED
```

## 8.2 PBD Google Sheet

Spreadsheet:

```text
RUMUSAN PBD PERTENGAHAN TAHUN 2026
```

Spreadsheet ID:

```text
1MpVRXRTtP-mBy3Y-skZEjO6wZAns3WEstqosHHdQcUA
```

URL:

```text
https://docs.google.com/spreadsheets/d/1MpVRXRTtP-mBy3Y-skZEjO6wZAns3WEstqosHHdQcUA/edit?usp=sharing
```

Current structure:

```text
Each subject = one sheet tab
```

Observed subject tabs:

```text
BM
BI
MATE
SAINS
SEJARAH
P.ISLAM
P.MORAL
PJK
PSV
MUZIK
RBT
B.ARAB
B.CHINA
B.TAMIL
```

### PBD Sheet Layout Assumption

For each subject tab:

```text
Rows near top contain school/panitia metadata.
Row 9 appears to contain PBD summary headers.
Column B = KELAS
Columns C-N = TP count and percentage pairs
Column O = JUMLAH MURID
Column P = BILANGAN MURID TIDAK DITAKSIR
```

Observed header pattern:

```text
KELAS
TP 1
PERATUS TP 1
TP 2
PERATUS TP 2
TP 3
PERATUS TP 3
TP 4
PERATUS TP 4
TP 5
PERATUS TP 5
TP 6
PERATUS TP 6
JUMLAH MURID
BILANGAN MURID TIDAK DITAKSIR
```

## 9. Parsing Rules

## 9.1 UPSA Parsing Rules

1. Each row from row 13 onward represents one student.
2. Empty student name means ignore row.
3. Subject columns start from column C.
4. Subject columns are read in pairs:
   - mark column
   - grade column
5. If mark is blank, exclude the subject from the student slip.
6. Blank marks must not be treated as `0` or `F`.
7. Grade is shown only when a valid mark exists.
8. Missing marks are detected separately in the analysis module.

## 9.2 PBD Parsing Rules

1. Each subject tab represents one subject/panitia.
2. Each valid class row represents PBD achievement summary for that class in that subject.
3. Ignore empty subtotal rows.
4. Parse class name from column B.
5. Parse TP counts:
   - TP1
   - TP2
   - TP3
   - TP4
   - TP5
   - TP6
6. Parse TP percentages if available.
7. Parse total pupils.
8. Parse number of pupils not assessed.
9. If percentage cells are blank or unreliable, recalculate percentages from counts and total pupils.
10. Treat blank TP count as 0 only for class-level summary tables, but separately flag incomplete data if all TP counts are blank while total pupils is present.
11. Extract year level from class name, for example:
   - `4 ANGSANA` → Year 4
   - `5 ANGGERIK` → Year 5
12. The PBD parser must not expect student names.
13. The PBD module must not generate individual student slips in the MVP.

## 10. Core Features

## 10.1 Shared Assessment Dashboard

Landing dashboard where users choose assessment module:

```text
UPSA
PBD
```

Requirements:

- Show two clear modules.
- Display data source status for each module.
- Provide quick actions:
  - UPSA: generate slips, view analysis
  - PBD: view subject analysis, class analysis, year analysis, generate reports

Acceptance criteria:

- User can choose UPSA or PBD.
- User is not confused between mark-based UPSA and TP-based PBD.

## 10.2 UPSA: Class Selection

Teacher selects a UPSA class from valid UPSA sheet tabs.

Requirements:

- Display valid Year 4, 5, and 6 class tabs.
- Show class teacher name if available.
- Allow user to open class page.

Acceptance criteria:

- User can see all UPSA class tabs.
- User can open class details.
- Invalid/system tabs are hidden.

## 10.3 UPSA: Student Slip Preview

Teacher previews UPSA student slips before PDF generation.

Requirements:

- Show list of students in selected class.
- Show parsed subjects, marks, and grades.
- Highlight missing marks.
- Allow user to preview one student slip.

Acceptance criteria:

- Blank marks do not appear as F.
- Student names match Google Sheet.
- Subject names match Google Sheet headers.

## 10.4 UPSA: Generate Class PDF

Generate one UPSA PDF file for selected class, with one student slip per page.

Requirements:

- Use React PDF.
- Use fixed official school template.
- One A4 page per student.
- Include:
  - school name
  - exam name
  - student name
  - class
  - class teacher
  - subject result table
  - average
  - optional total
  - grade summary
  - teacher signature area
  - parent/guardian signature area
  - optional remarks section

Filename format:

```text
{CLASS_NAME} - SLIP UPSA 2026.pdf
```

Acceptance criteria:

- PDF opens successfully.
- Each student appears on a separate page.
- No student with a valid name is skipped.
- Subjects with blank marks are not printed.

## 10.5 UPSA: Generate Individual Student PDF

Generate one UPSA PDF for a selected student.

Filename format:

```text
{CLASS_NAME} - {STUDENT_NAME} - SLIP UPSA 2026.pdf
```

Acceptance criteria:

- Single-student PDF contains only selected student.
- PDF uses same template as class PDF.

## 10.6 UPSA: Class Analysis Dashboard

Metrics for selected class:

- number of pupils
- number of pupils with marks entered
- number of pupils with missing marks
- class average
- highest average
- lowest average
- subject average
- subject highest mark
- subject lowest mark
- grade distribution by subject
- overall grade distribution
- pass percentage by subject
- fail percentage by subject
- pupils requiring intervention
- high achievers
- missing marks list

Acceptance criteria:

- Dashboard loads after class selection.
- Calculations ignore blank marks.
- Missing marks are shown as data issues, not failures.

## 10.7 UPSA: Teacher Analysis PDF

Report sections:

1. Class Overview
2. Subject Performance Summary
3. Grade Distribution
4. Pass/Fail Summary
5. Pupils Requiring Intervention
6. High Achievers
7. Missing Marks / Data Issues
8. Suggested Follow-Up Actions

Acceptance criteria:

- Teacher can download one PDF analysis report per class.
- Analysis PDF is separate from parent exam slips.

## 10.8 PBD: Subject Analysis Dashboard

Subject/panitia teachers view TP achievement for one subject across all classes.

Requirements:

- Select subject tab, for example BM, BI, MATE, SAINS.
- Display every class row for that subject.
- Show:
  - total pupils
  - TP1 count and percentage
  - TP2 count and percentage
  - TP3 count and percentage
  - TP4 count and percentage
  - TP5 count and percentage
  - TP6 count and percentage
  - not assessed count
  - percentage of TP1 + TP2
  - percentage of TP5 + TP6
- Highlight classes with high TP1/TP2.
- Highlight classes with many not assessed pupils.

Acceptance criteria:

- User can select a subject.
- App shows class-by-class TP distribution.
- App identifies weak classes for that subject.
- App does not attempt to show individual pupils.

## 10.9 PBD: Class Analysis Dashboard

Class teachers view one class across all PBD subjects.

Requirements:

- Select class, for example `5 ANGGERIK`.
- Combine data from all subject tabs for that class.
- Show subject-by-subject TP distribution for selected class.
- Show:
  - subject name
  - total pupils
  - TP1-TP6 counts
  - TP1-TP6 percentages
  - not assessed count
  - dominant TP band
  - low achievement percentage, TP1 + TP2
  - high achievement percentage, TP5 + TP6
- Flag subjects where TP1+TP2 is high.
- Flag subjects where not assessed count is high.

Acceptance criteria:

- User can view all PBD subjects for one class.
- App combines data across subject tabs correctly.
- App shows analysis suitable for class teacher review.
- No individual PBD student slips are generated.

## 10.10 PBD: Year-Level Analysis

Admin views PBD achievement by year.

Requirements:

- Select Year 1, 2, 3, 4, 5, or 6.
- Combine all classes within selected year.
- Show TP distribution by subject for that year.
- Show subject comparison:
  - strongest subject by TP5+TP6
  - weakest subject by TP1+TP2
  - subjects with high not-assessed count
- Show class comparison within the year.

Acceptance criteria:

- Year dashboard combines all relevant classes.
- Class and subject comparisons are accurate.
- App can export year-level report as PDF.

## 10.11 PBD: Panitia / Subject PDF Report

Generate PDF report for one subject/panitia.

Report sections:

1. Subject / Panitia Overview
2. TP Distribution by Class
3. Low Achievement Classes
4. High Achievement Classes
5. Not Assessed Summary
6. Suggested Follow-Up Actions

Acceptance criteria:

- User can download one PDF per subject.
- Report is suitable for panitia documentation.

## 10.12 PBD: Class PDF Report

Generate PDF report for one class across all PBD subjects.

Report sections:

1. Class Overview
2. Subject-by-Subject TP Summary
3. Subjects Requiring Intervention
4. Not Assessed Summary
5. Suggested Follow-Up Actions

Acceptance criteria:

- User can download one PDF per class.
- Report is internal-use only.
- No student-level PBD data is shown.

## 10.13 PBD: Year-Level PDF Report

Generate PDF report for selected year.

Report sections:

1. Year Overview
2. TP Distribution by Subject
3. Class Comparison
4. Weak Subject Areas
5. Strong Subject Areas
6. Not Assessed Summary
7. Suggested Follow-Up Actions

Acceptance criteria:

- User can download one PDF per year.
- Report supports admin/panitia meetings.

## 11. Template Requirements

## 11.1 UPSA Slip Template

Template file:

```text
src/pdf/templates/SkspsUpsaSlipTemplate.tsx
```

Fixed in code for MVP.

A4 portrait.

Layout:

```text
[School Logo]
SK SRI PETALING
PENTAKSIRAN SUMATIF PENGGAL 1 (UPSA) 2026
SLIP KEPUTUSAN MURID

Nama Murid:
Kelas:
Guru Kelas:

Table:
Bil | Mata Pelajaran | Markah | Gred

Summary:
Purata:
Jumlah:
Bilangan Subjek:

Ulasan Guru:

Signature:
Tandatangan Guru Kelas
Tandatangan Ibu Bapa/Penjaga
```

## 11.2 PBD Analysis Report Templates

Template files:

```text
src/pdf/templates/SkspsPbdSubjectReportTemplate.tsx
src/pdf/templates/SkspsPbdClassReportTemplate.tsx
src/pdf/templates/SkspsPbdYearReportTemplate.tsx
```

A4 portrait or landscape depending on table width.

Must include:

```text
SK SRI PETALING
RUMUSAN PBD PERTENGAHAN TAHUN 2026
Report Type: Subject / Class / Year
Generated date
Source sheet name
```

## 12. Calculation Rules

## 12.1 UPSA Average

For each student:

```text
average = sum(valid subject marks as percentage) / number of valid subjects
```

If all maximum marks are 100:

```text
sum(marks) / number of valid subjects
```

## 12.2 UPSA Grade Scale

Default grade scale:

```text
82–100 = A
66–81  = B
50–65  = C
35–49  = D
20–34  = E
0–19   = F
```

## 12.3 UPSA Pass/Fail

Default pass threshold:

```text
35 and above = pass
Below 35 = fail
```

## 12.4 UPSA Intervention Rules

Flag pupil if:

- average below 40
- any core subject is F
- 3 or more failed subjects
- missing marks in key subjects
- no marks entered

Core subjects default:

```text
BM
BI
MATE
SAINS
```

## 12.5 PBD TP Distribution

For each class/subject:

```text
TP total = TP1 + TP2 + TP3 + TP4 + TP5 + TP6
```

If total pupils exists:

```text
TP percentage = TP count / total pupils * 100
```

If total pupils is blank but TP counts exist:

```text
total pupils = TP total + not assessed count
```

## 12.6 PBD Low Achievement

Default low achievement group:

```text
TP1 + TP2
```

Calculate:

```text
lowAchievementCount = TP1 + TP2
lowAchievementPercentage = lowAchievementCount / total pupils * 100
```

## 12.7 PBD Satisfactory Achievement

Default satisfactory group:

```text
TP3 + TP4
```

## 12.8 PBD High Achievement

Default high achievement group:

```text
TP5 + TP6
```

Calculate:

```text
highAchievementCount = TP5 + TP6
highAchievementPercentage = highAchievementCount / total pupils * 100
```

## 12.9 PBD Intervention Flag

Flag class/subject if:

- TP1 + TP2 percentage is 20% or higher
- not assessed count is greater than 0
- all TP counts are blank while total pupils exists
- total TP count does not match total pupils minus not assessed count

Threshold should be configurable later.

## 13. Technical Architecture

## 13.1 Recommended Stack

```text
Framework: Next.js App Router
Deployment: Vercel
Language: TypeScript
Styling: Tailwind CSS
PDF: @react-pdf/renderer
Data source: Google Sheets API
Validation: Zod
Charts: Recharts
Auth MVP: simple password gate
```

## 13.2 Environment Variables

```env
UPSA_SPREADSHEET_ID=1dDMmivXqhgiLoe1hMgXsIC54Q8_VwnpjeUN-hhbZPcU
PBD_SPREADSHEET_ID=1MpVRXRTtP-mBy3Y-skZEjO6wZAns3WEstqosHHdQcUA
GOOGLE_SERVICE_ACCOUNT_EMAIL=
GOOGLE_PRIVATE_KEY=
APP_ADMIN_PASSWORD=
NEXT_PUBLIC_SCHOOL_NAME=SK SRI PETALING
NEXT_PUBLIC_UPSA_EXAM_NAME=PENTAKSIRAN SUMATIF PENGGAL 1 (UPSA) 2026
NEXT_PUBLIC_PBD_REPORT_NAME=RUMUSAN PBD PERTENGAHAN TAHUN 2026
```

## 13.3 API Routes

### Shared

```text
GET /api/assessments
```

### UPSA

```text
GET /api/upsa/classes
GET /api/upsa/classes/[className]
GET /api/upsa/classes/[className]/analysis
GET /api/upsa/slips/[className]/pdf
GET /api/upsa/slips/[className]/students/[studentId]/pdf
GET /api/upsa/reports/[className]/analysis-pdf
```

### PBD

```text
GET /api/pbd/subjects
GET /api/pbd/subjects/[subjectCode]
GET /api/pbd/subjects/[subjectCode]/analysis
GET /api/pbd/classes
GET /api/pbd/classes/[className]/analysis
GET /api/pbd/years/[year]/analysis
GET /api/pbd/reports/subjects/[subjectCode]/pdf
GET /api/pbd/reports/classes/[className]/pdf
GET /api/pbd/reports/years/[year]/pdf
```

## 13.4 App Routes

```text
/
 /dashboard

 /upsa
 /upsa/classes
 /upsa/classes/[className]
 /upsa/classes/[className]/slips
 /upsa/classes/[className]/analysis

 /pbd
 /pbd/subjects
 /pbd/subjects/[subjectCode]
 /pbd/classes
 /pbd/classes/[className]
 /pbd/years/[year]

 /settings
```

## 13.5 Suggested File Structure

```text
src/
  app/
    dashboard/
      page.tsx

    upsa/
      page.tsx
      classes/
        page.tsx
        [className]/
          page.tsx
          slips/
            page.tsx
          analysis/
            page.tsx

    pbd/
      page.tsx
      subjects/
        page.tsx
        [subjectCode]/
          page.tsx
      classes/
        page.tsx
        [className]/
          page.tsx
      years/
        [year]/
          page.tsx

    api/
      upsa/
        classes/
          route.ts
          [className]/
            route.ts
            analysis/
              route.ts
        slips/
          [className]/
            pdf/
              route.ts
            students/
              [studentId]/
                pdf/
                  route.ts
        reports/
          [className]/
            analysis-pdf/
              route.ts

      pbd/
        subjects/
          route.ts
          [subjectCode]/
            route.ts
            analysis/
              route.ts
        classes/
          route.ts
          [className]/
            analysis/
              route.ts
        years/
          [year]/
            analysis/
              route.ts
        reports/
          subjects/
            [subjectCode]/
              pdf/
                route.ts
          classes/
            [className]/
              pdf/
                route.ts
          years/
            [year]/
              pdf/
                route.ts

  components/
    shared/
      AssessmentSelector.tsx
      DataIssueAlert.tsx
      DownloadButton.tsx

    upsa/
      UpsaClassSelector.tsx
      UpsaStudentTable.tsx
      UpsaSlipPreview.tsx
      UpsaAnalysisCards.tsx
      UpsaSubjectAnalysisTable.tsx
      UpsaInterventionList.tsx

    pbd/
      PbdSubjectSelector.tsx
      PbdClassSelector.tsx
      PbdYearSelector.tsx
      PbdTpDistributionTable.tsx
      PbdTpDistributionChart.tsx
      PbdSubjectAnalysisTable.tsx
      PbdClassAnalysisTable.tsx
      PbdDataIssuesTable.tsx

  lib/
    googleSheets/
      client.ts
      fetchSheetValues.ts
      getSpreadsheetMetadata.ts

    upsa/
      listUpsaClassTabs.ts
      parseUpsaClassSheet.ts
      calculateUpsaGrades.ts
      calculateUpsaStudentAverage.ts
      calculateUpsaClassAnalysis.ts
      detectUpsaMissingMarks.ts
      detectUpsaIntervention.ts

    pbd/
      listPbdSubjectTabs.ts
      parsePbdSubjectSheet.ts
      combinePbdByClass.ts
      combinePbdByYear.ts
      calculatePbdSubjectAnalysis.ts
      calculatePbdClassAnalysis.ts
      calculatePbdYearAnalysis.ts
      detectPbdDataIssues.ts

    config/
      gradeScale.ts
      subjects.ts
      templateSettings.ts
      pbdThresholds.ts

  pdf/
    templates/
      SkspsUpsaSlipTemplate.tsx
      SkspsUpsaAnalysisReportTemplate.tsx
      SkspsPbdSubjectReportTemplate.tsx
      SkspsPbdClassReportTemplate.tsx
      SkspsPbdYearReportTemplate.tsx

  types/
    upsa.ts
    pbd.ts
    analysis.ts
```

## 14. Data Types

## 14.1 UPSA Types

```ts
export type UpsaSubjectResult = {
  subjectCode: string;
  subjectName: string;
  mark: number | null;
  maxMark: number;
  grade: string | null;
};

export type UpsaStudentResult = {
  id: string;
  bil: string;
  name: string;
  className: string;
  teacherName: string;
  subjects: UpsaSubjectResult[];
  average: number | null;
  totalMarks: number | null;
  validSubjectCount: number;
  missingSubjects: string[];
};

export type UpsaClassResult = {
  className: string;
  teacherName: string;
  students: UpsaStudentResult[];
};
```

## 14.2 PBD Types

```ts
export type TpBand = 'TP1' | 'TP2' | 'TP3' | 'TP4' | 'TP5' | 'TP6';

export type PbdSubjectClassRecord = {
  subjectCode: string;
  subjectName: string;
  panitiaName?: string;
  panitiaHeadName?: string;
  className: string;
  year: number;
  tpCounts: Record<TpBand, number>;
  tpPercentages: Record<TpBand, number>;
  totalPupils: number;
  notAssessedCount: number;
  lowAchievementCount: number;
  lowAchievementPercentage: number;
  highAchievementCount: number;
  highAchievementPercentage: number;
  dominantTpBand: TpBand | null;
  dataIssues: string[];
};

export type PbdSubjectAnalysis = {
  subjectCode: string;
  subjectName: string;
  records: PbdSubjectClassRecord[];
  totalPupils: number;
  totalNotAssessed: number;
  aggregateTpCounts: Record<TpBand, number>;
  aggregateTpPercentages: Record<TpBand, number>;
  lowAchievementClasses: PbdSubjectClassRecord[];
  highAchievementClasses: PbdSubjectClassRecord[];
  dataIssues: string[];
};

export type PbdClassAnalysis = {
  className: string;
  year: number;
  subjectRecords: PbdSubjectClassRecord[];
  totalSubjects: number;
  subjectsWithLowAchievement: PbdSubjectClassRecord[];
  subjectsWithNotAssessed: PbdSubjectClassRecord[];
  dataIssues: string[];
};

export type PbdYearAnalysis = {
  year: number;
  classNames: string[];
  subjectAnalyses: PbdSubjectAnalysis[];
  weakestSubjects: PbdSubjectAnalysis[];
  strongestSubjects: PbdSubjectAnalysis[];
  dataIssues: string[];
};
```

## 15. Security / Privacy

Assessment data is sensitive school data.

MVP requirements:

1. Do not expose Google Sheet credentials to client.
2. All Google Sheets access must happen server-side.
3. API routes must not reveal service account private key.
4. Add simple admin password protection for MVP.
5. Disable public indexing.
6. Do not log full student result data in production logs.
7. Use environment variables for credentials.
8. Later phase: add Google login and role-based access.

## 16. Performance

MVP should generate reports per class, subject, or year.

Avoid generating every UPSA slip and every PBD report in a single request.

Target:

```text
UPSA class PDF generation: under 30 seconds per class
UPSA class analysis page load: under 5 seconds
PBD subject analysis page load: under 5 seconds
PBD class analysis page load: under 5 seconds
PBD report PDF generation: under 30 seconds per report
```

## 17. Error Handling

Show friendly errors for:

1. Google Sheet cannot be accessed.
2. Subject/class tab not found.
3. Sheet structure changed.
4. No student data found for UPSA.
5. No PBD summary data found.
6. PDF generation failed.
7. Missing environment variables.
8. Invalid class name.
9. Invalid subject code.
10. No marks/TP data entered.

Example PBD error:

```text
Could not generate PBD analysis because no TP data was found for BM.
Please check that the BM sheet contains class rows and TP counts.
```

## 18. Implementation Phases

## Phase 1: Shared Foundation

Build:

- Next.js app
- Tailwind UI shell
- Google Sheets server client
- environment variable validation
- password gate
- shared dashboard

Deliverable:

```text
User can open the app and choose UPSA or PBD.
```

## Phase 2: UPSA Data + Slip Generation

Build:

- UPSA class tab listing
- UPSA class parser
- UPSA student result preview
- UPSA React PDF slip template
- UPSA class PDF
- UPSA individual student PDF

Deliverable:

```text
Teacher can generate UPSA slips by class.
```

## Phase 3: UPSA Class Analysis

Build:

- UPSA class analysis dashboard
- UPSA missing marks detection
- UPSA intervention list
- UPSA analysis PDF

Deliverable:

```text
Teacher can view and export UPSA class analysis.
```

## Phase 4: PBD Subject Analysis

Build:

- PBD subject tab listing
- PBD subject parser
- PBD subject analysis page
- TP distribution table/chart
- PBD subject PDF report

Deliverable:

```text
Panitia can view and export PBD subject analysis.
```

## Phase 5: PBD Class Analysis

Build:

- combine PBD records by class across subject tabs
- PBD class analysis page
- subjects requiring intervention
- not assessed summary
- PBD class PDF report

Deliverable:

```text
Class teacher can view and export PBD class analysis.
```

## Phase 6: PBD Year Analysis

Build:

- combine PBD records by year
- PBD year analysis page
- class comparison
- subject comparison
- PBD year PDF report

Deliverable:

```text
Admin can view and export PBD year-level analysis.
```

## Phase 7: Future Individual PBD Slips

Deferred.

Only build later if the school provides student-level PBD data.

Future requirements may include:

- student name
- class
- subject
- TP per subject
- teacher remarks
- individual PBD slip template

## 19. MVP Acceptance Criteria

MVP is complete when:

1. App deploys successfully on Vercel.
2. App reads UPSA Google Sheet from environment variable.
3. App reads PBD Google Sheet from environment variable.
4. App lists valid UPSA classes.
5. App generates UPSA class PDF slips.
6. App generates UPSA individual student slip.
7. App shows UPSA class analysis.
8. App lists PBD subject tabs.
9. App parses PBD subject summary data.
10. App shows PBD subject analysis.
11. App shows PBD class analysis across subjects.
12. App shows PBD year-level analysis.
13. App generates PBD subject report PDF.
14. App generates PBD class report PDF.
15. App generates PBD year report PDF.
16. App does not generate individual PBD student slips.
17. Blank UPSA marks are ignored.
18. PBD missing/incomplete TP data is flagged.
19. No Google credentials are exposed to the browser.
20. App can be used without touching code.

## 20. Codex Build Instruction

Build in this order:

1. Scaffold Next.js app with TypeScript and Tailwind.
2. Install dependencies:
   - `@react-pdf/renderer`
   - `googleapis`
   - `zod`
   - `recharts`
3. Create shared layout and dashboard.
4. Create typed domain models in `src/types`.
5. Create environment variable validation.
6. Build Google Sheets server client.
7. Build UPSA class parser.
8. Build UPSA slip generation.
9. Build UPSA analysis.
10. Build PBD subject tab listing.
11. Build PBD subject parser.
12. Build PBD subject analysis dashboard.
13. Build PBD class analysis dashboard.
14. Build PBD year analysis dashboard.
15. Build PBD PDF report templates.
16. Add error boundaries and loading states.
17. Add README setup instructions.

## 21. Definition of Done

The app is ready for first school test when:

- A teacher can select UPSA `4 ANGSANA`.
- UPSA student names appear correctly.
- UPSA class slip PDF downloads successfully.
- Blank UPSA marks do not appear as F.
- UPSA class analysis shows missing marks and intervention pupils.
- A teacher can select PBD subject `BM`.
- PBD subject analysis shows TP distribution by class.
- A teacher can select a PBD class such as `5 ANGGERIK`.
- PBD class analysis combines subjects correctly.
- Admin can view PBD year-level analysis.
- PBD PDFs can be downloaded for subject, class, and year.
- No individual PBD student slip feature appears in the MVP UI.
- Deployment works on Vercel using environment variables.
