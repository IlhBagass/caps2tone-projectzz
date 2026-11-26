"use client";

import { Fragment, useEffect, useState } from "react";
import { Badge } from "@/components/badge";
import { errorMessage } from "@/lib/api";
import { formatDay } from "@/lib/date";
import {
  getInventoryItem,
  listEquipmentTypes,
  listInventory,
  listInventorySites,
  type EquipmentType,
  type InventoryDetail,
  type InventoryItem,
  type InventorySite,
} from "@/lib/inventory";

const PAGE_SIZE = 25;
const btn =
  "rounded-md border border-slate-300 bg-white px-3 py-2 text-sm hover:bg-slate-50 disabled:opacity-50";
const control = "mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-1.5";

interface DetailState {
  loading: boolean;
  data: InventoryDetail | null;
  error: string | null;
}

export function InventoryTable() {
  const [types, setTypes] = useState<EquipmentType[] | null>(null);
  const [sites, setSites] = useState<InventorySite[] | null>(null);
  const [rows, setRows] = useState<InventoryItem[] | null>(null);
  const [total, setTotal] = useState(0);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [query, setQuery] = useState(""); // pencarian yang sudah ditunda
  const [typeId, setTypeId] = useState("");
  const [siteId, setSiteId] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [openId, setOpenId] = useState<number | null>(null);
  const [details, setDetails] = useState<Record<number, DetailState>>({});

  // Jenis dan site dimuat sekali untuk ringkasan dan pilihan filter.
  useEffect(() => {
    let cancelled = false;
    Promise.all([listEquipmentTypes(), listInventorySites()]).then(
      ([t, s]) => {
        if (cancelled) return;
        setTypes(t);
        setSites(s);
      },
      (err) => !cancelled && setLoadError(errorMessage(err)),
    );
    return () => {
      cancelled = true;
    };
  }, []);

  // Pencarian ditunda sebentar dan mengembalikan ke halaman pertama.
  useEffect(() => {
    const timer = setTimeout(() => {
      setQuery(search.trim());
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  // Daftar dimuat dari backend; semua filter dan halaman dijalankan di server.
  useEffect(() => {
    let cancelled = false;
    listInventory({
      search: query || undefined,
      typeId: typeId ? Number(typeId) : undefined,
      siteId: siteId ? Number(siteId) : undefined,
      dateFrom: dateFrom || undefined,
      dateTo: dateTo || undefined,
      page,
      limit: PAGE_SIZE,
    }).then(
      (result) => {
        if (cancelled) return;
        setRows(result.rows);
        setTotal(result.total);
        setLoadError(null);
      },
      (err) => !cancelled && setLoadError(errorMessage(err)),
    );
    return () => {
      cancelled = true;
    };
  }, [query, typeId, siteId, dateFrom, dateTo, page, reloadKey]);

  function toggleDetail(id: number) {
    if (openId === id) {
      setOpenId(null);
      return;
    }
    setOpenId(id);
    if (details[id]?.data) return;
    setDetails((d) => ({ ...d, [id]: { loading: true, data: null, error: null } }));
    getInventoryItem(id).then(
      (data) => setDetails((d) => ({ ...d, [id]: { loading: false, data, error: null } })),
      (err) => setDetails((d) => ({ ...d, [id]: { loading: false, data: null, error: errorMessage(err) } })),
    );
  }

  const filtersActive = Boolean(search || typeId || siteId || dateFrom || dateTo);
  function resetFilters() {
    setSearch("");
    setQuery("");
    setTypeId("");
    setSiteId("");
    setDateFrom("");
    setDateTo("");
    setPage(1);
  }

  const totalItems = types?.reduce((n, t) => n + t.items, 0) ?? null;
  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const first = total === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const last = Math.min(page * PAGE_SIZE, total);
  const shown = rows ?? [];

  return (
    <div className="space-y-4">
      <p className="text-sm text-slate-600">
        Data master hasil impor CSV, hanya untuk dibaca. Equipment ID di sini berbeda dari EQ di Data Aset, dan site
        berbeda dari kantor.
      </p>

      <section aria-label="Ringkasan inventaris" className="space-y-3">
        <div className="grid grid-cols-3 gap-3">
          <Summary label="Total aset" value={totalItems} />
          <Summary label="Jenis perangkat" value={types?.length ?? null} />
          <Summary label="Site" value={sites?.length ?? null} />
        </div>
        {types && types.length > 0 && (
          <div className="flex flex-wrap gap-1.5" role="group" aria-label="Filter cepat menurut jenis">
            {types.map((t) => (
              <button
                key={t.id}
                type="button"
                aria-pressed={typeId === String(t.id)}
                onClick={() => {
                  setTypeId((cur) => (cur === String(t.id) ? "" : String(t.id)));
                  setPage(1);
                }}
                className={`rounded-full border px-3 py-1 text-xs font-medium ${
                  typeId === String(t.id)
                    ? "border-slate-800 bg-slate-800 text-white"
                    : "border-slate-300 bg-white text-slate-700 hover:border-slate-500"
                }`}
              >
                {t.category || t.objectType}: {t.name} ({t.items})
              </button>
            ))}
          </div>
        )}
      </section>

      <div className="space-y-3 rounded-xl border border-slate-200 bg-white p-4">
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Cari Equipment ID, nomor inventaris, NKA, atau serial number"
          aria-label="Cari inventaris"
          className="w-full rounded-md border border-slate-300 px-3 py-2 sm:max-w-md"
        />
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <label className="text-sm font-medium">
            Jenis perangkat
            <select
              value={typeId}
              onChange={(e) => {
                setTypeId(e.target.value);
                setPage(1);
              }}
              className={control}
            >
              <option value="">Semua</option>
              {types?.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          </label>
          <label className="text-sm font-medium">
            Site
            <select
              value={siteId}
              onChange={(e) => {
                setSiteId(e.target.value);
                setPage(1);
              }}
              className={control}
            >
              <option value="">Semua</option>
              {sites?.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.code} · {s.name}
                </option>
              ))}
            </select>
          </label>
          <label className="text-sm font-medium">
            Tanggal NKA dari
            <input
              type="date"
              value={dateFrom}
              max={dateTo || undefined}
              onChange={(e) => {
                setDateFrom(e.target.value);
                setPage(1);
              }}
              className={control}
            />
          </label>
          <label className="text-sm font-medium">
            Tanggal NKA sampai
            <input
              type="date"
              value={dateTo}
              min={dateFrom || undefined}
              onChange={(e) => {
                setDateTo(e.target.value);
                setPage(1);
              }}
              className={control}
            />
          </label>
        </div>
        {filtersActive && (
          <div className="flex items-center justify-between text-sm text-slate-600">
            <span>{total} aset sesuai filter</span>
            <button type="button" onClick={resetFilters} className="text-slate-700 underline-offset-2 hover:underline">
              Reset filter
            </button>
          </div>
        )}
      </div>

      {loadError && (
        <div role="alert" className="flex flex-wrap items-center gap-3 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
          <p className="flex-1">Data inventaris tidak dapat dimuat. {loadError}</p>
          <button type="button" className={btn} onClick={() => setReloadKey((k) => k + 1)}>
            Coba lagi
          </button>
        </div>
      )}

      <div className="@container overflow-x-auto rounded-xl border border-slate-200 bg-white">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 text-slate-600">
            <tr>
              <th className="px-4 py-2 font-medium">Equipment ID</th>
              <th className="px-4 py-2 font-medium">Jenis</th>
              <th className="px-4 py-2 font-medium">Site</th>
              <th className="px-4 py-2 font-medium">No. inventaris</th>
              <th className="px-4 py-2 font-medium">NKA</th>
              <th className="px-4 py-2 font-medium">Tanggal NKA</th>
              <th className="px-4 py-2 font-medium">Serial</th>
              <th className="px-4 py-2" />
            </tr>
          </thead>
          <tbody>
            {rows === null && !loadError && (
              <tr>
                <td colSpan={8} className="px-4 py-6 text-center text-slate-600">
                  Memuat data inventaris…
                </td>
              </tr>
            )}
            {rows !== null && shown.length === 0 && (
              <tr>
                <td colSpan={8} className="px-4 py-6 text-center text-slate-600">
                  Tidak ada aset yang cocok.
                </td>
              </tr>
            )}
            {shown.map((item) => {
              const detail = details[item.id];
              return (
                <Fragment key={item.id}>
                  <tr className="border-t border-slate-100">
                    <td className="px-4 py-2 font-mono">{item.equipmentId}</td>
                    <td className="px-4 py-2">
                      <p className="font-medium">{item.typeName}</p>
                      {item.category && <Badge tone="gray">{item.category}</Badge>}
                    </td>
                    <td className="px-4 py-2">
                      {item.siteCode} · {item.siteName}
                    </td>
                    <td className="px-4 py-2 font-mono">{item.inventoryNumber}</td>
                    <td className="px-4 py-2 font-mono">{item.nka}</td>
                    <td className="whitespace-nowrap px-4 py-2">{item.nkaAcqDate ? formatDay(item.nkaAcqDate) : "-"}</td>
                    <td className="px-4 py-2 font-mono">{item.serialNumber}</td>
                    <td className="whitespace-nowrap px-4 py-2 text-right">
                      <button
                        type="button"
                        aria-expanded={openId === item.id}
                        onClick={() => toggleDetail(item.id)}
                        className="text-slate-700 underline-offset-2 hover:underline"
                      >
                        {openId === item.id ? "Tutup" : "Detail"}
                      </button>
                    </td>
                  </tr>
                  {openId === item.id && (
                    <tr className="bg-slate-50">
                      <td colSpan={8} className="px-4 py-3">
                        {/* Tabel bisa lebih lebar dari layar; panel menempel di tepi kiri area yang terlihat. */}
                        <div className="sticky left-0 w-[calc(100cqw-2rem)]">
                          {!detail || detail.loading ? (
                            <p className="text-slate-600">Memuat detail…</p>
                          ) : detail.error || !detail.data ? (
                            <p className="text-red-700">Detail tidak dapat dimuat. {detail.error}</p>
                          ) : (
                            <DetailPanel detail={detail.data} />
                          )}
                        </div>
                      </td>
                    </tr>
                  )}
                </Fragment>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 text-sm text-slate-600">
        <span>{total === 0 ? "0 aset" : `Menampilkan ${first}–${last} dari ${total} aset`}</span>
        <div className="flex items-center gap-2">
          <button type="button" className={btn} disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
            Sebelumnya
          </button>
          <span>
            Halaman {page} dari {pageCount}
          </span>
          <button type="button" className={btn} disabled={page >= pageCount} onClick={() => setPage((p) => p + 1)}>
            Berikutnya
          </button>
        </div>
      </div>
    </div>
  );
}

function Summary({ label, value }: { label: string; value: number | null }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <p className="text-sm text-slate-600">{label}</p>
      <p className="text-2xl font-semibold tabular-nums">{value ?? "…"}</p>
    </div>
  );
}

function Field({ label, value }: { label: string; value: string | null }) {
  return (
    <div>
      <dt className="text-xs text-slate-500">{label}</dt>
      <dd className="break-words">{value || "-"}</dd>
    </div>
  );
}

function DetailPanel({ detail }: { detail: InventoryDetail }) {
  const { type, site } = detail;
  return (
    <div className="grid gap-4 text-sm md:grid-cols-3">
      <section>
        <h3 className="mb-2 font-semibold">Perangkat</h3>
        <dl className="grid grid-cols-2 gap-2">
          <Field label="Superior Equipment" value={detail.superiorEquipment} />
          <Field label="Remarks" value={detail.remarks} />
          <Field label="Dibuat" value={new Date(detail.createdAt).toLocaleString("id-ID")} />
          <Field label="Diperbarui" value={new Date(detail.updatedAt).toLocaleString("id-ID")} />
        </dl>
      </section>
      <section>
        <h3 className="mb-2 font-semibold">Jenis</h3>
        <dl className="grid grid-cols-2 gap-2">
          <Field label="Nama" value={type.name} />
          <Field label="Kategori" value={type.category} />
          <Field label="Object Type" value={type.objectType} />
          <Field label="Manufacturer" value={type.manufacturer} />
          <Field label="Model / Type" value={type.model} />
          <Field label="Part Number" value={type.partNumber} />
        </dl>
      </section>
      <section>
        <h3 className="mb-2 font-semibold">Site</h3>
        <dl className="grid grid-cols-2 gap-2">
          <Field label="Kode" value={site.code} />
          <Field label="Nama" value={site.name} />
          <Field label="Functional Location" value={site.functionalLocation} />
          <Field label="Deskripsi" value={site.description} />
          <Field label="Territory" value={site.territory} />
          <Field label="Regional" value={[site.regionalCode, site.regionalName].filter(Boolean).join(" · ")} />
          <Field label="District" value={[site.districtCode, site.districtName].filter(Boolean).join(" · ")} />
          <Field label="Cost Center" value={site.costCenter} />
          <Field label="Maintenance Plant" value={site.maintenancePlant} />
          <Field label="Work Center" value={site.workCenter} />
        </dl>
      </section>
    </div>
  );
}
