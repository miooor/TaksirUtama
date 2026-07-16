import Link from "next/link";

export default function NotFound() {
  return (
    <main className="mx-auto flex min-h-[60vh] max-w-2xl items-center px-4 py-12 sm:px-6">
      <section>
        <h1 className="text-2xl font-semibold">Halaman atau tempoh tidak ditemui</h1>
        <p className="mt-3 text-slate-600">Tempoh pentaksiran ini mungkin belum dikonfigurasi untuk sekolah anda.</p>
        <Link href="/dashboard" className="action-primary mt-6">Kembali ke dashboard</Link>
      </section>
    </main>
  );
}
