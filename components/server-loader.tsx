export function ServerLoader({ label = "Memuat data..." }: { label?: string }) {
  return (
    <div
      role="status"
      aria-live="polite"
      className="flex flex-col items-center justify-center gap-4 py-16"
    >
      <svg
        viewBox="0 0 120 120"
        className="server-rack h-28 w-28 text-sky-700"
        aria-hidden="true"
      >
        {[0, 1, 2].map((i) => (
          <g key={i} className="server-unit" style={{ animationDelay: `${i * 0.2}s` }}>
            <rect
              x="16"
              y={14 + i * 32}
              width="88"
              height="24"
              rx="5"
              fill="white"
              stroke="currentColor"
              strokeWidth="3"
            />
            <line
              x1="28"
              y1={26 + i * 32}
              x2="60"
              y2={26 + i * 32}
              stroke="currentColor"
              strokeWidth="3"
              strokeLinecap="round"
              opacity="0.35"
            />
            <circle
              className="server-led"
              style={{ animationDelay: `${i * 0.2}s` }}
              cx="76"
              cy={26 + i * 32}
              r="3.5"
              fill="#16a34a"
            />
            <circle
              className="server-led"
              style={{ animationDelay: `${i * 0.2 + 0.3}s` }}
              cx="90"
              cy={26 + i * 32}
              r="3.5"
              fill="#0ea5e9"
            />
          </g>
        ))}
        <rect
          className="server-scan"
          x="22"
          y="16"
          width="76"
          height="3"
          rx="1.5"
          fill="#0ea5e9"
        />
      </svg>
      <p className="text-sm font-medium text-slate-600">{label}</p>
    </div>
  );
}
