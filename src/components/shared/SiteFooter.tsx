import Image from "next/image";
import type { SchoolPublicProfile } from "@/lib/config/schools";

export function SiteFooter({ school }: { school: SchoolPublicProfile }) {
  return (
    <footer className="mx-auto mt-8 flex max-w-7xl flex-wrap items-center gap-2 border-t border-border-default px-4 py-5 text-sm text-text-secondary sm:px-6 lg:px-8">
      <Image src={school.logoPath} alt="" width={20} height={20} className="h-5 w-5 object-contain" />
      <span>{school.name}. Dibina oleh guru untuk guru.</span>
      <span aria-label="Malaysia">🇲🇾</span>
    </footer>
  );
}
