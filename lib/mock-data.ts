// DATA SEMENTARA untuk pengembangan front end. Ganti dengan pemanggilan API
// setelah backend siap.
import type {
  Asset,
  AssetHistory,
  MappingResult,
  MappingSchedule,
  MappingStatus,
  Office,
} from "./types";

export function isoDate(offsetDays = 0): string {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  return d.toISOString().slice(0, 10);
}

const extraOffices: Office[] = [
  { id: 4, code: "KTR-LWY", name: "Laweyan", address: "Jl. Dr. Rajiman, Surakarta" },
  { id: 5, code: "KTR-BJS", name: "Banjarsari", address: "Jl. Slamet Riyadi, Surakarta" },
  { id: 6, code: "KTR-JBR", name: "Jebres", address: "Jl. Ir. Sutami, Surakarta" },
  { id: 7, code: "KTR-PKL", name: "Pasar Kliwon", address: "Jl. Veteran, Surakarta" },
  { id: 8, code: "KTR-SRG", name: "Serengan", address: "Jl. Ronggowarsito, Surakarta" },
  { id: 9, code: "KTR-KTS", name: "Kartasura", address: "Jl. Ahmad Yani, Sukoharjo" },
  { id: 10, code: "KTR-PLR", name: "Palur", address: "Jl. Raya Palur, Karanganyar" },
  { id: 11, code: "KTR-CLM", name: "Colomadu", address: "Jl. Adi Sucipto, Karanganyar" },
];

export const offices: Office[] = [
  { id: 1, code: "KTR-MJS", name: "Mojosongo", address: "Jl. Mojosongo, Surakarta" },
  { id: 2, code: "KTR-BDG", name: "Bandung", address: "Jl. Asia Afrika No. 10, Bandung" },
  { id: 3, code: "KTR-JKT", name: "Jakarta", address: "Jl. Gatot Subroto No. 5, Jakarta" },
  ...extraOffices,
];

type AssetSeed = Omit<Asset, "labelStatus" | "labelCode"> & {
  labelStatus?: Asset["labelStatus"];
  labelCode?: string;
};

const assetSeeds: AssetSeed[] = [
  // Mojosongo
  { id: 1, kind: "chassis", parentId: null, mappingStatus: "sudah", eq: "EQ-C001", serialNumber: "CH-MJS-01", ref: "RK-01", status: "Aktif", kondisi: "Normal", assetCode: "AST-MJS-C01", officeId: 1, labelStatus: "terpasang", labelCode: "LBL-C001" },
  { id: 2, kind: "chassis", parentId: null, mappingStatus: "belum", eq: "20000011079", serialNumber: "WZ-9700E-JVBB-PWD2-M920OLA", ref: "RK-02", status: "Aktif", kondisi: "Normal", assetCode: "TIF3-PWB-04-0009-00048", officeId: 1 },
  { id: 3, kind: "module", parentId: 1, mappingStatus: "sudah", eq: "EQ-0001", serialNumber: "SN-A1001", ref: "RK-01", status: "Aktif", kondisi: "Normal", assetCode: "AST-MJS-0001", officeId: 1, labelStatus: "terpasang", labelCode: "LBL-0001" },
  { id: 4, kind: "module", parentId: 1, mappingStatus: "belum", eq: "EQ-0002", serialNumber: "SN-A1002", ref: "RK-01", status: "Aktif", kondisi: "Normal", assetCode: "AST-MJS-0002", officeId: 1 },
  { id: 5, kind: "module", parentId: 1, mappingStatus: "tidak_ditemukan", eq: "EQ-0003", serialNumber: "SN-A1003", ref: "RK-01", status: "Aktif", kondisi: "Normal", assetCode: "AST-MJS-0003", officeId: 1 },
  { id: 6, kind: "module", parentId: 2, mappingStatus: "belum", eq: "EQ-0004", serialNumber: "SN-A1004", ref: "RK-02", status: "Aktif", kondisi: "Normal", assetCode: "AST-MJS-0004", officeId: 1 },
  { id: 7, kind: "module", parentId: 2, mappingStatus: "belum", eq: "EQ-0005", serialNumber: "SN-A1005", ref: "RK-02", status: "Aktif", kondisi: "Normal", assetCode: "AST-MJS-0005", officeId: 1 },
  // Bandung
  { id: 8, kind: "chassis", parentId: null, mappingStatus: "belum", eq: "EQ-C003", serialNumber: "CH-BDG-01", ref: "RK-05", status: "Aktif", kondisi: "Normal", assetCode: "AST-BDG-C01", officeId: 2 },
  { id: 9, kind: "module", parentId: 8, mappingStatus: "belum", eq: "EQ-0006", serialNumber: "SN-B2001", ref: "RK-05", status: "Aktif", kondisi: "Normal", assetCode: "AST-BDG-0001", officeId: 2 },
  { id: 10, kind: "module", parentId: 8, mappingStatus: "belum", eq: "EQ-0007", serialNumber: "SN-B2002", ref: "RK-05", status: "Rusak", kondisi: "Rusak", assetCode: "AST-BDG-0002", officeId: 2 },
  // Jakarta. Dua EQ dengan SN sama untuk menguji hasil "multiple".
  { id: 11, kind: "chassis", parentId: null, mappingStatus: "belum", eq: "EQ-C004", serialNumber: "CH-JKT-01", ref: "RK-09", status: "Aktif", kondisi: "Normal", assetCode: "AST-JKT-C01", officeId: 3 },
  { id: 12, kind: "module", parentId: 11, mappingStatus: "belum", eq: "EQ-0008", serialNumber: "SN-DUP900", ref: "RK-09", status: "Aktif", kondisi: "Normal", assetCode: "AST-JKT-0001", officeId: 3 },
  { id: 13, kind: "module", parentId: 11, mappingStatus: "belum", eq: "EQ-0009", serialNumber: "SN-DUP900", ref: "RK-09", status: "Aktif", kondisi: "Normal", assetCode: "AST-JKT-0002", officeId: 3 },
  { id: 14, kind: "module", parentId: 11, mappingStatus: "belum", eq: "EQ-0010", serialNumber: "SN-C3001", ref: "RK-09", status: "Aktif", kondisi: "Normal", assetCode: "AST-JKT-0003", officeId: 3 },
];

