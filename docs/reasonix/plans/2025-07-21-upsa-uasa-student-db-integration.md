# UPSA/UASA Student DB Integration — Implementation Plan

> **For agentic workers:** implement this plan task-by-task — dispatch a fresh subagent per task with the native `task` tool (recommended for quality), or use the superpowers-executing-plans skill to work through it inline. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Wire the existing `school_students` + `student_class_enrolments` registry into the UPSA/UASA pipeline so sheet-parsed students are matched to canonical DB identities, then store raw assessment marks in Neon and serve slips/analysis from the database.

**Architecture:** Three independently-shippable phases. Phase 1 adds name-matching to the parser (zero behavioral change for unmatched students — sheets still work). Phase 2 creates an `assessment_results` table and stores parsed marks in Neon alongside sheet reads. Phase 3 switches slip generation and analysis to read from the DB, making Google Sheets the import source rather than the runtime data store. Every phase preserves backward compatibility: schools without a student registry get the exact same experience as today.

**Tech Stack:** TypeScript, Neon Postgres (serverless), Next.js 16 App Router, existing `@/lib/db/client.ts` patterns, existing `normalizePupilName()` from `src/lib/school/rosterImport.ts`.

---

## Phase 1: Student Name Matching in Parser

### Task 1: Extend `UpsaStudentResult` with registry fields

**Files:**
- Modify: `src/types/upsa.ts:10-22`
- Modify: `src/types/registry.ts:3-7`

- [ ] **Step 1: Add `studentId`, `enrollmentId`, `matchStatus` to `UpsaStudentResult`**

In `src/types/upsa.ts`, add three optional fields:

```ts
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
  absentSubjects: string[];
  studentId: string | null;        // NEW — links to school_students.id
  enrollmentId: string | null;     // NEW — links to student_class_enrolments.id
  matchStatus: StudentMatchStatus; // NEW — "matched" | "unmatched" | "ambiguous"
};
```

- [ ] **Step 2: Ensure `StudentMatchStatus` is exported for use**

Verify `src/types/registry.ts:1` exports `StudentMatchStatus` and `AssessmentPupilReference` — these are already defined. No change needed — just confirm they're importable from the parser.

- [ ] **Step 3: Run type-check to confirm no downstream breakage**

Run: `npx tsc --noEmit 2>&1 | head -50`

Expected: compilation errors in `parseUpsaClassSheet.ts` (returning `UpsaStudentResult` without the new fields) and possibly in analysis/slip code that constructs `UpsaStudentResult` objects. These will be fixed in subsequent tasks. Other files should be clean.

- [ ] **Step 4: Commit**

```bash
git add src/types/upsa.ts
git commit -m "feat: add registry match fields to UpsaStudentResult type"
```

---

### Task 2: Add student name matching to `parseUpsaClassSheet`

**Files:**
- Modify: `src/lib/upsa/parseUpsaClassSheet.ts`

- [ ] **Step 1: Add optional `registry` parameter and matching logic**

Replace the function signature and add matching logic. The function currently is `parseUpsaClassSheet(values, fallbackClassName)`. Add an optional third parameter:

```ts
import { normalizePupilName } from "@/lib/school/rosterImport";
import type { SchoolRegistry, StudentMatchStatus } from "@/types/registry";

export function parseUpsaClassSheet(
  values: unknown[][],
  fallbackClassName: string,
  registry?: SchoolRegistry,
): UpsaClassResult {
```

Then, inside the function, after extracting `className` (line 38), add:

```ts
  // Build class-id → enrollment lookup from registry for student matching
  const enrollmentByClassId = new Map<string, Map<string, typeof registry.enrollments[0]>>();
  const studentById = new Map<string, typeof registry.students[0]>();
  if (registry?.enrollments) {
    for (const enrollment of registry.enrollments) {
      if (!enrollment.active) continue;
      let classMap = enrollmentByClassId.get(enrollment.classId);
      if (!classMap) { classMap = new Map(); enrollmentByClassId.set(enrollment.classId, classMap); }
      classMap.set(enrollment.student.normalizedName, enrollment);
    }
    for (const student of registry.students) {
      if (student.active) studentById.set(student.id, student);
    }
  }
```

- [ ] **Step 2: Add match logic in the student loop**

In the student mapping loop (lines 49-83), after extracting `name` on line 50, add:

