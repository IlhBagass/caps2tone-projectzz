import { Suspense } from "react";
import { OfficeList } from "@/components/office-list";
import { OfficesStatus } from "@/components/technician-provider";
import { ProgressDashboard } from "@/components/progress-dashboard";
import { TechnicianHero } from "@/components/technician-hero";
import { requireTechnician } from "@/lib/session";

export default function TeknisiHomePage() {
  return (
    <div className="space-y-4">
      <Suspense fallback={<p className="text-sm text-slate-600">Memuat…</p>}>
        <TeknisiHome />
      </Suspense>
    </div>
  );
}

// Nama diambil dari sesi login; data kantor dan progres dimuat dari backend oleh komponen client.
async function TeknisiHome() {
  const user = await requireTechnician();
  return (
    <>
      <TechnicianHero name={user.name} />
      <OfficesStatus />
      <ProgressDashboard />
      <div className="mt-4 flex items-center gap-2">
        <span className="h-5 w-1 rounded-full bg-sky-600" aria-hidden />
        <div>
          <h2 className="font-semibold leading-tight">Pilih kantor</h2>
          <p className="text-xs text-slate-600">Pilih kantor untuk melihat chassis yang perlu di-mapping.</p>
        </div>
      </div>
      <OfficeList />
    </>
  );
}
