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
        <form action="/api/auth/login" method="post" className="w-full rounded-lg border bg-white p-6">
          <p className="text-sm text-slate-500">Portal analisis sekolah</p>
          <h1 className="mt-1 text-2xl font-semibold">Masuk ke sistem</h1>
          <input type="hidden" name="next" value={next} />
          <label className="mt-6 block text-sm font-medium" htmlFor="schoolCode">Kod sekolah</label>
          <input
            id="schoolCode"
            name="schoolCode"
            autoComplete="organization"
            required
            autoFocus
            className="mt-2 w-full rounded-md border bg-white px-3 py-2 uppercase"
          />
          <label className="mt-4 block text-sm font-medium" htmlFor="password">Kata laluan</label>
          <input
            id="password"
            name="password"
            type="password"
            autoComplete="current-password"
            required
            className="mt-2 w-full rounded-md border bg-white px-3 py-2"
          />
          {error ? <p className="mt-3 text-sm text-red-700" role="alert">Kod sekolah atau kata laluan tidak sah.</p> : null}
          <button className="action-primary mt-5 w-full">Masuk</button>
        </form>
      </div>
    </AppShell>
  );
}