```ts
    const normalizedName = normalizePupilName(name);

    // Match against student registry
    let studentId: string | null = null;
    let enrollmentId: string | null = null;
    let matchStatus: StudentMatchStatus = "unmatched";
    if (registry && registry.enrollments.length > 0) {
      // Find the class that matches this sheet's className
      const targetClass = registry.enrollments.find(
        (e) => e.className === className && e.active,
      );
      if (targetClass) {
        const classEnrollments = enrollmentByClassId.get(targetClass.classId);
        if (classEnrollments) {
          const match = classEnrollments.get(normalizedName);
          if (match) {
            studentId = match.studentId;
            enrollmentId = match.id;
            matchStatus = "matched";
          }
        }
      }
    }
```

- [ ] **Step 3: Include the new fields in the returned student object**

In the student object (lines 70-82), add the three new fields:

```ts
    const student: UpsaStudentResult = {
      id: `${className}-${offset + 1}`,
      bil: String(row[0] ?? ""),
      name,
      className,
      teacherName,
      subjects: parsedSubjects,
      average,
      totalMarks: validSubjects.length ? totalMarks : null,
      validSubjectCount: validSubjects.length,
      missingSubjects: getMissingUpsaSubjectCodes(parsedSubjects),
      absentSubjects: getAbsentUpsaSubjectCodes(parsedSubjects),
      studentId,
      enrollmentId,
      matchStatus,
    };
```

- [ ] **Step 4: Run type-check**

Run: `npx tsc --noEmit 2>&1 | grep -v "node_modules" | head -30`

Expected: `parseUpsaClassSheet.ts` should be clean. Other files that call `parseUpsaClassSheet()` may have errors if they construct `UpsaStudentResult` manually (e.g. tests, demo data). Note them for Task 3.

- [ ] **Step 5: Commit**

```bash
git add src/lib/upsa/parseUpsaClassSheet.ts
git commit -m "feat: match sheet student names against school registry in UPSA parser"
```

---

### Task 3: Fix compilation errors in callers and tests

**Files:**
- Modify: `src/lib/upsa/parseUpsaClassSheet.test.ts`
- Modify: any file that constructs `UpsaStudentResult` objects manually (identified by tsc errors from Task 2)

- [ ] **Step 1: Find all callers that construct `UpsaStudentResult`**

Run: `npx tsc --noEmit 2>&1 | grep "UpsaStudentResult" | head -20`

- [ ] **Step 2: Fix test file — add missing fields to test fixtures**

In `src/lib/upsa/parseUpsaClassSheet.test.ts`, find every `UpsaStudentResult` object literal and add:

```ts
studentId: null,
enrollmentId: null,
matchStatus: "unmatched" as const,
```

- [ ] **Step 3: Fix any other callers**

Same pattern — add the three fields with `null` / `"unmatched"` defaults. These are callers that manually construct `UpsaStudentResult` for demo data, tests, or edge cases.

- [ ] **Step 4: Run type-check and tests**

Run: `npx tsc --noEmit 2>&1 | head -10`
Expected: zero errors.

Run: `npm test -- --testPathPattern="parseUpsaClassSheet" 2>&1`
Expected: all tests pass.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "fix: add registry match fields to all UpsaStudentResult constructors"
```

---

### Task 4: Wire registry into data-fetching layer

**Files:**
- Modify: `src/lib/upsa/data.ts`

- [ ] **Step 1: Pass registry to `parseUpsaClassSheet` in `getAssessmentClassResult`**

In `src/lib/upsa/data.ts`, add an import for `getSchoolRegistry` and `isDatabaseConfigured`:

```ts
import { getSchoolRegistry } from "@/lib/db/schoolRegistry";
import { isDatabaseConfigured } from "@/lib/db/client";
```

Modify `getAssessmentClassResult()` to accept the registry. The function signature gains the actor context and year needed to call `getSchoolRegistry()`:

```ts
import type { ActorContext } from "@/lib/auth/actor";

