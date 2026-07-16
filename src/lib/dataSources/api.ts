import { DataSourceDatabaseUnavailableError } from "@/lib/dataSources/repository";

export function dataSourceApiError(error: unknown) {
  if (error instanceof Response) return error;
  if (error instanceof DataSourceDatabaseUnavailableError) {
    return Response.json({ error: "Pangkalan data belum dikonfigurasi." }, { status: 503 });
  }
  return Response.json(
    { error: error instanceof Error ? error.message : "Operasi sumber data gagal." },
    { status: 400 },
  );
}
