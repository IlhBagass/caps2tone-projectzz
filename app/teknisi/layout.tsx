import Link from "next/link";
import { MappingProvider } from "@/components/mapping-provider";

export default function TeknisiLayout({ children }: LayoutProps<"/teknisi">) {
  return (
    <div className="mx-auto flex w-full max-w-lg flex-1 flex-col">
      <header className="flex items-center justify-between border-b border-slate-200 bg-white px-4 py-3">
        <Link href="/teknisi" className="font-semibold">
          Mapping Aset
        </Link>
        <Link href="/login" className="text-sm text-slate-600 hover:underline">
          Keluar
        </Link>
      </header>
      <main className="flex-1 px-4 py-5">
        <MappingProvider>{children}</MappingProvider>
      </main>
    </div>
  );
}
