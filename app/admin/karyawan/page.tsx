import { EmployeeManager } from "@/components/employee-manager";

export default function AdminEmployeesPage() {
  return (
    <div className="space-y-4">
      <div>
        <h1 className="flex items-center gap-2 text-xl font-semibold">
          <span className="h-6 w-1 rounded-full bg-slate-700" aria-hidden />
          Data karyawan
        </h1>
        <p className="mt-1 text-sm text-slate-600">
          Akun baru, termasuk anak magang, baru bisa masuk setelah disetujui admin.
        </p>
      </div>
      <EmployeeManager />
    </div>
  );
}
