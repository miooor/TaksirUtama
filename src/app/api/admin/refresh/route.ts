import { revalidatePath, revalidateTag } from "next/cache";
import { NextResponse } from "next/server";
import { requireSchoolContext } from "@/lib/auth";
import { clearPublicWorkbookCache } from "@/lib/googleSheets/publicWorkbook";
import { rejectUntrustedMutation } from "@/lib/security/origin";
import { requestId, withOperationLog } from "@/lib/observability/logger";

export async function POST(request: Request) {
  const rejected = rejectUntrustedMutation(request);
  if (rejected) return rejected;
  const school = await requireSchoolContext();
  const formData = await request.formData();
  const lang = String(formData.get("lang") ?? "ms") === "en" ? "en" : "ms";

  await withOperationLog(
    { requestId: requestId(request), route: "/api/admin/refresh", operation: "refresh", schoolId: school.id },
    async () => {
      clearPublicWorkbookCache();
      revalidateTag(`school:${school.id}:workbooks`, { expire: 0 });
      revalidateTag(`school:${school.id}:pbd`, { expire: 0 });
      revalidateTag(`school:${school.id}:assessments`, { expire: 0 });
    },
  );
  revalidatePath("/dashboard");
  revalidatePath("/assessments/[year]/[assessment]/classes", "page");
  revalidatePath("/assessments/[year]/[assessment]/classes/[className]", "page");
  revalidatePath("/assessments/[year]/[assessment]/classes/[className]/slips", "page");
  revalidatePath("/assessments/[year]/[assessment]/classes/[className]/analysis", "page");
  revalidatePath("/upsa/classes");
  revalidatePath("/upsa/classes/[className]", "page");
  revalidatePath("/upsa/classes/[className]/slips", "page");
  revalidatePath("/pbd");
  revalidatePath("/pbd/periods/[year]", "page");
  revalidatePath("/pbd/periods/[year]/classes", "page");
  revalidatePath("/pbd/periods/[year]/subjects", "page");
  revalidatePath("/pbd/periods/[year]/years", "page");
  revalidatePath("/pbd/classes");
  revalidatePath("/pbd/classes/[className]", "page");
  revalidatePath("/pbd/subjects");
  revalidatePath("/pbd/subjects/[subjectCode]", "page");
  revalidatePath("/pbd/years");
  revalidatePath("/pbd/years/[year]", "page");
  revalidatePath("/intervensi");

  return NextResponse.redirect(new URL(`/dashboard?lang=${lang}&refreshed=1`, request.url), 303);
}
