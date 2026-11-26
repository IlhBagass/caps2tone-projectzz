import { Suspense } from "react";
import { OfficeProvider } from "@/components/technician-provider";

// Memuat aset satu kantor sekali, dipakai bersama halaman daftar chassis dan halaman chassis.
export default function OfficeLayout({ children, params }: LayoutProps<"/teknisi/kantor/[officeId]">) {
  return (
    <Suspense fallback={<p className="text-sm text-slate-600">Memuat…</p>}>
      <OfficeProvider params={params}>{children}</OfficeProvider>
    </Suspense>
  );
}