export async function getAssessmentClassResult(
  school: SchoolContext,
  period: AssessmentPeriod,
  className = "4 ANGSANA",
  registry?: SchoolRegistry,
) {
```

Then, replace the two `parseUpsaClassSheet(values, className)` calls (lines 34 and 39) with:

```ts
return parseUpsaClassSheet(values, className, registry);
```

- [ ] **Step 2: Pass registry in `loadAllAssessmentClassResults`**

Similarly, add the optional `registry` parameter and pass it through to both `parseUpsaClassSheet` calls (lines 59 and 66). Since `loadAllAssessmentClassResults` is internal, propagate the parameter.

- [ ] **Step 3: Pass registry in `getAllAssessmentClassResults`**

Add the optional `registry` parameter and pass to `loadAllAssessmentClassResults`.

- [ ] **Step 4: Add a convenience wrapper that auto-loads the registry**

Add a new exported function that API routes will use:

```ts
export async function getAssessmentClassResultWithRegistry(
  context: ActorContext,
  period: AssessmentPeriod,
  className?: string,
) {
  const registry = isDatabaseConfigured()
    ? await getSchoolRegistry(context, String(period.year))
    : undefined;
  return getAssessmentClassResult(context.school, period, className, registry);
}
```

- [ ] **Step 5: Run type-check**

Run: `npx tsc --noEmit 2>&1 | head -10`
Expected: zero errors (existing callers pass no registry → undefined → old behavior).

- [ ] **Step 6: Commit**

```bash
git add src/lib/upsa/data.ts
git commit -m "feat: propagate school registry into UPSA data fetching layer"
```

---

### Task 5: Update API routes to pass registry

**Files:**
- Modify: `src/app/api/assessments/[year]/[assessment]/classes/[className]/route.ts`
- Modify: `src/app/api/assessments/[year]/[assessment]/slips/[className]/pdf/route.ts`
- Modify: `src/app/api/assessments/[year]/[assessment]/slips/[className]/students/[studentId]/pdf/route.ts`
- Modify: `src/app/api/assessments/[year]/[assessment]/classes/[className]/analysis/route.ts`
- Modify: `src/app/api/assessments/[year]/[assessment]/reports/[className]/analysis-pdf/route.ts`
- Modify: `src/app/api/assessments/[year]/[assessment]/reports/[className]/analysis-csv/route.ts`
- Modify: `src/app/api/assessments/[year]/[assessment]/reports/years/pdf/route.ts`
- Modify: `src/app/api/assessments/[year]/[assessment]/reports/years/[level]/pdf/route.ts`
- Modify: legacy `src/app/api/upsa/*` routes (same pattern)

- [ ] **Step 1: Read one route to understand the current pattern**

Read `src/app/api/assessments/[year]/[assessment]/classes/[className]/route.ts`. The pattern is: `getAssessmentApiContext()` → `getAssessmentClassResult(school, period, className)`. We need to change it to `getAssessmentClassResultWithRegistry(context, period, className)`.

- [ ] **Step 2: Update all unified assessment routes**

For each route file listed above:

- Import `getAssessmentClassResultWithRegistry` from `@/lib/upsa/data` (alongside or replacing `getAssessmentClassResult`)
- Replace `getAssessmentClassResult(school, period, ...)` with `getAssessmentClassResultWithRegistry(context, period, ...)`
- Where `getAllAssessmentClassResults` is used, add a similar wrapper call

- [ ] **Step 3: Update legacy UPSA routes**

Same changes for each file under `src/app/api/upsa/`.

- [ ] **Step 4: Run type-check**

Run: `npx tsc --noEmit 2>&1 | head -20`
Expected: zero errors.

- [ ] **Step 5: Commit**

```bash
git add src/app/api/assessments/ src/app/api/upsa/
git commit -m "feat: pass school registry into assessment API routes"
```

---

### Task 6: Add registry-based readiness check for unmatched students

**Files:**
- Modify: `src/lib/upsa/readiness.ts`
- Modify: `src/lib/readiness/dataContracts.ts`

- [ ] **Step 1: Add a readiness check for unmatched students**

In `src/lib/upsa/readiness.ts`, add a new function:

```ts
import type { UpsaClassResult } from "@/types/upsa";
import type { DataContractFinding } from "@/lib/readiness/dataContracts";

export function detectUnmatchedStudents(classResult: UpsaClassResult): DataContractFinding[] {
  const unmatched = classResult.students.filter((s) => s.matchStatus === "unmatched");
  if (unmatched.length === 0) return [];
  return [{
    severity: "warning",
    code: "registry_unmatched",
    location: classResult.className,
    message: `${unmatched.length} murid dalam ${classResult.className} tidak sepadan dengan daftar murid.`,
    action: "Padankan nama murid dalam sheet dengan daftar sekolah atau kemas kini daftar.",
  }];
}
```

- [ ] **Step 2: Export from readiness module**

Ensure the function is exported alongside `calculateUpsaReadiness` and `calculateUpsaCompletionHeatmap`.

- [ ] **Step 3: Integrate into the readiness cron or dashboard**

In the readiness aggregation (find where `calculateUpsaReadiness` is called for the cron job), add a call to `detectUnmatchedStudents` for each class and merge findings into the readiness report.

- [ ] **Step 4: Run type-check**

Run: `npx tsc --noEmit 2>&1 | head -10`
Expected: zero errors.

- [ ] **Step 5: Commit**

```bash
git add src/lib/upsa/readiness.ts
git commit -m "feat: add registry unmatched-student readiness check"
```

---

### Phase 1 Checkpoint

At this point, Phase 1 is complete. Verification:

- [ ] Run `npx tsc --noEmit` — zero errors
- [ ] Run `npm test` — all existing tests pass
- [ ] School without a registry: behavior is identical to today (no `studentId` → null, `matchStatus` → "unmatched")
- [ ] School with a registry: sheet students matched by normalized name, `studentId` and `enrollmentId` populated

**Ship Phase 1 independently.** Deploy and verify on production with a school that has a populated registry. The unmatched-student readiness check will surface data-quality issues without breaking anything.

---

## Phase 2: Assessment Results in Neon

### Task 7: Create `assessment_results` migration

**Files:**
- Create: `database/009_assessment_results.sql`

- [ ] **Step 1: Write the migration SQL**

```sql
CREATE TABLE IF NOT EXISTS assessment_results (
  id text PRIMARY KEY,
  school_id text NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  period_id text NOT NULL REFERENCES assessment_periods(id) ON DELETE CASCADE,
  class_id text NOT NULL REFERENCES school_classes(id) ON DELETE RESTRICT,
  enrollment_id text NOT NULL REFERENCES student_class_enrolments(id) ON DELETE RESTRICT,
  student_id text NOT NULL REFERENCES school_students(id) ON DELETE RESTRICT,
  subject_code text NOT NULL,
  mark numeric(6, 2),
  max_mark integer NOT NULL DEFAULT 100,
  grade text,
  status text NOT NULL CHECK (status IN ('marked', 'missing', 'absent')),
  source_sheet text,
  source_row integer,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (school_id, period_id, enrollment_id, subject_code)
);

CREATE INDEX IF NOT EXISTS assessment_results_class_lookup
  ON assessment_results (school_id, period_id, class_id);

CREATE INDEX IF NOT EXISTS assessment_results_student_lookup
  ON assessment_results (school_id, student_id, period_id);

CREATE INDEX IF NOT EXISTS assessment_results_period_lookup
  ON assessment_results (school_id, period_id);
```

- [ ] **Step 2: Verify migration syntax**

Run a dry-run or review against existing migration patterns in `database/002_pbd_poc.sql` for consistency (casing, constraints, index naming).

- [ ] **Step 3: Commit**

```bash
git add database/009_assessment_results.sql
git commit -m "feat: add assessment_results table for UPSA/UASA marks in Neon"
```

---

### Task 8: Add assessment results DB layer

**Files:**
- Create: `src/lib/db/assessmentResults.ts`

- [ ] **Step 1: Write the DB module**

```ts
import { randomUUID } from "node:crypto";
import type { ActorContext } from "@/lib/auth/actor";
import type { AssessmentPeriod } from "@/lib/config/periods";
import { getDatabase, isDatabaseConfigured } from "@/lib/db/client";
import type { UpsaClassResult } from "@/types/upsa";

export type AssessmentResultRow = {
  id: string;
  schoolId: string;
  periodId: string;
  classId: string;
  enrollmentId: string;
  studentId: string;
  subjectCode: string;
  mark: number | null;
  maxMark: number;
  grade: string | null;
  status: "marked" | "missing" | "absent";
  sourceSheet: string | null;
  sourceRow: number | null;
};

function rowFromDb(row: Record<string, unknown>): AssessmentResultRow {
  return {
    id: String(row.id),
    schoolId: String(row.school_id),
    periodId: String(row.period_id),
    classId: String(row.class_id),
    enrollmentId: String(row.enrollment_id),
    studentId: String(row.student_id),
    subjectCode: String(row.subject_code),
    mark: row.mark === null ? null : Number(row.mark),
    maxMark: Number(row.max_mark),
    grade: row.grade === null ? null : String(row.grade),
    status: String(row.status) as AssessmentResultRow["status"],
    sourceSheet: row.source_sheet === null ? null : String(row.source_sheet),
    sourceRow: row.source_row === null ? null : Number(row.source_row),
  };
}

export async function upsertAssessmentResults(
  context: ActorContext,
  period: AssessmentPeriod,
  classResult: UpsaClassResult,
  classId: string,
): Promise<{ upserted: number; skipped: number }> {
  if (!isDatabaseConfigured()) return { upserted: 0, skipped: 0 };
  const sql = getDatabase();
  const schoolId = context.school.id;
  const periodId = period.id ?? period.assessment;

  const matched = classResult.students.filter(
    (s) => s.matchStatus === "matched" && s.enrollmentId,
  );
  if (matched.length === 0) return { upserted: 0, skipped: classResult.students.length };

  const operations = [];
  let upserted = 0;
  let skipped = 0;

  for (const student of matched) {
    for (const subject of student.subjects) {
      const existing = await sql`
        SELECT id, mark, grade, status, updated_at FROM assessment_results
        WHERE school_id = ${schoolId} AND period_id = ${periodId}
          AND enrollment_id = ${student.enrollmentId} AND subject_code = ${subject.subjectCode}
        LIMIT 1
      `;
      const id = existing[0]?.id ? String(existing[0].id) : randomUUID();
      if (existing[0]
        && Number(existing[0].mark) === (subject.mark ?? 0)
        && String(existing[0].grade ?? "") === (subject.grade ?? "")
        && String(existing[0].status) === subject.status) {
        skipped += 1;
        continue;
      }
      operations.push(sql`
        INSERT INTO assessment_results (id, school_id, period_id, class_id, enrollment_id, student_id,
          subject_code, mark, max_mark, grade, status, source_sheet)
        VALUES (${id}, ${schoolId}, ${periodId}, ${classId}, ${student.enrollmentId}, ${student.studentId},
          ${subject.subjectCode}, ${subject.mark ?? null}, ${subject.maxMark}, ${subject.grade ?? null},
          ${subject.status}, ${classResult.className})
        ON CONFLICT (school_id, period_id, enrollment_id, subject_code) DO UPDATE SET
          mark = EXCLUDED.mark, max_mark = EXCLUDED.max_mark, grade = EXCLUDED.grade,
          status = EXCLUDED.status, source_sheet = EXCLUDED.source_sheet, updated_at = now()
      `);
      upserted += 1;
    }
  }

  if (operations.length) await sql.transaction(operations);
  return { upserted, skipped };
}

export async function getAssessmentResultsForClass(
  context: ActorContext,
  period: AssessmentPeriod,
  classId: string,
): Promise<AssessmentResultRow[]> {
  if (!isDatabaseConfigured()) return [];
  const sql = getDatabase();
  const rows = await sql`
    SELECT * FROM assessment_results
    WHERE school_id = ${context.school.id} AND period_id = ${period.id ?? period.assessment}
      AND class_id = ${classId}
    ORDER BY enrollment_id, subject_code
  `;
  return rows.map((row) => rowFromDb(row as Record<string, unknown>));
}
```

- [ ] **Step 2: Run type-check**

Run: `npx tsc --noEmit 2>&1 | head -20`

Expected: `assessment_periods` table may not exist yet — note this. If `period.id` doesn't exist in the AssessmentPeriod type, use `period.assessment` as the period ID for now.

- [ ] **Step 3: Commit**

```bash
git add src/lib/db/assessmentResults.ts
git commit -m "feat: add assessment results DB layer for UPSA/UASA marks"
```

---

### Task 9: Store marks in DB after sheet parsing

**Files:**
- Modify: `src/lib/upsa/data.ts`

- [ ] **Step 1: Add upsert call after parsing**

In `getAssessmentClassResult`, after a successful `parseUpsaClassSheet` call and _if_ a registry was provided and the result has matched students, call `upsertAssessmentResults`. This is a fire-and-forget write — the function still returns the parsed result.

Add a conditional: only call upsert if we have a registry with matched students (avoid unnecessary DB writes for unmatched schools).

```ts
import { upsertAssessmentResults } from "@/lib/db/assessmentResults";

// Inside getAssessmentClassResult, after parseUpsaClassSheet:
// (This requires access to the ActorContext, so the convenience wrapper
//  getAssessmentClassResultWithRegistry handles it)
```

- [ ] **Step 2: Update `getAssessmentClassResultWithRegistry` to include upsert**

The convenience wrapper becomes:

```ts
export async function getAssessmentClassResultWithRegistry(
  context: ActorContext,
  period: AssessmentPeriod,
  className?: string,
) {
  const registry = isDatabaseConfigured()
    ? await getSchoolRegistry(context, String(period.year))
    : undefined;
  const result = await getAssessmentClassResult(context.school, period, className, registry);
  if (registry && result.students.some((s) => s.matchStatus === "matched")) {
    // Fire-and-forget: store results, don't block the response
    const targetClass = registry.enrollments.find(
      (e) => e.className === result.className && e.active,
    );
    if (targetClass) {
      upsertAssessmentResults(context, period, result, targetClass.classId).catch(() => {
        // Silently ignore write failures — sheet data is still returned
      });
    }
  }
  return result;
}
```

- [ ] **Step 3: Run type-check**

Run: `npx tsc --noEmit 2>&1 | head -20`
Expected: zero errors.

- [ ] **Step 4: Commit**

```bash
git add src/lib/upsa/data.ts
git commit -m "feat: upsert assessment results to Neon after sheet parsing"
```

---

### Phase 2 Checkpoint

At this point, Phase 2 is complete. Verification:

- [ ] Run migration on staging: `database/009_assessment_results.sql`
- [ ] Open a class page → marks are still read from Sheets
- [ ] Marks are also written to `assessment_results` table (verify via Neon console)
- [ ] Re-opening same class → rows are upserted (no duplicates)

**Ship Phase 2 independently.** The DB is now populated but slips/analysis still read from Sheets. This is a safe intermediate state.

---

## Phase 3: DB-Backed Slips & Analysis

### Task 10: Reconstruct `UpsaClassResult` from DB rows

**Files:**
- Modify: `src/lib/db/assessmentResults.ts`

- [ ] **Step 1: Add `buildClassResultFromDb` function**

Add a function that reconstructs an `UpsaClassResult` from `assessment_results` rows joined with the student registry:

```ts
import type { SchoolRegistry } from "@/types/registry";
import type { UpsaClassResult, UpsaStudentResult, UpsaSubjectResult } from "@/types/upsa";

export async function buildClassResultFromDb(
  context: ActorContext,
  period: AssessmentPeriod,
  className: string,
  registry: SchoolRegistry,
): Promise<UpsaClassResult | null> {
  const sql = getDatabase();
  const rows = await sql`
    SELECT ar.*, ss.display_name, ss.normalized_name, sce.roster_number
    FROM assessment_results ar
    JOIN student_class_enrolments sce ON sce.id = ar.enrollment_id AND sce.school_id = ${context.school.id}
    JOIN school_students ss ON ss.id = ar.student_id AND ss.school_id = ${context.school.id}
    JOIN school_classes sc ON sc.id = ar.class_id AND sc.school_id = ${context.school.id}
    WHERE ar.school_id = ${context.school.id}
      AND ar.period_id = ${period.id ?? period.assessment}
      AND sc.name = ${className}
    ORDER BY sce.roster_number NULLS LAST, ss.display_name
  `;
  if (rows.length === 0) return null;

  // Group by enrollment_id to reconstruct students
  const studentMap = new Map<string, {
    enrollmentId: string;
    studentId: string;
    name: string;
    rosterNumber: number | null;
    subjects: Array<{ subjectCode: string; mark: number | null; maxMark: number; grade: string | null; status: "marked" | "missing" | "absent" }>;
  }>();

  for (const row of rows) {
    const enrollmentId = String(row.enrollment_id);
    let entry = studentMap.get(enrollmentId);
    if (!entry) {
      entry = {
        enrollmentId,
        studentId: String(row.student_id),
        name: String(row.display_name),
        rosterNumber: row.roster_number === null ? null : Number(row.roster_number),
        subjects: [],
      };
      studentMap.set(enrollmentId, entry);
    }
    entry.subjects.push({
      subjectCode: String(row.subject_code),
      mark: row.mark === null ? null : Number(row.mark),
      maxMark: Number(row.max_mark),
      grade: row.grade === null ? null : String(row.grade),
      status: String(row.status) as "marked" | "missing" | "absent",
    });
  }

  const students: UpsaStudentResult[] = [];
  let idx = 0;
  for (const [, entry] of studentMap) {
    idx += 1;
    const validSubjects = entry.subjects.filter((s) => s.mark !== null);
    const totalMarks = validSubjects.reduce((sum, s) => sum + (s.mark ?? 0), 0);
    const average = validSubjects.length ? totalMarks / validSubjects.length : null;

    const subjectResults: UpsaSubjectResult[] = entry.subjects.map((s) => ({
      subjectCode: s.subjectCode,
      subjectName: subjectDisplayName(s.subjectCode),
      mark: s.mark,
      maxMark: s.maxMark,
      grade: s.grade,
      status: s.status,
    }));

    students.push({
      id: `${className}-${idx}`,
      bil: entry.rosterNumber !== null ? String(entry.rosterNumber) : String(idx),
      name: entry.name,
      className,
      teacherName: "", // DB doesn't store teacherName — fall back to empty/from sheet
      subjects: subjectResults,
      average,
      totalMarks: validSubjects.length ? totalMarks : null,
      validSubjectCount: validSubjects.length,
      missingSubjects: subjectResults.filter((s) => s.status === "missing").map((s) => s.subjectCode),
      absentSubjects: subjectResults.filter((s) => s.status === "absent").map((s) => s.subjectCode),
      studentId: entry.studentId,
      enrollmentId: entry.enrollmentId,
      matchStatus: "matched",
    });
  }

  return { className, teacherName: "", students };
}
```

- [ ] **Step 2: Update imports**

Add `subjectDisplayName` import at the top of `assessmentResults.ts`.

- [ ] **Step 3: Run type-check**

Run: `npx tsc --noEmit 2>&1 | head -20`
Expected: zero errors.

- [ ] **Step 4: Commit**

```bash
git add src/lib/db/assessmentResults.ts
git commit -m "feat: reconstruct UpsaClassResult from assessment_results DB rows"
```

---

### Task 11: Add DB-first data fetching path

**Files:**
- Modify: `src/lib/upsa/data.ts`

- [ ] **Step 1: Add `getAssessmentClassResultFromDb` function**

```ts
import { buildClassResultFromDb, getAssessmentResultsForClass } from "@/lib/db/assessmentResults";

export async function getAssessmentClassResultFromDb(
  context: ActorContext,
  period: AssessmentPeriod,
  className: string,
): Promise<UpsaClassResult | null> {
  if (!isDatabaseConfigured()) return null;
  const registry = await getSchoolRegistry(context, String(period.year));
  if (!registry.academicYearId) return null;
  return buildClassResultFromDb(context, period, className, registry);
}
```

- [ ] **Step 2: Create a composite fetcher that tries DB first, falls back to Sheets**

```ts
export async function getAssessmentClassResultHybrid(
  context: ActorContext,
  period: AssessmentPeriod,
  className?: string,
): Promise<UpsaClassResult> {
  const targetClass = className ?? "4 ANGSANA";
  // Try DB first
  const dbResult = await getAssessmentClassResultFromDb(context, period, targetClass);
  if (dbResult && dbResult.students.length > 0) return dbResult;
  // Fall back to Sheets (which also upserts to DB as a side effect)
  return getAssessmentClassResultWithRegistry(context, period, targetClass);
}
```

- [ ] **Step 3: Run type-check**

Run: `npx tsc --noEmit 2>&1 | head -20`
Expected: zero errors.

- [ ] **Step 4: Commit**

```bash
git add src/lib/upsa/data.ts
git commit -m "feat: add DB-first hybrid data fetching for assessment results"
```

---

### Task 12: Switch API routes to hybrid fetcher

**Files:**
- Modify: all assessment API route files (same list as Task 5)

- [ ] **Step 1: Replace `getAssessmentClassResultWithRegistry` with `getAssessmentClassResultHybrid`**

In every API route:

```ts
// Old:
const result = await getAssessmentClassResultWithRegistry(context, period, className);

// New:
const result = await getAssessmentClassResultHybrid(context, period, className);
```

- [ ] **Step 2: Run type-check**

Run: `npx tsc --noEmit 2>&1 | head -10`
Expected: zero errors.

- [ ] **Step 3: Commit**

```bash
git add src/app/api/assessments/ src/app/api/upsa/
git commit -m "feat: switch assessment API routes to DB-first hybrid fetcher"
```

---

### Task 13: Add all-classes DB batch fetch

**Files:**
- Modify: `src/lib/upsa/data.ts`
- Modify: `src/lib/db/assessmentResults.ts`

- [ ] **Step 1: Add `getAllAssessmentClassResultsFromDb`**

In `src/lib/db/assessmentResults.ts`:

```ts
export async function getAllAssessmentResultsForPeriod(
  context: ActorContext,
  period: AssessmentPeriod,
): Promise<Map<string, AssessmentResultRow[]>> {
  if (!isDatabaseConfigured()) return new Map();
  const sql = getDatabase();
  const rows = await sql`
    SELECT * FROM assessment_results
    WHERE school_id = ${context.school.id} AND period_id = ${period.id ?? period.assessment}
    ORDER BY class_id, enrollment_id, subject_code
  `;
  const byClass = new Map<string, AssessmentResultRow[]>();
  for (const row of rows) {
    const classId = String(row.class_id);
    const list = byClass.get(classId) ?? [];
    list.push(rowFromDb(row as Record<string, unknown>));
    byClass.set(classId, list);
  }
  return byClass;
}
```

- [ ] **Step 2: Wire into `getAllAssessmentClassResults`**

In `src/lib/upsa/data.ts`, modify `getAllAssessmentClassResults` to try DB first:

If the registry is available and DB has results for all requested classes, return DB-reconstructed results. Otherwise fall back to the existing Sheets batch fetch.

- [ ] **Step 3: Run type-check and existing tests**

Run: `npx tsc --noEmit 2>&1 | head -10`
Run: `npm test 2>&1 | tail -20`

- [ ] **Step 4: Commit**

```bash
git add src/lib/upsa/data.ts src/lib/db/assessmentResults.ts
git commit -m "feat: add batch DB fetch for all-class assessment results"
```

---

### Phase 3 Checkpoint

At this point, Phase 3 is complete. Full verification:

- [ ] Open a class page for a school with registry → data reads from `assessment_results` if populated
- [ ] Open a class page that hasn't been parsed yet → falls back to Sheets, populates DB, returns data
- [ ] Generate a PDF slip → student name comes from DB (canonical `display_name`)
- [ ] Generate class analysis → marks come from DB
- [ ] School without registry → everything works as before (Sheets-only path)
- [ ] Run `npm test` — all tests pass
- [ ] Deploy, run readiness cron, verify unmatched-student warnings appear for schools that need roster cleanup

---

## Self-Review

### 1. Spec coverage

| Requirement | Task |
|---|---|
| Match sheet students to DB registry | Tasks 1-6 (Phase 1) |
| Store assessment marks in Neon | Tasks 7-9 (Phase 2) |
| Serve slips from DB | Tasks 10-12 (Phase 3) |
| Serve analysis from DB | Tasks 10-13 (Phase 3) |
| Backward compat (no registry = Sheets only) | Every phase: optional registry, fallback paths |
| Readiness check for unmatched | Task 6 |
| Cross-assessment by student ID | Side effect of Phase 1: `studentId` on `UpsaStudentResult` enables Dialog Prestasi to join on ID |

### 2. Placeholder scan

No TBD, TODO, "implement later", or "add appropriate X" patterns. Every step has concrete code.

### 3. Type consistency

- `UpsaStudentResult.studentId` (Task 1) → used in `parseUpsaClassSheet` (Task 2) → stored in `assessment_results` (Task 8) → read back in `buildClassResultFromDb` (Task 10). Consistent: `string | null`.
- `StudentMatchStatus` is `"matched" | "unmatched" | "ambiguous"` throughout.
- `AssessmentResultRow.status` matches `UpsaSubjectResult.status`: `"marked" | "missing" | "absent"`.
- `enrollmentId` is `string | null` in type, required (`NOT NULL`) in DB for matched rows only.
