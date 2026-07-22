import { AppShell } from "@/components/shared/AppShell";
import { SignIn } from "@clerk/nextjs";
import { hasClerk } from "@/lib/config/env";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; error?: string }>;
}) {
  const { next = "/dashboard", error } = await searchParams;
  if (hasClerk) {
    return (
      <AppShell chrome={false}>
        <div className="mx-auto flex min-h-[70vh] max-w-md items-center justify-center">
          <SignIn routing="hash" forceRedirectUrl={next.startsWith("/") ? next : "/dashboard"} />
        </div>
      </AppShell>
    );
  }
  return (
    <AppShell chrome={false}>
      <div className="mx-auto flex min-h-[70vh] max-w-md items-center">
        <form action="/api/auth/login" method="post" className="w-full rounded-xl border border-border-default bg-surface-card p-6 shadow-card">
          <p className="text-xs font-semibold uppercase tracking-wider text-primary-600">Portal analisis sekolah</p>
          <h1 className="mt-1 font-display text-2xl font-bold tracking-tight text-text-primary">Masuk ke sistem</h1>
          <input type="hidden" name="next" value={next} />
          <label className="mt-6 block text-sm font-medium text-text-secondary" htmlFor="schoolCode">Kod sekolah</label>
          <input
            id="schoolCode"
            name="schoolCode"
            autoComplete="organization"
            required
            autoFocus
            className="mt-2 w-full rounded-lg border border-border-strong bg-surface-card px-3 py-2 text-sm text-text-primary uppercase shadow-raised transition-[border-color,box-shadow] focus:border-border-focus focus:outline-none focus:ring-2 focus:ring-primary-500/20"
          />
          <label className="mt-4 block text-sm font-medium text-text-secondary" htmlFor="password">Kata laluan</label>
          <input
            id="password"
            name="password"
            type="password"
            autoComplete="current-password"
            required
            className="mt-2 w-full rounded-lg border border-border-strong bg-surface-card px-3 py-2 text-sm text-text-primary shadow-raised transition-[border-color,box-shadow] focus:border-border-focus focus:outline-none focus:ring-2 focus:ring-primary-500/20"
          />
          {error ? <p className="mt-3 text-sm font-medium text-danger-text" role="alert">Kod sekolah atau kata laluan tidak sah.</p> : null}
          <button className="mt-5 inline-flex w-full items-center justify-center rounded-lg border border-primary-700 bg-primary-700 px-4 py-2.5 text-sm font-semibold text-white shadow-raised transition-colors hover:bg-primary-800">Masuk</button>
        </form>
      </div>
    </AppShell>
  );
}
