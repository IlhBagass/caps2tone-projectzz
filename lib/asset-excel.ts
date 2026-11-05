import type ExcelJS from "exceljs";
import type { Asset, AssetHistory, Office } from "@/lib/types";

// Kolom file Excel data aset. Urutan sama untuk ekspor, template, dan impor.
const COLUMNS = [
  { key: "eq", header: "EQ", width: 18 },
  { key: "kind", header: "Jenis", width: 12 },
  { key: "serialNumber", header: "Serial Number", width: 30 },
  { key: "officeCode", header: "Kode Kantor", width: 14 },
  { key: "parentSn", header: "SN Chassis", width: 30 },
  { key: "ref", header: "REF", width: 12 },
  { key: "status", header: "Status", width: 12 },
  { key: "kondisi", header: "Kondisi", width: 12 },
  { key: "assetCode", header: "Kode Aset", width: 26 },
  { key: "labelStatus", header: "Label", width: 12 },
  { key: "labelCode", header: "Kode Label", width: 16 },
] as const;

// Kolom yang boleh diisi saat impor. Label hanya untuk ekspor.
const IMPORT_COLUMNS = COLUMNS.slice(0, 9);

const XLSX_MIME =
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

export interface ImportRow {
  line: number;
  eq: string;
  kind: Asset["kind"];
  serialNumber: string;
  officeId: number;
  parentSn: string;
  ref: string;
  status: string;
  kondisi: string;
  assetCode: string;
}

export interface ImportError {
  line: number;
  message: string;
}

export interface ParseResult {
  rows: ImportRow[];
  errors: ImportError[];
}

