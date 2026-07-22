"use server";

import { revalidatePath, updateTag } from "next/cache";
import { requireRole } from "@/lib/auth/actor";
import {
  finalizeAssessmentEntry,
  reopenAssessmentEntry,
  saveAssessmentMarks,
  type StudentMark,
} from "@/lib/db/assessmentEntry";

export type AssessmentEntryActionState = {
  error?: string;
  success?: string;
  revision?: number;
  status?: "draft" | "final";
  changedCount?: number;
  savedAt?: string;
};

function message(error: unknown) {
  return error instanceof Error ? error.message : "Tindakan tidak dapat disimpan. Cuba lagi.";
}

function refresh(year: string, assessment: string) {
  updateTag("assessment-entry");
  revalidatePath(`/assessments/${year}/${assessment}/entry`);
  revalidatePath(`/assessments/${year}/${assessment}/classes`);
  revalidatePath("/dashboard");
  revalidatePath("/readiness");
}

export async function saveAssessmentMarksAction(
  _: AssessmentEntryActionState,
  formData: FormData,
): Promise<AssessmentEntryActionState> {
  try {
    const context = await requireRole("school_admin", "platform_admin");
    const year = String(formData.get("year") ?? "");
    const assessmentType = formData.get("assessmentType") === "uasa" ? "uasa" : "upsa";
    const classId = String(formData.get("classId") ?? "");
    const subjectId = String(formData.get("subjectId") ?? "");
    const expectedRevision = Number(formData.get("expectedRevision") ?? 0);

    // Parse marks from form data
    const enrollmentIds = formData.getAll("enrollmentId").map(String);
    const marks: StudentMark[] = enrollmentIds.map((enrollmentId) => {
      const studentId = String(formData.get(`studentId:${enrollmentId}`) ?? "");
      const absent = formData.get(`absent:${enrollmentId}`) === "true";
      const rawMark = formData.get(`mark:${enrollmentId}`);
      const mark = rawMark !== null && rawMark !== "" ? Number(rawMark) : null;
      return {
        enrollmentId,
        studentId,
        mark: absent ? null : mark,
        status: absent ? "absent" : mark !== null ? "marked" : "missing",
      };
    });

    const result = await saveAssessmentMarks(context, {
      year,
      assessmentType,
      classId,
      subjectId,
      expectedRevision,
      marks,
    });
    refresh(year, assessmentType);
    return {
      success: "Draf disimpan.",
      revision: result.revision,
      status: result.status,
      changedCount: result.changedCount,
      savedAt: new Date().toLocaleTimeString("ms-MY", { hour: "2-digit", minute: "2-digit" }),
    };
  } catch (error) {
    return { error: message(error) };
  }
}

export async function finalizeAssessmentEntryAction(
  _: AssessmentEntryActionState,
  formData: FormData,
): Promise<AssessmentEntryActionState> {
  try {
    const context = await requireRole("school_admin", "platform_admin");
    const year = String(formData.get("year") ?? "");
    const assessmentType = formData.get("assessmentType") === "uasa" ? "uasa" : "upsa";
    const classId = String(formData.get("classId") ?? "");
    const subjectId = String(formData.get("subjectId") ?? "");
    const expectedRevision = Number(formData.get("expectedRevision") ?? 0);

    const result = await finalizeAssessmentEntry(context, {
      year,
      assessmentType,
      classId,
      subjectId,
      expectedRevision,
    });
    refresh(year, assessmentType);
    return { success: "Rekod telah dimuktamadkan.", revision: result.revision, status: result.status };
  } catch (error) {
    return { error: message(error) };
  }
}

export async function reopenAssessmentEntryAction(
  _: AssessmentEntryActionState,
  formData: FormData,
): Promise<AssessmentEntryActionState> {
  try {
    const context = await requireRole("school_admin", "platform_admin");
    const year = String(formData.get("year") ?? "");
    const assessmentType = formData.get("assessmentType") === "uasa" ? "uasa" : "upsa";
    const classId = String(formData.get("classId") ?? "");
    const subjectId = String(formData.get("subjectId") ?? "");
    const expectedRevision = Number(formData.get("expectedRevision") ?? 0);

    const result = await reopenAssessmentEntry(context, {
      year,
      assessmentType,
      classId,
      subjectId,
      expectedRevision,
    });
    refresh(year, assessmentType);
    return { success: "Rekod dibuka semula untuk pengeditan.", revision: result.revision, status: result.status };
  } catch (error) {
    return { error: message(error) };
  }
}
