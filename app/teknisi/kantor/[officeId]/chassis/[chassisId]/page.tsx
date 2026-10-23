import { Suspense } from "react";
import { notFound } from "next/navigation";
import { ChassisWorkspace } from "@/components/chassis-workspace";
import { assets, getOffice } from "@/lib/mock-data";

export default function ChassisPage(
  props: PageProps<"/teknisi/kantor/[officeId]/chassis/[chassisId]">,
) {
  return (
    <Suspense fallback={<p className="text-sm text-slate-600">Memuat…</p>}>
      <ChassisContent params={props.params} />
    </Suspense>
  );
}

async function ChassisContent({
  params,
}: {
  params: PageProps<"/teknisi/kantor/[officeId]/chassis/[chassisId]">["params"];
}) {
  const { officeId, chassisId } = await params;
  const office = getOffice(Number(officeId));
  const chassis = assets.find(
    (a) =>
      a.id === Number(chassisId) &&
      a.kind === "chassis" &&
      a.officeId === Number(officeId),
  );
  if (!office || !chassis) notFound();

  return (
    <ChassisWorkspace
      officeId={office.id}
      officeName={office.name}
      chassisId={chassis.id}
    />
  );
}
