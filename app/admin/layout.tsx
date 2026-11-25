import Link from "next/link";
import { Suspense } from "react";
import { AdminSidebar, SidebarSkeleton } from "@/components/admin/sidebar";
import { BrandMark } from "@/components/brand-mark";
import { LogoutButton } from "@/components/logout-button";
import { getCurrentUser } from "@/lib/session";

async function HeaderUser() {
  const user = await getCurrentUser();
  return <UserChip name={user?.name ?? "Admin"} />;
}

function UserChip({ name }: { name: string }) {
  return (
    <span
      aria-hidden
      className="grid size-7 shrink-0 place-items-center rounded-full bg-slate-800 text-xs font-semibold text-white"
      title={name}
    >
      {name.slice(0, 1).toUpperCase()}
    </span>
  );
}

// Tinggi layar penuh: header dan sidebar tetap di tempat, hanya area konten
// yang di-scroll. Di desktop profil dan Keluar ada di sidebar; di HP di header.
export default function AdminLayout({ children }: LayoutProps<"/admin">) {
  return (
    <div className="theme-tif flex h-dvh flex-col bg-slate-100">
      <header className="z-20 shrink-0 border-b border-slate-200 bg-white">
        <div className="h-1 bg-gradient-to-r from-[#d41f26] via-[#b3151c] to-[#1c1517]" />
        <div className="flex items-center justify-between px-4 py-2.5">
          <Link href="/admin" aria-label="Beranda admin">
            <BrandMark />
          </Link>
          <div className="flex items-center gap-3 md:hidden">
            <Suspense fallback={<UserChip name="…" />}>
              <HeaderUser />
            </Suspense>
            <LogoutButton className="rounded-full border border-slate-300 px-3 py-1 text-xs font-medium text-slate-700 hover:border-sky-600 hover:text-sky-700 disabled:opacity-60" />
          </div>
        </div>
      </header>

      <div className="flex min-h-0 flex-1 flex-col md:flex-row">
        <aside className="flex shrink-0 flex-col border-b border-slate-200 bg-white md:w-60 md:border-b-0 md:border-r">
          {/* NavLink membaca pathname; pada rute dinamis harus di dalam Suspense. */}
          <Suspense fallback={<SidebarSkeleton />}>
            <AdminSidebar />
          </Suspense>
        </aside>

        <div className="min-w-0 flex-1 overflow-y-auto">
          <main className="p-4 md:p-6">{children}</main>
          <footer className="border-t border-slate-200 bg-white px-4 py-3 text-center text-[11px] text-slate-500">
            Sistem Mapping Aset · Telkom Infrastruktur Indonesia
          </footer>
        </div>
      </div>
    </div>
  );
}
