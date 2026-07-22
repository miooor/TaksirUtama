"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback } from "react";

type Props = {
  year: string;
  years: string[];
  level: string | null;
  classId: string | null;
  subject: string | null;
  classes: Array<{ name: string; level: number }>;
  subjects: string[];
};

export function ProgressFilters({ year, years, level, classId, subject, classes, subjects }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const updateParams = useCallback(
    (updates: Record<string, string | null>) => {
      const params = new URLSearchParams(searchParams.toString());
      for (const [key, value] of Object.entries(updates)) {
        if (value === null || value === "") {
          params.delete(key);
        } else {
          params.set(key, value);
        }
      }
      router.push(`/progress?${params.toString()}`);
    },
    [router, searchParams],
  );

  return (
    <div className="flex min-w-0 flex-wrap items-end gap-3" role="search" aria-label="Tapis kemajuan">
      <label className="flex flex-col gap-1 text-sm">
        <span className="font-medium text-text-secondary">Tahun</span>
        <select
          value={year}
          onChange={(e) => updateParams({ year: e.target.value, level: null, classId: null, subject: null })}
          className="rounded-lg border border-border-default bg-surface-card px-3 py-2 text-sm text-text-primary shadow-raised"
        >
          {years.map((y) => (
            <option key={y} value={y}>{y}</option>
          ))}
        </select>
      </label>

      <label className="flex flex-col gap-1 text-sm">
        <span className="font-medium text-text-secondary">Tingkat</span>
        <select
          value={level ?? ""}
          onChange={(e) => updateParams({ level: e.target.value || null, classId: null, subject: null })}
          className="rounded-lg border border-border-default bg-surface-card px-3 py-2 text-sm text-text-primary shadow-raised"
        >
          <option value="">Semua</option>
          {[1, 2, 3, 4, 5, 6].map((l) => (
            <option key={l} value={String(l)}>Tahun {l}</option>
          ))}
        </select>
      </label>

      <label className="flex flex-col gap-1 text-sm">
        <span className="font-medium text-text-secondary">Kelas</span>
        <select
          value={classId ?? ""}
          onChange={(e) => updateParams({ classId: e.target.value || null, subject: null })}
          className="rounded-lg border border-border-default bg-surface-card px-3 py-2 text-sm text-text-primary shadow-raised"
        >
          <option value="">Semua</option>
          {classes.map((c) => (
            <option key={c.name} value={c.name}>{c.name}</option>
          ))}
        </select>
      </label>

      <label className="flex flex-col gap-1 text-sm">
        <span className="font-medium text-text-secondary">Subjek</span>
        <select
          value={subject ?? ""}
          onChange={(e) => updateParams({ subject: e.target.value || null })}
          className="rounded-lg border border-border-default bg-surface-card px-3 py-2 text-sm text-text-primary shadow-raised"
        >
          <option value="">Semua</option>
          {subjects.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
      </label>

      {(level || classId || subject) ? (
        <button
          type="button"
          onClick={() => updateParams({ level: null, classId: null, subject: null })}
          className="rounded-lg border border-border-strong bg-surface-card px-3 py-2 text-sm text-text-secondary transition-colors hover:bg-surface-inset"
        >
          Reset
        </button>
      ) : null}
    </div>
  );
}
