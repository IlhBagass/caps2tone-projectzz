import { Suspense } from "react";
import { connection } from "next/server";
import { DemoLoading } from "@/components/demo-loading";
import { OfficeList } from "@/components/office-list";
import { ProgressDashboard } from "@/components/progress-dashboard";
import { TechnicianHero } from "@/components/technician-hero";
import { currentTechnician, isoDate, schedules } from "@/lib/mock-data";

export default function TeknisiHomePage() {
  return (
    <div className="space-y-4">
      <DemoLoading>
        <TechnicianHero name={currentTechnician} />
        <ProgressDashboard />
        <div className="mt-4 flex items-center gap-2">
          <span className="h-5 w-1 rounded-full bg-sky-600" aria-hidden />
          <div>
            <h2 className="font-semibold leading-tight">Pilih kantor</h2>
            <p className="text-xs text-slate-600">
              Pilih kantor untuk melihat chassis yang perlu di-mapping.
            </p>
          </div>
        </div>
        <Suspense fallback={<OfficeList scheduledOfficeIds={[]} />}>
          <ScheduledOffices />
        </Suspense>
      </DemoLoading>
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
