import Link from "next/link";
import { connection } from "next/server";
import { NavLink } from "@/components/nav-link";
import {
  AssetIcon,
  CalendarIcon,
  DashboardIcon,
  LogoutIcon,
  ReportIcon,
  UsersIcon,
} from "@/components/admin/icons";
import { getTodaySchedules } from "@/lib/admin-dashboard";
import { getCurrentUser } from "@/lib/session";

function Group({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="px-3 pb-1 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
        {label}
      </p>
      <div className="space-y-0.5">{children}</div>
    </div>
  );
}

export function SidebarSkeleton() {
  return (
    <div className="hidden space-y-2 p-3 md:block" aria-hidden>
      {Array.from({ length: 5 }, (_, i) => (
        <div key={i} className="h-9 animate-pulse rounded-lg bg-slate-100" />
      ))}
    </div>
  );
}

// Menu admin. Desktop: sidebar bertingkat dengan kartu profil di bawah.
// HP: baris menu horizontal (profil dan Keluar ada di header).
export async function AdminSidebar() {
  await connection();
  const user = await getCurrentUser();
  const jadwalHariIni = getTodaySchedules().filter((s) => s.status !== "dibatalkan").length;
  const name = user?.name ?? "Admin";

  return (
    <>
      <nav aria-label="Menu admin" className="hidden min-h-0 flex-1 flex-col md:flex">
        <div className="flex-1 space-y-5 overflow-y-auto p-3">
          <Group label="Monitoring">
            <NavLink href="/admin" exact icon={<DashboardIcon />}>
              Dashboard
            </NavLink>
            <NavLink href="/admin/laporan" icon={<ReportIcon />}>
              Laporan
            </NavLink>
          </Group>
          <Group label="Operasional">
            <NavLink href="/admin/jadwal" icon={<CalendarIcon />} badge={jadwalHariIni}>
              Jadwal
            </NavLink>
            <NavLink href="/admin/aset" icon={<AssetIcon />}>
              Data Aset
            </NavLink>
          </Group>
          <Group label="Pengaturan">
            <NavLink href="/admin/karyawan" icon={<UsersIcon />}>
              Karyawan
            </NavLink>
          </Group>
        </div>

        <div className="border-t border-slate-200 p-3">
          <div className="flex items-center gap-2.5 rounded-lg bg-slate-50 p-2.5">
            <span
              aria-hidden
              className="grid size-9 shrink-0 place-items-center rounded-full bg-slate-800 text-sm font-semibold text-white"
            >
              {name.slice(0, 1).toUpperCase()}
            </span>
            <span className="min-w-0 flex-1 leading-tight">
              <span className="block truncate text-sm font-medium">{name}</span>
              <span className="block text-[11px] uppercase tracking-wide text-slate-500">
                Admin
              </span>
            </span>
          </div>
          <Link
            href="/login"
            className="mt-2 flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-900"
          >
            <LogoutIcon />
            Keluar
          </Link>
        </div>
      </nav>

      <nav
        aria-label="Menu admin"
        className="flex gap-1 overflow-x-auto px-3 py-2 md:hidden"
      >
        <NavLink href="/admin" exact icon={<DashboardIcon />}>
          Dashboard
        </NavLink>
        <NavLink href="/admin/jadwal" icon={<CalendarIcon />} badge={jadwalHariIni}>
          Jadwal
        </NavLink>
        <NavLink href="/admin/aset" icon={<AssetIcon />}>
          Data Aset
        </NavLink>
        <NavLink href="/admin/laporan" icon={<ReportIcon />}>
          Laporan
        </NavLink>
        <NavLink href="/admin/karyawan" icon={<UsersIcon />}>
          Karyawan
        </NavLink>
      </nav>
    </>
  );
}
