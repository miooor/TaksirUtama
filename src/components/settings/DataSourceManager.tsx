"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { WorkbookSourceState, WorkbookSourceType, WorkbookReadinessStatus } from "@/lib/dataSources/types";
import type { DataContractFinding } from "@/lib/readiness/dataContracts";

type DisplaySource = {
  id: string;
  year: string;
  type: WorkbookSourceType;
  state: WorkbookSourceState;
  readinessStatus: WorkbookReadinessStatus;
  schemaVersion: string | null;
  findings: DataContractFinding[];
  lastCheckedAt: string | null;
  lastSuccessfulReadAt: string | null;
  updatedBy: string;
};

const labels: Record<WorkbookReadinessStatus, string> = {
  checking: "Sedang diperiksa",
  ready: "Sedia",
  warning: "Amaran",
  fatal: "Isu fatal",
  inaccessible: "Tidak dapat diakses",
};

function sourceStatusClass(status: WorkbookReadinessStatus) {
  if (status === "ready") return "text-emerald-700";
  if (status === "warning" || status === "checking") return "text-amber-700";
  return "text-rose-700";
}

function dateLabel(value: string | null) {
  return value ? new Intl.DateTimeFormat("ms-MY", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value)) : "Belum pernah";
}

export function DataSourceManager({
  sources,
  years,
  canManage,
  databaseConfigured,
}: {
  sources: DisplaySource[];
  years: string[];
  canManage: boolean;
  databaseConfigured: boolean;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  async function request(url: string, init: RequestInit = {}) {
    setBusy(url);
    setMessage(null);
    try {
      const response = await fetch(url, { ...init, headers: { "Content-Type": "application/json", ...init.headers } });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(body.error ?? "Operasi sumber data gagal.");
      router.refresh();
      setMessage("Perubahan telah disimpan.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Operasi sumber data gagal.");
    } finally {
      setBusy(null);
    }
  }

  async function validate(formData: FormData) {
    await request("/api/settings/data-sources/validate", {
      method: "POST",
      body: JSON.stringify({
        year: String(formData.get("year") ?? ""),
        type: String(formData.get("type") ?? ""),
        googleSheetsUrl: String(formData.get("googleSheetsUrl") ?? ""),
      }),
    });
  }

  if (!databaseConfigured) {
    return (
      <section className="mt-6 rounded-lg border bg-white p-5">
        <h2 className="text-lg font-semibold">Sambungan pangkalan data diperlukan</h2>
        <p className="mt-2 text-sm text-slate-600">Konfigurasi Neon dan jalankan migrasi sebelum pautan Google Sheets boleh disimpan. Buku kerja semasa dalam SCHOOLS_CONFIG terus digunakan.</p>
      </section>
    );
  }

  return (
    <>
      {canManage ? (
        <section className="mt-6 rounded-lg border bg-white p-5">
          <h2 className="text-lg font-semibold">Sambungkan buku kerja</h2>
          <p className="mt-2 text-sm text-slate-600">Tampal pautan selepas buku kerja dikongsi sebagai Viewer dengan akaun perkhidmatan. Sumber aktif tidak berubah sehingga pengesahan baharu lulus.</p>
          <form action={validate} className="mt-5 grid gap-4 lg:grid-cols-[9rem_10rem_1fr_auto] lg:items-end">
            <label className="text-sm font-medium">
              Tahun
              <select name="year" className="mt-2 block w-full rounded-md border bg-white px-3 py-2" required>
                {years.map((year) => <option key={year}>{year}</option>)}
              </select>
            </label>
            <label className="text-sm font-medium">
              Jenis
              <select name="type" className="mt-2 block w-full rounded-md border bg-white px-3 py-2" required>
                <option value="upsa">UPSA</option>
                <option value="uasa">UASA</option>
                <option value="pbd">PBD</option>
              </select>
            </label>
            <label className="text-sm font-medium">
              Pautan Google Sheets
              <input name="googleSheetsUrl" type="url" inputMode="url" autoComplete="off" placeholder="https://docs.google.com/spreadsheets/d/…" className="mt-2 block w-full rounded-md border bg-white px-3 py-2" required />
            </label>
            <button type="submit" className="action-primary" disabled={Boolean(busy)}>{busy ? "Memeriksa…" : "Uji pautan"}</button>
          </form>
          {message ? <p className="mt-4 text-sm" role="status">{message}</p> : null}
        </section>
      ) : (
        <p className="mt-6 rounded-md bg-stone-100 px-4 py-3 text-sm">Anda boleh melihat status sambungan. Hanya School Admin boleh menukar pautan buku kerja.</p>
      )}

      <section className="mt-6">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold">Sumber yang disimpan</h2>
            <p className="mt-1 text-sm text-slate-600">Pautan penuh dan ID buku kerja tidak dipaparkan selepas disimpan.</p>
          </div>
          <p className="text-sm text-slate-500">{sources.length} sambungan</p>
        </div>
        <div className="mt-4 space-y-4">
          {sources.map((source) => {
            const fatalCount = source.findings.filter((item) => item.severity === "fatal").length;
            const warningCount = source.findings.filter((item) => item.severity === "warning").length;
            return (
            <article key={source.id} className="rounded-lg border bg-white p-5">
              <div className="grid gap-4 md:grid-cols-[1fr_1fr_auto] md:items-start">
                <div>
                  <h3 className="text-lg font-semibold">{source.type.toUpperCase()} {source.year}</h3>
                  <p className="mt-1 text-sm text-slate-600">{source.state === "active" ? "Sumber aktif" : source.state === "draft" ? "Draf menunggu aktivasi" : "Tidak aktif"}</p>
                </div>
                <dl className="grid grid-cols-2 gap-3 text-sm">
                  <div><dt className="text-slate-500">Status</dt><dd className={`mt-1 font-medium ${sourceStatusClass(source.readinessStatus)}`}>{labels[source.readinessStatus]}</dd></div>
                  <div><dt className="text-slate-500">Skema</dt><dd className="mt-1 font-medium">{source.schemaVersion ?? "-"}</dd></div>
                  <div className="col-span-2"><dt className="text-slate-500">Semakan terakhir</dt><dd className="mt-1 font-medium">{dateLabel(source.lastCheckedAt)}</dd></div>
                  <div className="col-span-2"><dt className="text-slate-500">Data berjaya dibaca</dt><dd className="mt-1 font-medium">{dateLabel(source.lastSuccessfulReadAt)}</dd></div>
                  <div><dt className="text-slate-500">Amaran</dt><dd className="mt-1 font-medium">{warningCount}</dd></div>
                  <div><dt className="text-slate-500">Fatal</dt><dd className="mt-1 font-medium">{fatalCount}</dd></div>
                  <div className="col-span-2"><dt className="text-slate-500">Dikemas kini oleh</dt><dd className="mt-1 break-all font-medium">{source.updatedBy}</dd></div>
                </dl>
                {canManage ? (
                  <div className="flex flex-wrap gap-2 text-sm md:max-w-64 md:justify-end">
                    <button type="button" className="rounded-md border px-3 py-2" disabled={Boolean(busy)} onClick={() => request(`/api/settings/data-sources/${source.id}/recheck`, { method: "POST" })}>Semak semula</button>
                    {source.state !== "active" && (source.readinessStatus === "ready" || source.readinessStatus === "warning") ? (
                      <button type="button" className="action-primary" disabled={Boolean(busy)} onClick={() => request(`/api/settings/data-sources/${source.id}/activate`, { method: "POST" })}>Aktifkan</button>
                    ) : null}
                    {source.state !== "disabled" ? (
                      <button type="button" className="rounded-md border px-3 py-2 text-rose-700" disabled={Boolean(busy)} onClick={() => {
                        if (window.confirm("Nyahaktifkan sumber data ini?")) request(`/api/settings/data-sources/${source.id}/disable`, { method: "POST" });
                      }}>Nyahaktif</button>
                    ) : null}
                  </div>
                ) : null}
              </div>
              {source.findings.length ? (
                <details className="mt-4 border-t pt-4">
                  <summary className="cursor-pointer text-sm font-medium">Lihat {source.findings.length} dapatan</summary>
                  <ul className="mt-3 space-y-3 text-sm">
                    {source.findings.map((item, index) => (
                      <li key={`${item.code}:${item.location}:${index}`}>
                        <p className="font-medium">{item.location}: {item.message}</p>
                        <p className="mt-1 text-slate-600">{item.action}</p>
                      </li>
                    ))}
                  </ul>
                </details>
              ) : null}
            </article>
            );
          })}
          {!sources.length ? <p className="rounded-lg border bg-white p-5 text-sm text-slate-600">Belum ada sumber pangkalan data. Buku kerja dalam konfigurasi pelancaran masih digunakan.</p> : null}
        </div>
      </section>
    </>
  );
}
