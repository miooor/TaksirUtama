"use client";

import { useState } from "react";
import { X } from "lucide-react";

export function UasaIncompletePopup({
  title,
  message,
  note,
  closeLabel,
}: {
  title: string;
  message: string;
  note: string;
  closeLabel: string;
}) {
  const [open, setOpen] = useState(true);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 px-4">
      <section role="dialog" aria-modal="true" aria-labelledby="uasa-incomplete-title" className="w-full max-w-lg rounded-lg border bg-white p-5 shadow-xl">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm font-medium text-amber-700">UASA 2026</p>
            <h2 id="uasa-incomplete-title" className="mt-1 text-lg font-semibold">{title}</h2>
          </div>
          <button type="button" onClick={() => setOpen(false)} className="rounded-md border p-2 text-slate-500 hover:bg-slate-50" aria-label={closeLabel}>
            <X className="h-4 w-4" />
          </button>
        </div>
        <p className="mt-4 text-sm leading-6 text-slate-700">{message}</p>
        <p className="mt-3 rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-900">{note}</p>
        <button type="button" onClick={() => setOpen(false)} className="action-primary mt-5 w-full justify-center">
          {closeLabel}
        </button>
      </section>
    </div>
  );
}
