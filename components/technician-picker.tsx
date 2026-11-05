"use client";

import { useEffect, useId, useRef, useState } from "react";

interface Props {
  value: string; // nama teknisi terpilih, "" = belum ditugaskan
  options: string[];
  onChange: (value: string) => void;
  className?: string;
}

// Combobox: ketik untuk mencari teknisi, klik atau Enter untuk memilih.
export function TechnicianPicker({ value, options, onChange, className = "" }: Props) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const rootRef = useRef<HTMLDivElement>(null);
  const listId = useId();

  const matches = options.filter((o) =>
    o.toLowerCase().includes(query.trim().toLowerCase()),
  );

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  function select(name: string) {
    onChange(name);
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
      if (matches[active]) select(matches[active]);
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
        value={open ? query : value}
        placeholder={value ? value : "Cari teknisi..."}
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
              onClick={() => select("")}
              className="w-full px-3 py-1.5 text-left text-slate-500 hover:bg-slate-50"
            >
              Belum ditugaskan
            </button>
          </li>
          {matches.map((name, i) => (
            <li key={name} role="option" aria-selected={name === value}>
              <button
                type="button"
                onClick={() => select(name)}
                onMouseEnter={() => setActive(i)}
                className={`w-full px-3 py-1.5 text-left ${
                  i === active ? "bg-sky-50" : ""
                } ${name === value ? "font-medium" : ""}`}
              >
                {name}
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
