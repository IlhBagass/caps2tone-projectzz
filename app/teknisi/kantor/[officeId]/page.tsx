import { Suspense } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ChassisList } from "@/components/chassis-list";
import { getOffice } from "@/lib/mock-data";

export default function OfficePage(
  props: PageProps<"/teknisi/kantor/[officeId]">,
) {
  return (
    <Suspense fallback={<p className="text-sm text-slate-600">Memuat…</p>}>
      <OfficeContent params={props.params} />
    </Suspense>
  );
}

async function OfficeContent({
  params,
}: {
  params: PageProps<"/teknisi/kantor/[officeId]">["params"];
}) {
  const { officeId } = await params;
  const office = getOffice(Number(officeId));
  if (!office) notFound();

  return (
    <div className="space-y-4">
      <div>
        <Link href="/teknisi" className="text-sm text-sky-700 hover:underline">
          ← Kembali ke daftar kantor
        </Link>
        <h1 className="mt-1 text-lg font-semibold">{office.name}</h1>
        <p className="text-sm text-slate-600">
          Pilih chassis, lalu scan chassis sebelum memindai modulnya.
        </p>
      </div>
      <ChassisList officeId={office.id} />
    </div>
  );
}
