import "server-only";
import { requireSchoolContext } from "@/lib/auth";
import { DataSourceError } from "@/lib/dataSourceError";

export async function requireDefaultPbdContext() {
  const school = await requireSchoolContext();
  const period = school.defaultPbdPeriod;
  if (!period) throw new DataSourceError("workbook_inaccessible", "PBD is not configured.", "pbd");
  return { school, period };
}

export async function requireDefaultUpsaContext() {
  const school = await requireSchoolContext();
  const period = school.defaultUpsaPeriod;
  if (!period) throw new DataSourceError("workbook_inaccessible", "UPSA is not configured.", "upsa");
  return { school, period };
}
