"use server";

import { revalidatePath, updateTag } from "next/cache";
import { requireRole } from "@/lib/auth/actor";
import {
  assignDatabasePbdSubject,
  createDatabasePbdClass,
  createDatabasePbdSubject,
  deleteDatabasePbdSetup,
  saveDatabasePbdEntry,
  saveDatabasePbdClassEntries,
  setDatabasePbdSetupArchived,
  updateDatabasePbdClassEnrollment,
} from "@/lib/db/pbd";

export type PbdActionState = { error?: string; success?: string; changedCount?: number; savedAt?: string };

function message(error: unknown) {
  if (error && typeof error === "object" && "code" in error) {
    return "Data tidak dapat disimpan. Semak maklumat kelas dan cuba semula.";
  }
  return error instanceof Error ? error.message : "Tindakan tidak dapat disimpan. Cuba lagi.";
}

function refresh() {
  updateTag("pbd-database");
  revalidatePath("/pbd/entry");
  revalidatePath("/pbd/setup");
  revalidatePath("/dashboard");
  revalidatePath("/pbd/periods/[year]", "page");
}

export async function createPbdClassAction(_: PbdActionState, formData: FormData): Promise<PbdActionState> {
  try {
    const context = await requireRole("school_admin", "platform_admin");
    await createDatabasePbdClass(context, Object.fromEntries(formData));
    refresh();
    return { success: "Kelas ditambah." };
  } catch (error) {
    return { error: message(error) };
  }
}

export async function createPbdSubjectAction(_: PbdActionState, formData: FormData): Promise<PbdActionState> {
  try {
    const context = await requireRole("school_admin", "platform_admin");
    await createDatabasePbdSubject(context, Object.fromEntries(formData));
    refresh();
    return { success: "Subjek ditambah." };
  } catch (error) {
    return { error: message(error) };
  }
}

export async function assignPbdSubjectAction(_: PbdActionState, formData: FormData): Promise<PbdActionState> {
  try {
    const context = await requireRole("school_admin", "platform_admin");
    await assignDatabasePbdSubject(context, Object.fromEntries(formData));
    refresh();
    return { success: "Subjek telah ditetapkan kepada kelas." };
  } catch (error) {
    return { error: message(error) };
  }
}

export async function savePbdEntryAction(_: PbdActionState, formData: FormData): Promise<PbdActionState> {
  try {
    const context = await requireRole("school_admin", "platform_admin");
    await saveDatabasePbdEntry(context, Object.fromEntries(formData));
    refresh();
    return { success: formData.get("action") === "finalize" ? "Rekod telah dimuktamadkan." : "Draf disimpan." };
  } catch (error) {
    return { error: message(error) };
  }
}

function readRows(formData: FormData) {
  return formData.getAll("classSubjectId").map((value) => {
    const id = String(value);
    const field = (name: string) => formData.get(`${name}:${id}`);
    return {
      classSubjectId: id,
      expectedRevision: field("revision"),
      tp1: field("tp1"), tp2: field("tp2"), tp3: field("tp3"), tp4: field("tp4"), tp5: field("tp5"), tp6: field("tp6"),
      notAssessed: field("notAssessed"),
    };
  });
}

export async function savePbdClassEntriesAction(_: PbdActionState, formData: FormData): Promise<PbdActionState> {
  try {
    const context = await requireRole("school_admin", "platform_admin");
    const result = await saveDatabasePbdClassEntries(context, {
      classId: formData.get("classId"), year: formData.get("year"), semester: formData.get("semester"),
      finalizeClassSubjectId: formData.get("intent") === "finalize" ? formData.get("targetClassSubjectId") : null,
      reopenClassSubjectId: formData.get("intent") === "reopen" ? formData.get("targetClassSubjectId") : null,
      entries: readRows(formData),
    });
    refresh();
    const intent = formData.get("intent");
    return { success: intent === "finalize" ? "Draf kelas disimpan dan subjek dimuktamadkan." : intent === "reopen" ? "Draf kelas disimpan dan subjek dibuka semula." : "Semua draf kelas disimpan.", changedCount: result.filter((row) => row.changed).length, savedAt: new Date().toLocaleTimeString("ms-MY", { hour: "2-digit", minute: "2-digit" }) };
  } catch (error) {
    return { error: message(error) };
  }
}

export async function updatePbdClassEnrollmentAction(_: PbdActionState, formData: FormData): Promise<PbdActionState> {
  try {
    const context = await requireRole("school_admin", "platform_admin");
    await updateDatabasePbdClassEnrollment(context, Object.fromEntries(formData));
    refresh();
    return { success: "Jumlah murid kelas dan semua draf aktif telah diselaraskan." };
  } catch (error) { return { error: message(error) }; }
}

export async function archivePbdSetupAction(_: PbdActionState, formData: FormData): Promise<PbdActionState> {
  try {
    const context = await requireRole("school_admin", "platform_admin");
    await setDatabasePbdSetupArchived(context, { ...Object.fromEntries(formData), restore: formData.get("restore") === "true" });
    refresh();
    return { success: formData.get("restore") === "true" ? "Rekod setup dipulihkan." : "Rekod setup diarkibkan." };
  } catch (error) { return { error: message(error) }; }
}

export async function deletePbdSetupAction(_: PbdActionState, formData: FormData): Promise<PbdActionState> {
  try {
    const context = await requireRole("school_admin", "platform_admin");
    await deleteDatabasePbdSetup(context, Object.fromEntries(formData));
    refresh();
    return { success: "Rekod yang tidak digunakan telah dipadam secara kekal." };
  } catch (error) { return { error: message(error) }; }
}
