"use client";

import { SignOutButton } from "@clerk/nextjs";

export function ClerkLogoutButton({ label }: { label: string }) {
  return (
    <SignOutButton redirectUrl="/login">
      <button type="button" className="w-full rounded-lg border border-border-default px-3 py-1.5 text-left text-sm text-text-secondary transition-colors hover:bg-surface-inset hover:text-text-primary">{label}</button>
    </SignOutButton>
  );
}
