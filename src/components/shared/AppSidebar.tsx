"use client";

import * as Dialog from "@radix-ui/react-dialog";
import Image from "next/image";
import Link from "next/link";
import { Menu, X } from "lucide-react";
import { usePathname, useSearchParams } from "next/navigation";
import type { ReactNode } from "react";

type Props = { schoolName: string; systemName: string; logoPath: string; year: string; controls: ReactNode };

function NavLinks({ year, onNavigate }: { year: string; onNavigate?: () => void }) {
  const pathname = usePathname();
  const query = useSearchParams();
  const selectedYear = query.get("year") ?? year;
  const selectedSemester = query.get("semester") === "2" ? "2" : "1";
  const groups = [
    [{ label: "Dashboard", href: `/dashboard?year=${selectedYear}&semester=${selectedSemester}`, active: pathname === "/dashboard" }],
    [{ label: "UPSA", href: `/assessments/${selectedYear}/upsa/classes`, active: pathname.includes("/upsa") || pathname.startsWith("/upsa") }, { label: "UASA", href: `/assessments/${selectedYear}/uasa/classes`, active: pathname.includes("/uasa") || pathname.startsWith("/uasa") }],
    [{ label: "Isi Rumusan TP", href: `/pbd/entry?year=${selectedYear}&semester=${selectedSemester}`, active: pathname === "/pbd/entry" }, { label: "Setup PBD", href: `/pbd/setup?year=${selectedYear}&semester=${selectedSemester}`, active: pathname === "/pbd/setup" }, { label: "Analisis PBD", href: `/pbd/periods/${selectedYear}`, active: pathname.startsWith("/pbd/periods") }],
    [{ label: "Dialog Prestasi", href: `/dialog-prestasi?year=${selectedYear}`, active: pathname.startsWith("/dialog-prestasi") }, { label: "Intervensi", href: "/intervensi", active: pathname.startsWith("/intervensi") }, { label: "Dapatan", href: "/insights", active: pathname.startsWith("/insights") }],
  ];
  return <nav aria-label="Navigasi utama" className="space-y-4">{groups.map((group, index) => <div key={index} className="space-y-1">{group.map((item) => <Link key={item.href} href={item.href} onClick={onNavigate} className={`block rounded-md px-3 py-2 text-sm ${item.active ? "font-semibold text-teal-900" : "text-slate-600 hover:bg-stone-100 hover:text-slate-950"}`}>{item.label}</Link>)}</div>)}</nav>;
}

function Identity({ schoolName, systemName, logoPath }: Omit<Props, "year" | "controls">) {
  return <Link href="/dashboard" className="flex min-w-0 items-start gap-3"><Image src={logoPath} alt="" width={40} height={40} className="mt-0.5 h-10 w-10 shrink-0 object-contain" /><div className="min-w-0"><p className="break-words text-sm font-medium leading-5 text-slate-700">{schoolName}</p><p className="mt-0.5 break-words text-base font-semibold leading-5 text-slate-950">{systemName}</p></div></Link>;
}

function SidebarContents({ schoolName, systemName, logoPath, year, controls, onNavigate }: Props & { onNavigate?: () => void }) {
  return <div className="flex h-full min-h-0 flex-col"><Identity schoolName={schoolName} systemName={systemName} logoPath={logoPath} /><div className="mt-8 min-h-0 flex-1 overflow-y-auto"><NavLinks year={year} onNavigate={onNavigate} /></div><div className="mt-6 space-y-2 border-t border-stone-200 pt-4">{controls}</div></div>;
}

export function AppSidebar(props: Props) {
  return <>
    <aside className="sticky top-0 hidden h-screen shrink-0 border-r border-stone-200 bg-stone-50 p-5 lg:block lg:w-52 xl:w-60"><SidebarContents {...props} /></aside>
    <div className="sticky top-0 z-30 flex min-w-0 items-center justify-between border-b border-stone-200 bg-stone-50 px-4 py-3 lg:hidden"><Identity schoolName={props.schoolName} systemName={props.systemName} logoPath={props.logoPath} /><Dialog.Root><Dialog.Trigger asChild><button type="button" className="ml-3 shrink-0 rounded-md border border-stone-300 p-2 text-slate-800" aria-label="Buka navigasi"><Menu className="h-5 w-5" /></button></Dialog.Trigger><Dialog.Portal><Dialog.Overlay className="fixed inset-0 z-40 bg-slate-950/25" /><Dialog.Content className="fixed inset-y-0 left-0 z-50 w-[min(22rem,calc(100vw-2rem))] bg-stone-50 p-5 outline-none"><div className="flex h-full min-h-0 flex-col"><div className="flex items-start justify-between gap-3"><Dialog.Title className="sr-only">Navigasi</Dialog.Title><Identity schoolName={props.schoolName} systemName={props.systemName} logoPath={props.logoPath} /><Dialog.Close asChild><button type="button" className="shrink-0 rounded-md border border-stone-300 p-2 text-slate-800" aria-label="Tutup navigasi"><X className="h-5 w-5" /></button></Dialog.Close></div><div className="mt-6 min-h-0 flex-1 overflow-y-auto"><NavLinks year={props.year} onNavigate={() => document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }))} /></div><div className="mt-6 space-y-2 border-t border-stone-200 pt-4">{props.controls}</div></div></Dialog.Content></Dialog.Portal></Dialog.Root></div>
  </>;
}
