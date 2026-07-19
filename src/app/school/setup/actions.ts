"use server";

import * as XLSX from "xlsx";
import { revalidatePath, updateTag } from "next/cache";
import { requireRole } from "@/lib/auth/actor";
import { getDatabasePbdSetup } from "@/lib/db/pbd";
import { getSchoolRegistry, importSchoolRoster, setSchoolRosterStudentArchived, updateSchoolRosterStudent } from "@/lib/db/schoolRegistry";
import { buildRosterImportPreview, parseRosterMatrix, parseRosterPaste } from "@/lib/school/rosterImport";
import type { RosterImportPreview, RosterImportRow } from "@/types/registry";

export type RosterActionState = {
  error?: string;
  success?: string;
  preview?: RosterImportPreview;
  rowsJson?: string;
};

function errorMessage(error: unknown) {
  if (error && typeof error === "object" && "code" in error) {
    const code = String(error.code);
    if (code === "23505") return "Kod murid, kelas atau nombor bil telah digunakan.";
  }
  return error instanceof Error ? error.message : "Tindakan tidak dapat disimpan. Cuba lagi.";
}

function refreshSchoolData() {
  updateTag("pbd-database");
  revalidatePath("/school/setup");
  revalidatePath("/pbd/interventions/entry");
  revalidatePath("/intervensi");
  revalidatePath("/dashboard");
}

async function rowsFromForm(formData: FormData) {
  const fileValue = formData.get("file");
  if (fileValue && typeof fileValue === "object" && "arrayBuffer" in fileValue && "size" in fileValue && Number(fileValue.size) > 0) {
    if (Number(fileValue.size) > 2 * 1024 * 1024) throw new Error("Fail roster mesti berukuran 2 MB atau kurang.");
    const name = "name" in fileValue ? String(fileValue.name).toLocaleLowerCase("en") : "";
    if (!name.endsWith(".xlsx") && !name.endsWith(".csv")) throw new Error("Gunakan fail .xlsx atau .csv.");
    const workbook = XLSX.read(await fileValue.arrayBuffer(), { type: "array" });
    const firstSheet = workbook.Sheets[workbook.SheetNames[0] ?? ""];
    if (!firstSheet) throw new Error("Fail tidak mempunyai helaian yang boleh dibaca.");
    return parseRosterMatrix(XLSX.utils.sheet_to_json(firstSheet, { header: 1, raw: false, defval: "" }) as unknown[][]);
  }
  const paste = String(formData.get("paste") ?? "").trim();
  const className = String(formData.get("className") ?? "").trim();
  if (!paste) throw new Error("Pilih fail atau tampal senarai nama murid.");
  if (!className) throw new Error("Pilih kelas untuk senarai yang ditampal.");
  return parseRosterPaste(paste, className);
}

export async function previewRosterImportAction(_: RosterActionState, formData: FormData): Promise<RosterActionState> {
  try {
    const context = await requireRole("school_admin", "platform_admin");
    const year = String(formData.get("year") ?? "");
    const rows = await rowsFromForm(formData);
    const [setup, registry] = await Promise.all([getDatabasePbdSetup(context, year, "1"), getSchoolRegistry(context, year)]);
    const preview = buildRosterImportPreview(rows, setup.classes, registry);
    return { preview, rowsJson: JSON.stringify(rows), success: preview.errorCount ? undefined : "Pratonton sedia. Semak sebelum mengimport." };
  } catch (error) {
    return { error: errorMessage(error) };
  }
}

export async function commitRosterImportAction(_: RosterActionState, formData: FormData): Promise<RosterActionState> {
  try {
    const context = await requireRole("school_admin", "platform_admin");
    const year = String(formData.get("year") ?? "");
    const rows = JSON.parse(String(formData.get("rowsJson") ?? "[]")) as RosterImportRow[];
    const result = await importSchoolRoster(context, year, rows);
    refreshSchoolData();
    return { success: `${result.created} murid ditambah. ${result.matched} rekod sedia ada dikekalkan.${result.warningCount ? ` ${result.warningCount} amaran diproses.` : ""}` };
  } catch (error) {
    return { error: errorMessage(error) };
  }
}

export async function addRosterStudentAction(_: RosterActionState, formData: FormData): Promise<RosterActionState> {
  try {
    const context = await requireRole("school_admin", "platform_admin");
    const year = String(formData.get("year") ?? "");
    const row: RosterImportRow = {
      rowNumber: 1,
      pupilCode: String(formData.get("pupilCode") ?? "").trim() || null,
      displayName: String(formData.get("displayName") ?? "").trim(),
      className: String(formData.get("className") ?? "").trim(),
      rosterNumber: String(formData.get("rosterNumber") ?? "").trim() ? Number(formData.get("rosterNumber")) : null,
    };
    const result = await importSchoolRoster(context, year, [row]);
    refreshSchoolData();
    return { success: result.created ? "Murid ditambah." : "Murid sudah wujud dalam kelas ini." };
  } catch (error) {
    return { error: errorMessage(error) };
  }
}

export async function updateRosterStudentAction(_: RosterActionState, formData: FormData): Promise<RosterActionState> {
  try {
    const context = await requireRole("school_admin", "platform_admin");
    await updateSchoolRosterStudent(context, Object.fromEntries(formData));
    refreshSchoolData();
    return { success: "Maklumat murid disimpan." };
  } catch (error) { return { error: errorMessage(error) }; }
}

export async function archiveRosterStudentAction(_: RosterActionState, formData: FormData): Promise<RosterActionState> {
  try {
    const context = await requireRole("school_admin", "platform_admin");
    const restore = formData.get("restore") === "true";
    await setSchoolRosterStudentArchived(context, { enrollmentId: formData.get("enrollmentId"), restore });
    refreshSchoolData();
    return { success: restore ? "Murid dipulihkan." : "Murid diarkibkan." };
  } catch (error) { return { error: errorMessage(error) }; }
}
