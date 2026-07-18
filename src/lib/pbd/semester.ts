export type PbdSemester = "1" | "2";

export function resolvePbdSemester(requested?: string | null, configured?: string | null): PbdSemester {
  if (requested === "1" || requested === "2") return requested;
  return configured === "2" ? "2" : "1";
}

export function pbdSemesterHref(path: string, semester: PbdSemester) {
  const separator = path.includes("?") ? "&" : "?";
  return `${path}${separator}semester=${semester}`;
}

export function pbdSemesterFromRequest(request: Request) {
  return new URL(request.url).searchParams.get("semester");
}
