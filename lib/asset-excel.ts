import type ExcelJS from "exceljs";
import type { Office } from "@/lib/types";

// Impor dan ekspor Excel dilakukan backend (lib/assets.ts). Di browser hanya tersisa template impor.

// Kolom yang dikenali saat impor. Label dan Kode Label hanya ada di hasil ekspor dan diabaikan saat impor.
const IMPORT_COLUMNS = [
  { key: "eq", header: "EQ", width: 18 },
  { key: "kind", header: "Jenis", width: 12 },
  { key: "serialNumber", header: "Serial Number", width: 30 },
  { key: "officeCode", header: "Kode Kantor", width: 14 },
  { key: "parentSn", header: "SN Chassis", width: 30 },
  { key: "ref", header: "REF", width: 12 },
  { key: "status", header: "Status", width: 12 },
  { key: "kondisi", header: "Kondisi", width: 12 },
  { key: "assetCode", header: "Kode Aset", width: 26 },
] as const;

const XLSX_MIME = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

/** Simpan blob sebagai berkas unduhan di browser. */
export function saveBlob(data: Blob | ArrayBuffer, filename: string) {
  const url = URL.createObjectURL(data instanceof Blob ? data : new Blob([data], { type: XLSX_MIME }));
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

export async function downloadTemplate(offices: Pick<Office, "code">[]) {
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
    { a: "SN Chassis", b: "Hanya untuk Modul: serial number chassis induknya. Harus cocok tepat satu chassis di kantor yang sama." },
    { a: "REF / Status / Kondisi", b: "Opsional. Kolom yang ada di file tetapi sel-nya kosong akan mengosongkan nilai itu. Perubahan dicatat ke riwayat." },
    { a: "Kode Aset", b: "Opsional." },
    { a: "Label / Kode Label", b: "Hanya ada di hasil ekspor. Boleh tetap ada di file, tetapi diabaikan saat impor." },
  ]);
  saveBlob(await wb.xlsx.writeBuffer(), "template-data-aset.xlsx");
}
