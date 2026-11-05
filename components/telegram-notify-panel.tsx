"use client";

import { useEffect, useMemo, useState } from "react";
import { Badge } from "@/components/badge";
import { formatDay } from "@/lib/date";
import { assets, getOffice, isoDate, telegramLinked } from "@/lib/mock-data";
import type { MappingSchedule } from "@/lib/types";

interface OfficeLoad {
  name: string;
  total: number; // semua aset (chassis dan modul) di kantor
  remaining: number; // aset yang masih harus dimapping (status belum)
}

interface Recipient {
  name: string;
  offices: OfficeLoad[];
  linked: boolean;
}

function officeLoad(officeId: number): OfficeLoad {
  const items = assets.filter((a) => a.officeId === officeId);
  return {
    name: getOffice(officeId)?.name ?? "-",
    total: items.length,
    remaining: items.filter((a) => a.mappingStatus === "belum").length,
  };
}

interface SendLog {
  date: string;
  time: string;
  sent: number;
  skipped: number;
}

function buildMessage(day: string, name: string, offices: OfficeLoad[]): string {
  const lines = offices
    .map((o, i) => `${i + 1}. ${o.name}: ${o.remaining} perangkat belum termapping (dari ${o.total})`)
    .join("\n");
  const remaining = offices.reduce((n, o) => n + o.remaining, 0);
  return `Jadwal mapping ${formatDay(day)}\nHalo ${name}, kamu bertugas di:\n${lines}\n\nTotal yang harus dimapping: ${remaining} perangkat.\nSelamat bekerja.`;
}

// Kirim manual, satu pesan per teknisi per hari (isinya semua kantor teknisi itu
// pada tanggal tersebut). MODE PROTOTIPE: belum memanggil Telegram. Saat backend
// siap, tombol kirim memanggil route handler di server (token hanya di server).
export function TelegramNotifyPanel({ schedules }: { schedules: MappingSchedule[] }) {
  const [day, setDay] = useState("");
  const [log, setLog] = useState<SendLog | null>(null);

  // Tanggal awal = hari ini; dihitung setelah mount agar tidak ikut ter-prerender.
  useEffect(() => {
    queueMicrotask(() => setDay((d) => d || isoDate(0)));
  }, []);

  const { recipients, unassigned } = useMemo(() => {
    const active = schedules.filter(
      (s) => s.scheduledDate === day && (s.status === "terjadwal" || s.status === "berjalan"),
    );
    const byTech = new Map<string, OfficeLoad[]>();
    const missing: string[] = [];
    for (const s of active) {
      const load = officeLoad(s.officeId);
      if (!s.assignedTo) missing.push(load.name);
      else byTech.set(s.assignedTo, [...(byTech.get(s.assignedTo) ?? []), load]);
    }
    const list: Recipient[] = [...byTech.entries()]
      .map(([name, offices]) => ({ name, offices: offices.sort((a, b) => a.name.localeCompare(b.name, "id")), linked: telegramLinked[name] === true }))
      .sort((a, b) => a.name.localeCompare(b.name, "id"));
    return { recipients: list, unassigned: missing.sort() };
  }, [schedules, day]);

  const sendable = recipients.filter((r) => r.linked);
  const skipped = recipients.length - sendable.length;
  const thisLog = log && log.date === day ? log : null;

  function send() {
    setLog({
      date: day,
      time: new Date().toLocaleTimeString("id-ID", {
        timeZone: "Asia/Jakarta",
        hour: "2-digit",
        minute: "2-digit",
      }),
      sent: sendable.length,
      skipped,
    });
  }

  return (
    <section className="space-y-3 rounded-xl border border-slate-200 bg-white p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="font-semibold">Kirim jadwal ke Telegram</h2>
          <p className="text-sm text-slate-600">
            Satu pesan per teknisi untuk satu hari, dikirim manual lewat bot.
          </p>
        </div>
        <label className="text-sm font-medium">
          Tanggal
          <input
            type="date"
            value={day}
            onChange={(e) => setDay(e.target.value)}
            className="mt-1 block rounded-md border border-slate-300 px-3 py-1.5"
          />
        </label>
      </div>

      {recipients.length === 0 && unassigned.length === 0 ? (
        <p className="rounded-lg bg-slate-50 p-3 text-sm text-slate-600">
          Tidak ada jadwal aktif pada tanggal ini.
        </p>
      ) : (
        <ul className="divide-y divide-slate-100 rounded-lg border border-slate-200">
          {recipients.map((r) => (
            <li key={r.name} className="flex flex-wrap items-start justify-between gap-2 p-3 text-sm">
              <div className="min-w-0">
                <p className="font-medium">{r.name}</p>
                <p className="text-xs text-slate-600">
                  {r.offices.map((o) => o.name).join(", ")} ·{" "}
                  <span className="font-medium tabular-nums">
                    {r.offices.reduce((n, o) => n + o.remaining, 0)} perangkat harus dimapping
                  </span>
                </p>
                <details className="mt-1 text-xs text-slate-500">
                  <summary className="cursor-pointer">Lihat pesan</summary>
                  <pre className="mt-1 whitespace-pre-wrap rounded-md bg-slate-50 p-2 font-sans">
                    {buildMessage(day, r.name, r.offices)}
                  </pre>
                </details>
              </div>
              {r.linked ? (
                <Badge tone="green">Telegram terhubung</Badge>
              ) : (
                <Badge tone="amber">Belum terhubung</Badge>
              )}
            </li>
          ))}
        </ul>
      )}

      {unassigned.length > 0 && (
        <p role="status" className="rounded-lg bg-amber-50 p-3 text-sm text-amber-900">
          Belum ada teknisi untuk {unassigned.join(", ")}. Jadwal ini tidak terkirim ke siapa pun.
        </p>
      )}
      {skipped > 0 && (
        <p className="text-xs text-slate-600">
          {skipped} teknisi belum menghubungkan Telegram (belum menekan Start di bot), jadi
          dilewati.
        </p>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={send}
          disabled={sendable.length === 0}
          className="rounded-md bg-slate-800 px-4 py-2 text-sm font-medium text-white hover:bg-slate-900 disabled:opacity-50"
        >
          Kirim ke {sendable.length} teknisi
        </button>
        {thisLog && (
          <span role="status" className="text-sm text-emerald-700">
            Terkirim ke {thisLog.sent} teknisi pukul {thisLog.time} WIB
            {thisLog.skipped > 0 ? `, ${thisLog.skipped} dilewati` : ""}.
          </span>
        )}
      </div>
      <p className="text-xs text-slate-500">
        Mode prototipe: pesan belum benar-benar terkirim sampai bot Telegram dihubungkan.
      </p>
    </section>
  );
}
