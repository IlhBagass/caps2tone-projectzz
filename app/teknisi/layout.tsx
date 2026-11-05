import Link from "next/link";
import { BrandMark } from "@/components/brand-mark";
import { MappingProvider } from "@/components/mapping-provider";

export default function TeknisiLayout({ children }: LayoutProps<"/teknisi">) {
  return (
    <div className="theme-tif mx-auto flex w-full max-w-lg flex-1 flex-col bg-slate-50">
      <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/95 backdrop-blur">
        <div className="h-1 bg-gradient-to-r from-[#d41f26] via-[#b3151c] to-[#1c1517]" />
        <div className="flex items-center justify-between px-4 py-2.5">
          <Link href="/teknisi" aria-label="Beranda teknisi">
            <BrandMark />
          </Link>
          <Link
            href="/login"
            className="rounded-full border border-slate-300 px-3 py-1 text-xs font-medium text-slate-700 hover:border-sky-600 hover:text-sky-700"
          >
            Keluar
          </Link>
        </div>
      </header>
      <main className="flex-1 px-4 py-5">
        <MappingProvider>{children}</MappingProvider>
      </main>
      <footer className="border-t border-slate-200 bg-white px-4 py-3 text-center text-[11px] text-slate-500">
        Sistem Mapping Aset · Telkom Infrastruktur Indonesia
      </footer>
    </div>
  );
}
