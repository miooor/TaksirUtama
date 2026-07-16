export function ExportMeta() {
  const generatedAt = new Intl.DateTimeFormat("ms-MY", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Kuala_Lumpur",
  }).format(new Date());

  return <p className="text-xs text-slate-500">Terakhir dijana: {generatedAt}</p>;
}
