"use server";

import { revalidatePath, updateTag } from "next/cache";
import { requireRole } from "@/lib/auth/actor";
import { saveDatabasePbdIntervention, setDatabasePbdInterventionArchived } from "@/lib/db/interventions";

export type InterventionActionState = { error?: string; success?: string; revision?: number };

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Intervensi tidak dapat disimpan. Cuba semula.";
}
function refreshInterventions() {
  updateTag("pbd-database");
  revalidatePath("/pbd/interventions/entry");
  revalidatePath("/intervensi");
  revalidatePath("/dialog-prestasi");
  revalidatePath("/insights");
}

export async function saveInterventionAction(_: InterventionActionState, formData: FormData): Promise<InterventionActionState> {
  try {
    const context = await requireRole("school_admin", "platform_admin");
    const result = await saveDatabasePbdIntervention(context, Object.fromEntries(formData));
    refreshInterventions();
    return { success: result.changed ? "Intervensi disimpan." : "Tiada perubahan baharu.", revision: result.revision };
  } catch (error) {
    return { error: errorMessage(error) };
  }
}

export async function archiveInterventionAction(_: InterventionActionState, formData: FormData): Promise<InterventionActionState> {
  try {
    const context = await requireRole("school_admin", "platform_admin");
    const restore = formData.get("restore") === "true";
    const result = await setDatabasePbdInterventionArchived(context, {
      interventionId: formData.get("interventionId"),
      expectedRevision: formData.get("expectedRevision"),
      restore,
    });
    refreshInterventions();
    return { success: restore ? "Intervensi dipulihkan." : "Intervensi diarkibkan.", revision: result.revision };
  } catch (error) {
    return { error: errorMessage(error) };
  }
}