// Data tambahan untuk kantor 4 dst., dibuat otomatis supaya daftar cukup
// panjang untuk menguji tampilan scroll.
function generateAssets(): AssetSeed[] {
  const out: AssetSeed[] = [];
  const cycle: MappingStatus[] = ["sudah", "belum", "tidak_ditemukan", "belum", "sudah"];
  let id = 100;
  extraOffices.forEach((office, oi) => {
    const suffix = office.code.slice(4);
    const chassisTotal = 1 + (oi % 2);
    for (let c = 0; c < chassisTotal; c++) {
      const chassisId = id++;
      const verified = (oi + c) % 3 === 0;
      out.push({
        id: chassisId,
        kind: "chassis",
        parentId: null,
        mappingStatus: verified ? "sudah" : "belum",
        eq: `EQ-C${chassisId}`,
        serialNumber: `CH-${suffix}-0${c + 1}`,
        ref: `RK-${oi + 10}`,
        status: "Aktif",
        kondisi: "Normal",
        assetCode: `AST-${suffix}-C0${c + 1}`,
        officeId: office.id,
      });
      const moduleCount = 2 + ((oi + c) % 3);
      for (let m = 0; m < moduleCount; m++) {
        const moduleId = id++;
        out.push({
          id: moduleId,
          kind: "module",
          parentId: chassisId,
          mappingStatus: verified ? cycle[(m + oi) % cycle.length] : "belum",
          eq: `EQ-${moduleId}`,
          serialNumber: `SN-${suffix}${c}${m}`,
          ref: `RK-${oi + 10}`,
          status: "Aktif",
          kondisi: "Normal",
          assetCode: `AST-${suffix}-${moduleId}`,
          officeId: office.id,
        });
      }
    }
  });
  return out;
}

export const assets: Asset[] = [...assetSeeds, ...generateAssets()].map((a) => ({
  labelStatus: "belum",
  labelCode: null,
  ...a,
}));

export const schedules: MappingSchedule[] = [
  { id: 1, officeId: 1, scheduledDate: isoDate(0), assignedTo: "Budi Santoso", status: "berjalan" },
  { id: 2, officeId: 2, scheduledDate: isoDate(0), assignedTo: null, status: "terjadwal" },
  { id: 3, officeId: 3, scheduledDate: isoDate(2), assignedTo: "Budi Santoso", status: "terjadwal" },
  { id: 4, officeId: 1, scheduledDate: isoDate(-3), assignedTo: "Budi Santoso", status: "selesai" },
  { id: 5, officeId: 4, scheduledDate: isoDate(0), assignedTo: "Budi Santoso", status: "terjadwal" },
  { id: 6, officeId: 5, scheduledDate: isoDate(0), assignedTo: null, status: "terjadwal" },
  { id: 7, officeId: 6, scheduledDate: isoDate(0), assignedTo: "Budi Santoso", status: "terjadwal" },
  { id: 8, officeId: 7, scheduledDate: isoDate(3), assignedTo: "Sari Wulandari", status: "terjadwal" },
];

export const results: MappingResult[] = [
  { id: 1, scheduleId: 1, assetId: 3, scannedSn: "SN-A1001", result: "found", scannedBy: "Budi Santoso", scannedAt: new Date().toISOString(), labelAttached: true },
  { id: 2, scheduleId: 1, assetId: null, scannedSn: "SN-ZZ999", result: "not_found", scannedBy: "Budi Santoso", scannedAt: new Date().toISOString(), labelAttached: false },
];

export const history: AssetHistory[] = [
  { id: 1, assetId: 10, field: "status", oldValue: "Aktif", newValue: "Rusak", changedBy: "Budi Santoso", changedAt: new Date(Date.now() - 864e5).toISOString() },
  { id: 2, assetId: 10, field: "kondisi", oldValue: "Normal", newValue: "Rusak", changedBy: "Budi Santoso", changedAt: new Date(Date.now() - 864e5).toISOString() },
];

export const mockTechnicians = ["Budi Santoso", "Sari Wulandari"];
export const currentTechnician = "Budi Santoso";

export function getOffice(id: number): Office | undefined {
  return offices.find((o) => o.id === id);
}
