// Wordmark teks sederhana untuk Infranexia. Bukan logo resmi; ganti dengan
// berkas logo resmi dari PT Telkom Infrastruktur Indonesia bila sudah ada.
export function BrandMark({ tone = "dark" }: { tone?: "dark" | "light" }) {
  const text = tone === "dark" ? "text-slate-900" : "text-white";
  const sub = tone === "dark" ? "text-slate-500" : "text-white/75";
  return (
    <span className="flex items-center gap-2.5">
      <svg
        viewBox="0 0 32 32"
        className="size-8 shrink-0"
        role="img"
        aria-label="Infranexia"
      >
        <rect width="32" height="32" rx="8" fill="#d41f26" />
        <g stroke="#fff" strokeWidth="1.8" strokeLinecap="round">
          <path d="M9 22 16 10l7 12M9 22h14" fill="none" />
        </g>
        <g fill="#fff">
          <circle cx="16" cy="10" r="2.6" />
          <circle cx="9" cy="22" r="2.6" />
          <circle cx="23" cy="22" r="2.6" />
        </g>
      </svg>
      <span className="leading-tight">
        <span className={`block text-base font-bold tracking-tight ${text}`}>
          Infranexia
        </span>
        <span className={`block text-[10px] font-medium uppercase tracking-wider ${sub}`}>
          Telkom Infrastruktur Indonesia
        </span>
      </span>
    </span>
  );
}
