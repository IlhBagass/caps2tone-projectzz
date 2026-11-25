// Kantor dari backend (tabel offices). Admin melihat semua kantor; teknisi hanya kantor penugasannya.
import { api } from "@/lib/api-client";
import type { Area, Office } from "@/lib/types";

/** Office di frontend plus area kantor (null = belum ditentukan, boleh dijadwalkan di area mana pun). */
export interface OfficeRow extends Office {
  area: Area | null;
}

export async function listOffices(options: { area?: Area } = {}): Promise<OfficeRow[]> {
  const all: OfficeRow[] = [];
  for (let page = 1; ; page++) {
    const query = `?limit=100&page=${page}${options.area ? `&area=${options.area}` : ""}`;
    const { data, meta } = await api.page<OfficeRow>(`/api/offices${query}`);
    all.push(...data.map(({ id, code, name, address, area }) => ({ id, code, name, address, area })));
    if (!meta || all.length >= meta.total || data.length === 0) return all;
  }
}
