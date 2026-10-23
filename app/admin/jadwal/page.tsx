import { ScheduleManager } from "@/components/schedule-manager";

export default function AdminSchedulePage() {
  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">Jadwal mapping</h1>
      <ScheduleManager />
    </div>
  );
}
