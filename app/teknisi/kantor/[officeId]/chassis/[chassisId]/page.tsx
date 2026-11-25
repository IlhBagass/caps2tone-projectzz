import { Suspense } from "react";
import { ChassisScreen } from "@/components/chassis-screen";

export default function ChassisPage(props: PageProps<"/teknisi/kantor/[officeId]/chassis/[chassisId]">) {
  return (
    <Suspense fallback={<p className="text-sm text-slate-600">Memuat…</p>}>
      <ChassisScreen params={props.params} />
    </Suspense>
  );
}
