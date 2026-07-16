export function IssueBadge({ issues }: { issues: string[] }) {
  if (!issues.length) {
    return <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700">Lengkap</span>;
  }
  const severe = issues.some((issue) => issue.includes("belum diisi"));
  return (
    <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${severe ? "bg-amber-50 text-amber-700" : "bg-rose-50 text-rose-700"}`}>
      {severe ? "Belum lengkap" : "Semak data"}
    </span>
  );
}
