// Pesan saat data halaman admin gagal dimuat dari backend. Memuat ulang halaman = mencoba lagi.
export function LoadError({ message }: { message: string }) {
  return (
    <div role="alert" className="space-y-2 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
      <p>Data tidak dapat dimuat. {message}</p>
      {/* Tautan biasa agar halaman server dimuat ulang sepenuhnya. */}
      <a href="" className="inline-block rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-800 hover:bg-slate-50">
        Muat ulang
      </a>
    </div>
  );
}
