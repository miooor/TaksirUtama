export default function OfflinePage() {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-2xl items-center px-6 py-16">
      <section aria-labelledby="offline-title">
        <p className="text-sm font-semibold text-primary-600">Analisa Kurikulum</p>
        <h1 id="offline-title" className="mt-3 font-display text-3xl font-bold tracking-tight text-text-primary">
          Tiada sambungan internet
        </h1>
        <p className="mt-4 max-w-xl text-base leading-7 text-text-muted">
          Data pentaksiran tidak disimpan untuk penggunaan luar talian. Sambungkan semula peranti ini untuk memuatkan maklumat sekolah yang terkini.
        </p>
        <a href="/dashboard" className="mt-7 inline-flex items-center justify-center rounded-lg border border-primary-700 bg-primary-700 px-4 py-2.5 text-sm font-semibold text-white shadow-raised transition-colors hover:bg-primary-800">
          Cuba semula
        </a>
      </section>
    </main>
  );
}
