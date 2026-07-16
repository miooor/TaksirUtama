"use client";

import { useEffect } from "react";

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    import("@sentry/nextjs").then((Sentry) => Sentry.captureException(error));
  }, [error]);

  return (
    <main className="mx-auto flex min-h-[60vh] max-w-2xl items-center px-4 py-12 sm:px-6">
      <section>
        <h1 className="text-2xl font-semibold">Halaman ini tidak dapat dimuatkan</h1>
        <p className="mt-3 text-slate-600">Data sekolah anda tidak diubah. Cuba semula atau hubungi pentadbir jika masalah berterusan.</p>
        <button type="button" onClick={reset} className="action-primary mt-6">Cuba semula</button>
      </section>
    </main>
  );
}
