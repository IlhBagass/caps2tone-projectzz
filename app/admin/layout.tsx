import Link from "next/link";
import { NavLink } from "@/components/nav-link";

export default function AdminLayout({ children }: LayoutProps<"/admin">) {
  return (
    <div className="flex flex-1 flex-col md:flex-row">
      <aside className="border-b border-slate-200 bg-white md:w-56 md:border-b-0 md:border-r">
        <div className="flex items-center justify-between px-4 py-3 md:block">
          <p className="font-semibold">Admin</p>
          <Link
            href="/login"
            className="text-sm text-slate-600 hover:underline md:mt-1 md:block"
          >
            Keluar
          </Link>
        </div>
        <nav className="flex gap-1 overflow-x-auto px-3 pb-3 md:flex-col md:pb-0">
          <NavLink href="/admin" exact>
            Dashboard
          </NavLink>
          <NavLink href="/admin/jadwal">Jadwal</NavLink>
          <NavLink href="/admin/aset">Data Aset</NavLink>
          <NavLink href="/admin/laporan">Laporan</NavLink>
        </nav>
      </aside>
      <main className="min-w-0 flex-1 p-4 md:p-6">{children}</main>
    </div>
  );
}
