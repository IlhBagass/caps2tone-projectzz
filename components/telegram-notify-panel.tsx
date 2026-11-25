"use client";

import { useEffect, useState } from "react";
import { Badge } from "@/components/badge";
import { ApiError, errorMessage } from "@/lib/api";
import { formatDay, jakartaDay } from "@/lib/date";
import {
  previewNotify,
  sendNotify,
  type NotifyPreview,
  type NotifyResult,
} from "@/lib/schedules";

interface SendLog {
  date: string;
  time: string;
  result: NotifyResult;
}

const wib = (iso: string) =>
  new Date(iso).toLocaleTimeString("id-ID", { timeZone: "Asia/Jakarta", hour: "2-digit", minute: "2-digit" });

// Kirim manual, satu pesan per teknisi per hari (isinya semua kantor teknisi itu pada tanggal tersebut).
// Pratinjau dan pengiriman dilakukan backend; token bot dan chat ID tidak pernah sampai ke browser.
// refreshKey berubah saat jadwal di halaman berubah, supaya pratinjau ikut dimuat ulang.
export function TelegramNotifyPanel({ refreshKey = 0 }: { refreshKey?: number }) {
  const [day, setDay] = useState("");
  const [preview, setPreview] = useState<NotifyPreview | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [log, setLog] = useState<SendLog | null>(null);
  const [sendError, setSendError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [sentKey, setSentKey] = useState(0);

  // Tanggal awal = hari ini; dihitung setelah mount agar tidak ikut ter-prerender.
  useEffect(() => {
    queueMicrotask(() => setDay((d) => d || jakartaDay()));
  }, []);

  useEffect(() => {
    if (!day) return;
    let cancelled = false;
    previewNotify(day).then(
      (data) => {
        if (cancelled) return;
        setPreview(data);
        setLoadError(null);
      },
      (err) => !cancelled && setLoadError(errorMessage(err)),
    );
    return () => {
      cancelled = true;
    };
  }, [day, refreshKey, sentKey]);

  async function send() {
    setSending(true);
    setSendError(null);
    try {
      const result = await sendNotify(day);
      setLog({ date: day, time: wib(new Date().toISOString()), result });
      setSentKey((k) => k + 1);
    } catch (err) {
      setSendError(
        err instanceof ApiError && err.code === "TELEGRAM_NOT_CONFIGURED"
          ? "Bot Telegram belum dikonfigurasi di server, jadi pesan belum bisa dikirim."
          : errorMessage(err),
      );
    } finally {
      setSending(false);
    }
  }

  const current = preview && preview.date === day ? preview : null;
  const recipients = current?.recipients ?? [];
  const unassigned = current?.unassigned ?? [];
  const sendable = current?.sendable ?? 0;
  const skipped = current?.skipped ?? 0;
  const thisLog = log && log.date === day ? log : null;

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

      {loadError && (
        <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-800">
          Pratinjau tidak dapat dimuat. {loadError}
        </p>
      )}

      {!loadError && current === null ? (
        <p className="rounded-lg bg-slate-50 p-3 text-sm text-slate-600">Memuat pratinjau…</p>
      ) : recipients.length === 0 && unassigned.length === 0 ? (
        <p className="rounded-lg bg-slate-50 p-3 text-sm text-slate-600">
          Tidak ada jadwal aktif pada tanggal ini.
        </p>
      ) : (
        recipients.length > 0 && (
          <ul className="divide-y divide-slate-100 rounded-lg border border-slate-200">
            {recipients.map((r) => (
              <li key={r.userId} className="flex flex-wrap items-start justify-between gap-2 p-3 text-sm">
                <div className="min-w-0">
                  <p className="font-medium">{r.name}</p>
                  <p className="text-xs text-slate-600">
                    {r.offices.map((o) => o.officeName).join(", ")} ·{" "}
                    <span className="font-medium tabular-nums">{r.totalRemaining} perangkat harus dimapping</span>
                  </p>
                  {r.lastSent && (
                    <p className={`text-xs ${r.lastSent.success ? "text-emerald-700" : "text-red-700"}`}>
                      {r.lastSent.success
                        ? `Terakhir terkirim pukul ${wib(r.lastSent.at)} WIB`
                        : `Pengiriman terakhir gagal pukul ${wib(r.lastSent.at)} WIB`}
                    </p>
                  )}
                  <details className="mt-1 text-xs text-slate-500">
                    <summary className="cursor-pointer">Lihat pesan</summary>
                    <pre className="mt-1 whitespace-pre-wrap rounded-md bg-slate-50 p-2 font-sans">{r.message}</pre>
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
        )
      )}

      {unassigned.length > 0 && (
        <p role="status" className="rounded-lg bg-amber-50 p-3 text-sm text-amber-900">
          Belum ada teknisi untuk {unassigned.map((u) => u.officeName).join(", ")}. Jadwal ini tidak terkirim ke
          siapa pun.
        </p>
      )}
      {skipped > 0 && (
        <p className="text-xs text-slate-600">
          {skipped} teknisi belum menghubungkan Telegram (belum menekan Start di bot), jadi dilewati.
        </p>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={send}
          disabled={sendable === 0 || sending}
          className="rounded-md bg-slate-800 px-4 py-2 text-sm font-medium text-white hover:bg-slate-900 disabled:opacity-50"
        >
          {sending ? "Mengirim…" : `Kirim ke ${sendable} teknisi`}
        </button>
        {thisLog && (
          <span
            role="status"
            className={`text-sm ${thisLog.result.failed > 0 ? "text-amber-800" : "text-emerald-700"}`}
          >
            Terkirim ke {thisLog.result.sent} teknisi pukul {thisLog.time} WIB
            {thisLog.result.skipped > 0 ? `, ${thisLog.result.skipped} dilewati` : ""}
            {thisLog.result.failed > 0
              ? `, ${thisLog.result.failed} gagal (${thisLog.result.results
                  .filter((x) => x.status === "failed")
                  .map((x) => x.name)
                  .join(", ")})`
              : ""}
            .
          </span>
        )}
        {sendError && (
          <span role="alert" className="text-sm text-red-700">
            {sendError}
          </span>
        )}
      </div>
      <p className="text-xs text-slate-500">
        {day ? `Jadwal ${formatDay(day)}. ` : ""}Pesan hanya terkirim ke teknisi yang Telegram-nya terhubung.
      </p>
    </section>
  );
}
