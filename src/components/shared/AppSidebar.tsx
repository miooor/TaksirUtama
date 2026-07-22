"use client";

import * as Dialog from "@radix-ui/react-dialog";
import Image from "next/image";
import Link from "next/link";
import {
  BarChart3,
  ClipboardList,
  HeartHandshake,
  LayoutDashboard,
  Lightbulb,
  Menu,
  PanelLeftClose,
  PanelLeftOpen,
  PenLine,
  PieChart,
  Presentation,
  Settings2,
  TrendingUp,
  Users,
  X,
  type LucideIcon,
} from "lucide-react";
import { usePathname, useSearchParams } from "next/navigation";
import { useState, type ReactNode } from "react";

type Props = { schoolName: string; systemName: string; logoPath: string; year: string; controls: ReactNode; canManageSetup: boolean };

type NavItem = { label: string; href: string; icon: LucideIcon; active: boolean };
type NavGroup = { title: string | null; items: NavItem[] };

function buildNavGroups(year: string, semester: string, pathname: string, canManageSetup: boolean): NavGroup[] {
  return [
    {
      title: null,
      items: [
        { label: "Dashboard", href: `/dashboard?year=${year}&semester=${semester}`, icon: LayoutDashboard, active: pathname === "/dashboard" },
      ],
    },
    {
      title: "Pengisian",
      items: [
        { label: "Isi Markah UPSA", href: `/assessments/${year}/upsa/entry`, icon: PenLine, active: pathname.includes("/upsa/entry") },
        { label: "Isi Markah UASA", href: `/assessments/${year}/uasa/entry`, icon: PenLine, active: pathname.includes("/uasa/entry") },
        { label: "Isi Rumusan TP", href: `/pbd/entry?year=${year}&semester=${semester}`, icon: ClipboardList, active: pathname === "/pbd/entry" },
        { label: "Isi Intervensi", href: `/pbd/interventions/entry?year=${year}&semester=${semester}`, icon: HeartHandshake, active: pathname === "/pbd/interventions/entry" },
      ],
    },
    {
      title: "Analisis",
      items: [
        { label: "Analisis UPSA", href: `/assessments/${year}/upsa/classes`, icon: BarChart3, active: pathname.includes("/upsa/classes") },
        { label: "Analisis UASA", href: `/assessments/${year}/uasa/classes`, icon: TrendingUp, active: pathname.includes("/uasa/classes") },
        { label: "Analisis PBD", href: `/pbd/periods/${year}?semester=${semester}`, icon: PieChart, active: pathname.startsWith("/pbd/periods") },
        { label: "Kemajuan", href: `/progress?year=${year}`, icon: TrendingUp, active: pathname.startsWith("/progress") },
      ],
    },
    {
      title: "Laporan",
      items: [
        { label: "Dialog Prestasi", href: `/dialog-prestasi?year=${year}&semester=${semester}`, icon: Presentation, active: pathname.startsWith("/dialog-prestasi") },
        { label: "Intervensi", href: `/intervensi?year=${year}&semester=${semester}`, icon: Users, active: pathname.startsWith("/intervensi") },
        { label: "Dapatan", href: `/insights?year=${year}&semester=${semester}`, icon: Lightbulb, active: pathname.startsWith("/insights") },
      ],
    },
    ...(canManageSetup ? [{
      title: "Tadbir",
      items: [
        { label: "Setup Sekolah", href: `/school/setup?year=${year}&semester=${semester}`, icon: Settings2, active: pathname.startsWith("/school/setup") || pathname === "/pbd/setup" },
      ],
    }] : []),
  ];
}

function Identity({ schoolName, systemName, logoPath, year, collapsed }: Omit<Props, "controls" | "canManageSetup"> & { collapsed?: boolean }) {
  const query = useSearchParams();
  const selectedYear = query.get("year") ?? year;
  const semester = query.get("semester") === "2" ? "2" : "1";
  return (
    <Link href={`/dashboard?year=${selectedYear}&semester=${semester}`} className="flex min-w-0 items-center gap-3 rounded-lg px-2 py-2 transition-colors hover:bg-surface-inset">
      <Image src={logoPath} alt="" width={36} height={36} className="h-9 w-9 shrink-0 rounded-md object-contain" />
      {!collapsed && (
        <div className="min-w-0">
          <p className="truncate font-display text-sm font-semibold leading-5 text-text-primary">{systemName}</p>
          <p className="truncate text-xs leading-4 text-text-muted">{schoolName}</p>
        </div>
      )}
    </Link>
  );
}