function download(buffer: ArrayBuffer, filename: string) {
  const url = URL.createObjectURL(new Blob([buffer], { type: XLSX_MIME }));
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function styledSheet(wb: ExcelJS.Workbook, name: string, columns: readonly { key: string; header: string; width: number }[]) {
  const sheet = wb.addWorksheet(name, { views: [{ state: "frozen", ySplit: 1 }] });
  sheet.columns = columns.map((c) => ({ ...c }));
  const header = sheet.getRow(1);
  header.font = { bold: true };
  header.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFE2E8F0" } };
  return sheet;
}

export async function exportAssets(
  assets: Asset[],
  offices: Office[],
  filename = "data-aset.xlsx",
) {
  const { default: Excel } = await import("exceljs");
  const wb = new Excel.Workbook();
  const sheet = styledSheet(wb, "Aset", COLUMNS);
  const byId = new Map(assets.map((a) => [a.id, a]));
  for (const a of assets) {
    sheet.addRow({
      eq: a.eq,
      kind: a.kind === "chassis" ? "Chassis" : "Modul",
      serialNumber: a.serialNumber,
      officeCode: offices.find((o) => o.id === a.officeId)?.code ?? "",
      parentSn: a.parentId ? (byId.get(a.parentId)?.serialNumber ?? "") : "",
      ref: a.ref,
      status: a.status,
      kondisi: a.kondisi,
      assetCode: a.assetCode,
      labelStatus: a.labelStatus,
      labelCode: a.labelCode ?? "",
    });
  }
  download(await wb.xlsx.writeBuffer(), filename);
}

export async function downloadTemplate(offices: Office[]) {
  const { default: Excel } = await import("exceljs");
  const wb = new Excel.Workbook();
  const sheet = styledSheet(wb, "Aset", IMPORT_COLUMNS);
  sheet.addRow({
    eq: "EQ-C900", kind: "Chassis", serialNumber: "CH-CONTOH-01", officeCode: offices[0]?.code ?? "",
    parentSn: "", ref: "RK-01", status: "Aktif", kondisi: "Normal", assetCode: "AST-CONTOH-C01",
  });
  sheet.addRow({
    eq: "EQ-9001", kind: "Modul", serialNumber: "SN-CONTOH-01", officeCode: offices[0]?.code ?? "",
    parentSn: "CH-CONTOH-01", ref: "RK-01", status: "Aktif", kondisi: "Normal", assetCode: "AST-CONTOH-0001",
  });

  const help = styledSheet(wb, "Petunjuk", [
    { key: "a", header: "Kolom", width: 18 },
    { key: "b", header: "Keterangan", width: 80 },
  ]);
  help.addRows([
    { a: "EQ", b: "Wajib. Jika EQ sudah ada, data aset diperbarui." },
    { a: "Jenis", b: "Wajib. Isi Chassis atau Modul." },
    { a: "Serial Number", b: "Wajib." },
    { a: "Kode Kantor", b: `Wajib. Salah satu: ${offices.map((o) => o.code).join(", ")}` },
    { a: "SN Chassis", b: "Hanya untuk Modul: serial number chassis induknya." },
    { a: "REF / Status / Kondisi", b: "Opsional. Perubahan pada aset yang sudah ada dicatat ke riwayat." },
    { a: "Kode Aset", b: "Opsional." },
  ]);
  download(await wb.xlsx.writeBuffer(), "template-data-aset.xlsx");
}

function cellText(value: ExcelJS.CellValue): string {
  if (value == null) return "";
  if (typeof value === "object") {
    if ("richText" in value) return value.richText.map((r) => r.text).join("").trim();
    if ("text" in value) return String(value.text).trim();
    if ("result" in value) return String(value.result ?? "").trim();
    if (value instanceof Date) return value.toISOString();
  }
  return String(value).trim();
}

export async function parseAssetFile(
  file: File,
  offices: Office[],
): Promise<ParseResult> {
  const { default: Excel } = await import("exceljs");
  const wb = new Excel.Workbook();
  await wb.xlsx.load(await file.arrayBuffer());
  const sheet = wb.worksheets[0];
  if (!sheet) return { rows: [], errors: [{ line: 0, message: "File tidak berisi sheet." }] };

  // Petakan header ke nomor kolom, jadi urutan kolom di file bebas.
  const colIndex = new Map<string, number>();
  sheet.getRow(1).eachCell((cell, col) => {
    colIndex.set(cellText(cell.value).toLowerCase(), col);
  });
  const missing = IMPORT_COLUMNS.slice(0, 4).filter(
    (c) => !colIndex.has(c.header.toLowerCase()),
  );
  if (missing.length) {
    return {
      rows: [],
      errors: [{ line: 1, message: `Kolom wajib tidak ditemukan: ${missing.map((c) => c.header).join(", ")}.` }],
    };
  }
  const get = (row: ExcelJS.Row, header: string) => {
    const col = colIndex.get(header.toLowerCase());
    return col ? cellText(row.getCell(col).value) : "";
  };

  const rows: ImportRow[] = [];
  const errors: ImportError[] = [];
  const seenEq = new Set<string>();

  sheet.eachRow((row, line) => {
    if (line === 1) return;
    const eq = get(row, "EQ");
    const serialNumber = get(row, "Serial Number");
    const jenis = get(row, "Jenis").toLowerCase();
    const officeCode = get(row, "Kode Kantor");
    if (!eq && !serialNumber && !jenis && !officeCode) return; // baris kosong

    const problems: string[] = [];
    if (!eq) problems.push("EQ kosong");
    if (!serialNumber) problems.push("Serial Number kosong");
    if (jenis !== "chassis" && jenis !== "modul" && jenis !== "module")
      problems.push("Jenis harus Chassis atau Modul");
    const office = offices.find((o) => o.code.toLowerCase() === officeCode.toLowerCase());
    if (!office) problems.push(`Kode Kantor "${officeCode}" tidak dikenal`);
    if (eq && seenEq.has(eq.toLowerCase())) problems.push(`EQ ${eq} dobel di file`);

    if (problems.length || !office) {
      errors.push({ line, message: problems.join("; ") });
      return;
    }
    seenEq.add(eq.toLowerCase());
    rows.push({
      line,
      eq,
      kind: jenis === "chassis" ? "chassis" : "module",
      serialNumber,
      officeId: office.id,
      parentSn: get(row, "SN Chassis"),
      ref: get(row, "REF"),
      status: get(row, "Status"),
      kondisi: get(row, "Kondisi"),
      assetCode: get(row, "Kode Aset"),
    });
  });

  if (rows.length === 0 && errors.length === 0)
    errors.push({ line: 0, message: "Tidak ada baris data di file." });
  return { rows, errors };
}

// Terapkan baris impor ke daftar aset. Aset dengan EQ sama diperbarui, dan
// perubahan REF / STATUS / KONDISI dicatat ke riwayat.
export function applyImport(
  current: Asset[],
  rows: ImportRow[],
  changedBy: string,
  nextHistoryId: number,
) {
  const assets = [...current];
  const newHistory: AssetHistory[] = [];
  let nextId = Math.max(0, ...current.map((a) => a.id)) + 1;
  let added = 0;
  let updated = 0;
  const warnings: ImportError[] = [];
  const now = new Date().toISOString();

  // Chassis dulu supaya modul bisa menemukan induknya di file yang sama.
  const ordered = [...rows].sort(
    (a, b) => Number(b.kind === "chassis") - Number(a.kind === "chassis"),
  );

  for (const r of ordered) {
    const idx = assets.findIndex((a) => a.eq.toLowerCase() === r.eq.toLowerCase());
    let parentId: number | null = null;
    if (r.kind === "module") {
      const parent = assets.find(
        (a) => a.kind === "chassis" && a.serialNumber.toLowerCase() === r.parentSn.toLowerCase(),
      );
      if (r.parentSn && !parent)
        warnings.push({ line: r.line, message: `SN Chassis "${r.parentSn}" tidak ditemukan, modul dibuat tanpa induk.` });
      parentId = parent?.id ?? null;
    }

    if (idx === -1) {
      assets.push({
        id: nextId++,
        kind: r.kind,
        parentId,
        mappingStatus: "belum",
        eq: r.eq,
        serialNumber: r.serialNumber,
        ref: r.ref,
        status: r.status || "Aktif",
        kondisi: r.kondisi || "Normal",
        assetCode: r.assetCode,
        officeId: r.officeId,
        labelStatus: "belum",
        labelCode: null,
      });
      added++;
      continue;
    }

    const old = assets[idx];
    const next: Asset = {
      ...old,
      kind: r.kind,
      parentId: r.kind === "module" ? (parentId ?? old.parentId) : null,
      serialNumber: r.serialNumber,
      officeId: r.officeId,
      assetCode: r.assetCode || old.assetCode,
      ref: r.ref || old.ref,
      status: r.status || old.status,
      kondisi: r.kondisi || old.kondisi,
    };
    for (const field of ["ref", "status", "kondisi"] as const) {
      if (old[field] !== next[field]) {
        newHistory.push({
          id: nextHistoryId++,
          assetId: old.id,
          field,
          oldValue: old[field],
          newValue: next[field],
          changedBy,
          changedAt: now,
        });
      }
    }
    assets[idx] = next;
    updated++;
  }

  return { assets, newHistory, added, updated, warnings };
}
