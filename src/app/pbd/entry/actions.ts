"use server";

import { revalidatePath, updateTag } from "next/cache";
import { requireRole } from "@/lib/auth/actor";
import {
  assignDatabasePbdSubject,
  createDatabasePbdClass,
  createDatabasePbdSubject,
  saveDatabasePbdEntry,
} from "@/lib/db/pbd";

export type PbdActionState = { error?: string; success?: string };

function message(error: unknown) {
  return error instanceof Error ? error.message : "Tindakan tidak dapat disimpan. Cuba lagi.";
}

function refresh() {
  updateTag("pbd-database");
  revalidatePath("/pbd/entry");
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
