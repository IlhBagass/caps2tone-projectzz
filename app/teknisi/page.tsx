import { Suspense } from "react";
import { connection } from "next/server";
import { OfficeList } from "@/components/office-list";
import { ProgressDashboard } from "@/components/progress-dashboard";
import { currentTechnician, isoDate, schedules } from "@/lib/mock-data";

export default function TeknisiHomePage() {
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-lg font-semibold">Pilih kantor</h1>
        <p className="text-sm text-slate-600">
          Halo, {currentTechnician}. Pilih kantor untuk melihat chassis yang
          perlu di-mapping.
        </p>
      </div>
      <ProgressDashboard />
      <h2 className="font-semibold">Daftar kantor</h2>
      <Suspense fallback={<OfficeList scheduledOfficeIds={[]} />}>
        <ScheduledOffices />
      </Suspense>
    </div>
  );
}

async function ScheduledOffices() {
  await connection();
  const today = isoDate(0);
  const ids = schedules
    .filter(
      (s) =>
        s.scheduledDate === today &&
        s.status !== "dibatalkan" &&
        (s.assignedTo === null || s.assignedTo === currentTechnician),
    )
    .map((s) => s.officeId);
  return <OfficeList scheduledOfficeIds={ids} />;
}
