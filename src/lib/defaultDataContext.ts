import "server-only";
import { requireActorContext } from "@/lib/auth/actor";
import { DataSourceError } from "@/lib/dataSourceError";

export async function requireDefaultPbdContext() {
  const context = await requireActorContext();
  const period = context.school.defaultPbdPeriod;
  if (!period) throw new DataSourceError("workbook_inaccessible", "PBD is not configured.", "pbd");
  return { context, school: context.school, period };
}

export async function requireDefaultUpsaContext() {
  const context = await requireActorContext();
  const period = context.school.defaultUpsaPeriod;
  if (!period) throw new DataSourceError("workbook_inaccessible", "UPSA is not configured.", "upsa");
  return { context, school: context.school, period };
}
