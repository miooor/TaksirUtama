import { redirect } from "next/navigation";

export default async function PbdSetupCompatibilityPage({ searchParams }: { searchParams: Promise<{ year?: string; semester?: string; view?: string }> }) {
  const query = await searchParams;
  const params = new URLSearchParams();
  if (query.year) params.set("year", query.year);
  if (query.semester) params.set("semester", query.semester);
  if (query.view) params.set("view", query.view);
  redirect(`/school/setup${params.size ? `?${params.toString()}` : ""}`);
}
