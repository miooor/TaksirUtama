import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  currentRole: "teacher" as "school_admin" | "teacher" | "viewer" | "platform_admin",
  schoolId: "school-a",
}));

vi.mock("@/lib/auth/actor", () => ({
  requireRole: vi.fn(async (...roles: Array<"school_admin" | "teacher" | "viewer" | "platform_admin">) => {
    if (!roles.includes(mocks.currentRole)) throw new Response("Forbidden", { status: 403 });
    return {
      school: { id: mocks.schoolId },
      actor: { id: "user-1", role: mocks.currentRole, provider: "clerk" },
    };
  }),
}));

vi.mock("@/lib/observability/logger", () => ({ logEvent: vi.fn() }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn(), updateTag: vi.fn() }));

vi.mock("@/lib/db/pbd", () => ({
  assignDatabasePbdSubject: vi.fn(async () => ({})),
  createDatabasePbdClass: vi.fn(async () => ({})),
  createDatabasePbdSubject: vi.fn(async () => ({})),
  deleteDatabasePbdSetup: vi.fn(async () => ({})),
  saveDatabasePbdEntry: vi.fn(async () => ({})),
  saveDatabasePbdClassEntries: vi.fn(async () => [{ classSubjectId: "cs-1", entryId: "e-1", revision: 1, status: "draft", enrolledCount: 30, changed: true }]),
  saveDatabasePbdSubjectEntries: vi.fn(async () => [{ classSubjectId: "cs-1", entryId: "e-1", revision: 1, status: "draft", enrolledCount: 30, changed: true }]),
  setDatabasePbdSetupArchived: vi.fn(async () => ({})),
  updateDatabasePbdClassEnrollment: vi.fn(async () => ({})),
}));

import {
  archivePbdSetupAction,
  assignPbdSubjectAction,
  createPbdClassAction,
  createPbdSubjectAction,
  deletePbdSetupAction,
  savePbdClassEntriesAction,
  savePbdSubjectEntriesAction,
  updatePbdClassEnrollmentAction,
} from "@/app/pbd/entry/actions";
import { saveDatabasePbdClassEntries, saveDatabasePbdSubjectEntries } from "@/lib/db/pbd";

function bulkFormData(kind: "class" | "subject") {
  const formData = new FormData();
  formData.set(kind === "class" ? "classId" : "subjectId", "target-1");
  formData.set("year", "2026");
  formData.set("semester", "1");
  formData.set("intent", "save");
  formData.append("classSubjectId", "cs-1");
  formData.set("revision:cs-1", "0");
  formData.set("tp1:cs-1", "2");
  formData.set("tp2:cs-1", "3");
  formData.set("tp3:cs-1", "5");
  formData.set("tp4:cs-1", "10");
  formData.set("tp5:cs-1", "0");
  formData.set("tp6:cs-1", "0");
  formData.set("notAssessed:cs-1", "0");
  return formData;
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.currentRole = "teacher";
  mocks.schoolId = "school-a";
});

describe("PBD entry action authorization", () => {
  it("permits teachers to run the bulk subject save", async () => {
    const result = await savePbdSubjectEntriesAction({}, bulkFormData("subject"));
    expect(result.success).toBeTruthy();
    expect(result.error).toBeUndefined();
    expect(saveDatabasePbdSubjectEntries).toHaveBeenCalledTimes(1);
  });

  it("permits teachers to run the bulk class save", async () => {
    const result = await savePbdClassEntriesAction({}, bulkFormData("class"));
    expect(result.success).toBeTruthy();
    expect(result.error).toBeUndefined();
    expect(saveDatabasePbdClassEntries).toHaveBeenCalledTimes(1);
  });

  it("derives the tenant from the authenticated actor, never from form data", async () => {
    mocks.schoolId = "school-b";
    const formData = bulkFormData("class");
    formData.set("schoolId", "school-evil");
    await savePbdClassEntriesAction({}, formData);
    const [context, input] = vi.mocked(saveDatabasePbdClassEntries).mock.calls[0];
    expect(context.school.id).toBe("school-b");
    expect(input).toMatchObject({ classId: "target-1", year: "2026", semester: "1" });
    expect(JSON.stringify(input)).not.toContain("school-evil");
  });

  it("denies teachers access to setup, enrolment, archiving and deletion actions", async () => {
    const adminOnly: Array<[string, (formData: FormData) => Promise<{ error?: string; success?: string }>, FormData]> = [
      ["createPbdClassAction", (formData) => createPbdClassAction({}, formData), new FormData()],
      ["createPbdSubjectAction", (formData) => createPbdSubjectAction({}, formData), new FormData()],
      ["assignPbdSubjectAction", (formData) => assignPbdSubjectAction({}, formData), new FormData()],
      ["updatePbdClassEnrollmentAction", (formData) => updatePbdClassEnrollmentAction({}, formData), new FormData()],
      ["archivePbdSetupAction", (formData) => archivePbdSetupAction({}, formData), new FormData()],
      ["deletePbdSetupAction", (formData) => deletePbdSetupAction({}, formData), new FormData()],
    ];
    for (const [name, action, formData] of adminOnly) {
      const result = await action(formData);
      expect(result.error, `${name} should deny the teacher role`).toBeTruthy();
      expect(result.success, `${name} should not succeed for teachers`).toBeUndefined();
    }
  });

  it("still permits school administrators to run setup actions", async () => {
    mocks.currentRole = "school_admin";
    const result = await createPbdClassAction({}, new FormData());
    expect(result.success).toBe("Kelas ditambah.");
  });

  it("surfaces stale-revision conflicts from the database as recoverable feedback", async () => {
    vi.mocked(saveDatabasePbdSubjectEntries).mockRejectedValueOnce(
      Object.assign(new Error("Rekod telah dikemas kini. Muat semula sebelum menyimpan."), { code: "P0001" }),
    );
    const result = await savePbdSubjectEntriesAction({}, bulkFormData("subject"));
    expect(result.error).toBe("Rekod telah dikemas kini. Muat semula sebelum menyimpan.");
    expect(result.success).toBeUndefined();
  });

  it("keeps finalized records immutable until reopened with actionable guidance", async () => {
    vi.mocked(saveDatabasePbdClassEntries).mockRejectedValueOnce(
      Object.assign(new Error("Buka semula rekod muktamad sebelum mengubahnya."), { code: "P0001" }),
    );
    const result = await savePbdClassEntriesAction({}, bulkFormData("class"));
    expect(result.error).toBe("Buka semula rekod muktamad sebelum mengubahnya.");
    expect(result.success).toBeUndefined();
  });

  it("falls back to the generic recoverable message for other database codes", async () => {
    vi.mocked(saveDatabasePbdClassEntries).mockRejectedValueOnce(
      Object.assign(new Error("check constraint violated"), { code: "23514" }),
    );
    const result = await savePbdClassEntriesAction({}, bulkFormData("class"));
    expect(result.error).toBe("Data tidak dapat disimpan. Semak maklumat kelas dan cuba semula.");
  });
});
