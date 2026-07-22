import "server-only";
import type { ActorContext } from "@/lib/auth/actor";
import type { SchoolContext } from "@/lib/config/schools";
import { resolveAssessmentPeriod, resolvePbdPeriod } from "@/lib/config/periods";
import { getAllAssessmentClassResultsHybrid } from "@/lib/upsa/data";
import { getAllPbdRecords } from "@/lib/pbd/data";
import { DataSourceError } from "@/lib/dataSourceError";
import { buildProgressModel, type ProgressInput } from "./buildProgressModel";
import type { PbdRecordInput } from "./pbdSemesterMovement";
import type { ProgressModel } from "@/types/progress";
import type { PbdSubjectClassRecord } from "@/types/pbd";

/**
 * Convert PbdSubjectClassRecord[] into the minimal PbdRecordInput shape
 * consumed by the comparison engine.
 */
function toPbdRecordInput(records: PbdSubjectClassRecord[]): PbdRecordInput[] {
  return records.map((record) => ({
    className: record.className,
    subjectCode: record.subjectCode,
    tpCounts: record.tpCounts,
    totalPupils: record.totalPupils,
    notAssessedCount: record.notAssessedCount,
  }));
}

/**
 * Fetch all data needed for the progress model and build it.
 * Handles missing periods gracefully — a missing assessment or PBD semester
 * produces partial evidence, never fabricated zeroes.
 */
export async function fetchProgressData(
  context: ActorContext,
  school: SchoolContext,
  year: string,
  level: number | null,
): Promise<ProgressModel> {
  const { assessmentPeriods, pbdPeriods } = school;

  const upsaPeriod = resolveAssessmentPeriod(assessmentPeriods, year, "upsa");
  const uasaPeriod = resolveAssessmentPeriod(assessmentPeriods, year, "uasa");
  const pbdSem1Period = resolvePbdPeriod(pbdPeriods, year, "1");
  const pbdSem2Period = resolvePbdPeriod(pbdPeriods, year, "2");

  // Fetch all four data sources concurrently.
  // Each returns null when the period is not configured.
  const [upsaResults, uasaResults, pbdSem1Raw, pbdSem2Raw] = await Promise.all([
    upsaPeriod
      ? safeFetch(() => getAllAssessmentClassResultsHybrid(context, upsaPeriod))
      : Promise.resolve(null),
    uasaPeriod
      ? safeFetch(() => getAllAssessmentClassResultsHybrid(context, uasaPeriod))
      : Promise.resolve(null),
    pbdSem1Period
      ? safeFetch(() => getAllPbdRecords(school, pbdSem1Period))
      : Promise.resolve(null),
    pbdSem2Period
      ? safeFetch(() => getAllPbdRecords(school, pbdSem2Period))
      : Promise.resolve(null),
  ]);

  const input: ProgressInput = {
    year,
    level,
    upsaClassResults: upsaResults,
    uasaClassResults: uasaResults,
    pbdSem1Records: pbdSem1Raw ? toPbdRecordInput(pbdSem1Raw) : null,
    pbdSem2Records: pbdSem2Raw ? toPbdRecordInput(pbdSem2Raw) : null,
  };

  return buildProgressModel(input);
}

/**
 * Wrap a fetch call so that DataSourceErrors (e.g. workbook not configured)
 * degrade gracefully to null instead of crashing the page.
 */
async function safeFetch<T>(fn: () => Promise<T>): Promise<T | null> {
  try {
    return await fn();
  } catch (error) {
    if (error instanceof DataSourceError) return null;
    throw error;
  }
}
