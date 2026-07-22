"use client";

import Link from "next/link";
import { useEffect } from "react";

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    import("@sentry/nextjs").then((Sentry) => Sentry.captureException(error));
  }, [error]);

  const isAuthError = error.message?.includes("sekolah") || error.message?.includes("school") || error.message?.includes("context");
  const isDbError = error.message?.includes("DATABASE") || error.message?.includes("pangkalan");

  return (
    <main className="mx-auto flex min-h-[60vh] max-w-2xl items-center px-4 py-12 sm:px-6">
      <section>
        <h1 className="font-display text-2xl font-bold tracking-tight text-text-primary">Halaman ini tidak dapat dimuatkan</h1>
        <p className="mt-3 text-text-muted">
          {isAuthError
            ? "Sesi sekolah tidak sah atau telah tamat tempoh. Sila log masuk semula."
            : isDbError
              ? "Pangkalan data tidak dapat dihubungi. Cuba semula atau hubungi pentadbir."
              : "Data sekolah anda tidak diubah. Cuba semula atau hubungi pentadbir jika masalah berterusan."}
        </p>
        <div className="mt-6 flex items-center gap-3">
          <button type="button" onClick={reset} className="inline-flex items-center justify-center rounded-lg border border-primary-700 bg-primary-700 px-4 py-2.5 text-sm font-semibold text-white shadow-raised transition-colors hover:bg-primary-800">Cuba semula</button>
          {isAuthError && <Link href="/login" className="inline-flex items-center justify-center rounded-lg border border-border-strong bg-surface-card px-4 py-2.5 text-sm font-medium text-text-secondary transition-colors hover:bg-surface-inset">Log masuk semula</Link>}
          <Link href="/dashboard" className="text-sm font-semibold text-text-muted transition-colors hover:text-text-primary">Kembali ke dashboard</Link>
        </div>
      </section>
    </main>
  );
}
