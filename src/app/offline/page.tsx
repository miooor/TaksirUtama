export default function OfflinePage() {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-2xl items-center px-6 py-16">
      <section aria-labelledby="offline-title">
        <p className="text-sm font-medium text-teal-800">Analisa Kurikulum</p>
        <h1 id="offline-title" className="mt-3 text-3xl font-semibold tracking-tight">
          Tiada sambungan internet
        </h1>
        <p className="mt-4 max-w-xl text-base leading-7 text-slate-600">
          Data pentaksiran tidak disimpan untuk penggunaan luar talian. Sambungkan semula peranti ini untuk memuatkan maklumat sekolah yang terkini.
        </p>
        <a href="/dashboard" className="action-primary mt-7">
          Cuba semula
        </a>
      </section>
    </main>
  );
}