function SidebarNav({ year, collapsed, onNavigate, canManageSetup }: { year: string; collapsed?: boolean; onNavigate?: () => void; canManageSetup: boolean }) {
  const pathname = usePathname();
  const query = useSearchParams();
  const selectedYear = query.get("year") ?? year;
  const semester = query.get("semester") === "2" ? "2" : "1";
  const groups = buildNavGroups(selectedYear, semester, pathname, canManageSetup);

  return (
    <nav aria-label="Navigasi utama" className="space-y-5">
      {groups.map((group, index) => (
        <div key={index}>
          {group.title && !collapsed && (
            <p className="mb-1.5 px-3 text-[11px] font-semibold uppercase tracking-wider text-text-muted">{group.title}</p>
          )}
          {group.title && collapsed && index > 0 && <div className="mx-3 mb-2 border-t border-border-default" />}
          <div className="space-y-0.5">
            {group.items.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={onNavigate}
                title={collapsed ? item.label : undefined}
                aria-current={item.active ? "page" : undefined}
                className={`group relative flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors ${
                  collapsed ? "justify-center px-2" : ""
                } ${
                  item.active
                    ? "bg-primary-50 font-semibold text-primary-700"
                    : "text-text-secondary hover:bg-surface-inset hover:text-text-primary"
                }`}
              >
                {item.active && <span className="absolute inset-y-1.5 left-0 w-[3px] rounded-full bg-primary-600" aria-hidden="true" />}
                <item.icon className={`h-[18px] w-[18px] shrink-0 ${item.active ? "text-primary-600" : "text-text-muted group-hover:text-text-secondary"}`} />
                {!collapsed && <span className="truncate">{item.label}</span>}
              </Link>
            ))}
          </div>
        </div>
      ))}
    </nav>
  );
}

function SidebarContents({ schoolName, systemName, logoPath, year, controls, canManageSetup, collapsed, onToggle, onNavigate }: Props & { collapsed: boolean; onToggle: () => void; onNavigate?: () => void }) {
  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex items-center justify-between gap-2 pr-1">
        <div className="min-w-0 flex-1"><Identity schoolName={schoolName} systemName={systemName} logoPath={logoPath} year={year} collapsed={collapsed} /></div>
        <button
          type="button"
          onClick={onToggle}
          className="hidden shrink-0 rounded-md p-1.5 text-text-muted transition-colors hover:bg-surface-inset hover:text-text-primary lg:block"
          aria-label={collapsed ? "Kembangkan navigasi" : "Kecilkan navigasi"}
        >
          {collapsed ? <PanelLeftOpen className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}
        </button>
      </div>
      <div className="mt-6 min-h-0 flex-1 overflow-y-auto pb-2">
        <SidebarNav year={year} collapsed={collapsed} onNavigate={onNavigate} canManageSetup={canManageSetup} />
      </div>
      <div className="mt-4 space-y-2 border-t border-border-default pt-4">
        {controls}
        <p className="px-1 text-[10px] leading-4 text-text-muted">Dibina oleh guru untuk guru 🇲🇾</p>
      </div>
    </div>
  );
}

export function AppSidebar(props: Props) {
  const [collapsed, setCollapsed] = useState(() => {
    if (typeof window === "undefined") return false;
    try { return localStorage.getItem("ssp-sidebar") === "collapsed"; } catch { return false; }
  });
  function toggle() {
    setCollapsed((value) => {
      try { localStorage.setItem("ssp-sidebar", value ? "expanded" : "collapsed"); } catch { /* ignore */ }
      return !value;
    });
  }

  return (
    <>
      {/* Desktop sidebar */}
      <aside
        className={`sticky top-0 hidden h-screen shrink-0 border-r border-border-default bg-surface-card p-4 transition-[width] duration-200 lg:block ${collapsed ? "w-[4.75rem]" : "w-64 xl:w-[17rem]"}`}
      >
        <SidebarContents {...props} collapsed={collapsed} onToggle={toggle} />
      </aside>

      {/* Mobile header + drawer */}
      <div className="sticky top-0 z-30 flex min-w-0 items-center justify-between border-b border-border-default bg-surface-card px-4 py-2.5 shadow-raised lg:hidden">
        <Identity schoolName={props.schoolName} systemName={props.systemName} logoPath={props.logoPath} year={props.year} />
        <Dialog.Root>
          <Dialog.Trigger asChild>
            <button type="button" className="ml-3 shrink-0 rounded-lg border border-border-default p-2 text-text-secondary transition-colors hover:bg-surface-inset" aria-label="Buka navigasi">
              <Menu className="h-5 w-5" />
            </button>
          </Dialog.Trigger>
          <Dialog.Portal>
            <Dialog.Overlay className="fixed inset-0 z-40 bg-primary-950/40 backdrop-blur-[2px]" />
            <Dialog.Content className="fixed inset-y-0 left-0 z-50 w-[min(20rem,calc(100vw-3rem))] bg-surface-card p-4 shadow-overlay outline-none">
              <div className="flex h-full min-h-0 flex-col">
                <div className="flex items-start justify-between gap-3">
                  <Dialog.Title className="sr-only">Navigasi</Dialog.Title>
                  <div className="min-w-0 flex-1"><Identity schoolName={props.schoolName} systemName={props.systemName} logoPath={props.logoPath} year={props.year} /></div>
                  <Dialog.Close asChild>
                    <button type="button" className="shrink-0 rounded-lg border border-border-default p-2 text-text-secondary transition-colors hover:bg-surface-inset" aria-label="Tutup navigasi">
                      <X className="h-5 w-5" />
                    </button>
                  </Dialog.Close>
                </div>
                <div className="mt-5 min-h-0 flex-1 overflow-y-auto">
                  <SidebarNav year={props.year} canManageSetup={props.canManageSetup} onNavigate={() => document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }))} />
                </div>
                <div className="mt-4 space-y-2 border-t border-border-default pt-4">{props.controls}</div>
              </div>
            </Dialog.Content>
          </Dialog.Portal>
        </Dialog.Root>
      </div>
    </>
  );
}
