import type { MappingStatus } from "./types";

export const mappingLabel: Record<MappingStatus, string> = {
  sudah: "Sudah termapping",
  belum: "Belum termapping",
  tidak_ditemukan: "Tidak ditemukan",
};

export const mappingTone: Record<MappingStatus, "green" | "gray" | "red"> = {
  sudah: "green",
  belum: "gray",
  tidak_ditemukan: "red",
};
