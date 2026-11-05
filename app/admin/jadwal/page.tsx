import { ScheduleManager } from "@/components/schedule-manager";

export default function AdminSchedulePage() {
  return (
    <div className="space-y-4">
      <h1 className="flex items-center gap-2 text-xl font-semibold">
        <span className="h-6 w-1 rounded-full bg-slate-700" aria-hidden />
        Jadwal mapping
      </h1>
      <ScheduleManager />
    </div>
  );
}
