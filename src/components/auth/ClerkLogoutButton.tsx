"use client";

import { SignOutButton } from "@clerk/nextjs";

export function ClerkLogoutButton({ label }: { label: string }) {
  return (
    <SignOutButton redirectUrl="/login">
      <button type="button" className="rounded-md border px-3 py-1.5">{label}</button>
    </SignOutButton>
  );
}
