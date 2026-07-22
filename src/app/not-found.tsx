import Link from "next/link";

export default function NotFound() {
  return (
    <main className="mx-auto flex min-h-[60vh] max-w-2xl items-center px-4 py-12 sm:px-6">
      <section>
        <h1 className="font-display text-2xl font-bold tracking-tight text-text-primary">Halaman atau tempoh tidak ditemui</h1>
        <p className="mt-3 text-text-muted">Tempoh pentaksiran ini mungkin belum dikonfigurasi untuk sekolah anda.</p>
        <Link href="/dashboard" className="mt-6 inline-flex items-center justify-center rounded-lg border border-primary-700 bg-primary-700 px-4 py-2.5 text-sm font-semibold text-white shadow-raised transition-colors hover:bg-primary-800">Kembali ke dashboard</Link>
      </section>
    </main>
  );
}
