"use client";

import { useEffect, useId, useRef, useState } from "react";

export interface TechnicianChoice {
  id: number;
  name: string;
}

interface Props {
  value: number | null; // id teknisi terpilih, null = belum ditugaskan
  options: TechnicianChoice[];
  onChange: (value: number | null) => void;
  className?: string;
}

// Combobox: ketik untuk mencari teknisi, klik atau Enter untuk memilih.
export function TechnicianPicker({ value, options, onChange, className = "" }: Props) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const rootRef = useRef<HTMLDivElement>(null);
  const listId = useId();

  const selectedName = options.find((o) => o.id === value)?.name ?? "";
  const matches = options.filter((o) =>
    o.name.toLowerCase().includes(query.trim().toLowerCase()),
  );

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  function select(id: number | null) {
    onChange(id);
    setQuery("");
    setOpen(false);
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setOpen(true);
      setActive((i) => Math.min(i + 1, matches.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter" && open) {
      e.preventDefault();
      if (matches[active]) select(matches[active].id);
    } else if (e.key === "Escape" && open) {
      e.stopPropagation();
      setOpen(false);
    }
  }

  return (
    <div ref={rootRef} className={`relative ${className}`}>
      <input
        type="text"
        role="combobox"
        aria-expanded={open}
        aria-controls={listId}
        aria-autocomplete="list"
        value={open ? query : selectedName}
        placeholder={selectedName || "Cari teknisi..."}
        onFocus={() => {
          setQuery("");
          setActive(0);
          setOpen(true);
        }}
        onChange={(e) => {
          setQuery(e.target.value);
          setActive(0);
          setOpen(true);
        }}
        onKeyDown={onKeyDown}
        className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 font-normal"
      />
      {open && (
        <ul
          id={listId}
          role="listbox"
          className="absolute z-10 mt-1 max-h-48 w-full overflow-auto rounded-md border border-slate-200 bg-white py-1 text-sm shadow-lg"
        >
          <li>
            <button
              type="button"
              onClick={() => select(null)}
              className="w-full px-3 py-1.5 text-left text-slate-500 hover:bg-slate-50"
            >
              Belum ditugaskan
            </button>
          </li>
          {matches.map((option, i) => (
            <li key={option.id} role="option" aria-selected={option.id === value}>
              <button
                type="button"
                onClick={() => select(option.id)}
                onMouseEnter={() => setActive(i)}
                className={`w-full px-3 py-1.5 text-left ${
                  i === active ? "bg-sky-50" : ""
                } ${option.id === value ? "font-medium" : ""}`}
              >
                {option.name}
              </button>
            </li>
          ))}
          {matches.length === 0 && (
            <li className="px-3 py-1.5 text-slate-500">Teknisi tidak ditemukan</li>
          )}
        </ul>
      )}
    </div>
  );
}
