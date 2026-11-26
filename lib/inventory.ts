// Master inventaris (hanya baca) dari backend: jenis perangkat, site, dan aset hasil impor CSV.
// Berdiri sendiri: Equipment ID di sini berbeda dari EQ di Data Aset, dan site berbeda dari kantor.
import { queryString } from "@/lib/api";
import { api } from "@/lib/api-client";

export interface InventoryItem {
  id: number;
  equipmentId: string;
  inventoryNumber: string;
  nka: string;
  nkaAcqDate: string | null;
  serialNumber: string;
  superiorEquipment: string;
  remarks: string;
  typeId: number;
  typeName: string;
  category: string;
  objectType: string;
  manufacturer: string;
  model: string;
  partNumber: string;
  siteId: number;
  siteCode: string;
  siteName: string;
  functionalLocation: string;
}

export interface EquipmentType {
  id: number;
  name: string;
  category: string;
  objectType: string;
  manufacturer: string;
  model: string;
  partNumber: string;
  /** Jumlah aset inventaris dengan jenis ini. */
  items: number;
}

export interface InventorySite {
  id: number;
  code: string;
  name: string;
  functionalLocation: string;
  description: string;
  territory: string;
  regionalCode: string;
  regionalName: string;
  districtCode: string;
  districtName: string;
  costCenter: string;
  maintenancePlant: string;
  workCenter: string;
  /** Jumlah aset inventaris di site ini. */
  items: number;
}

export interface InventoryDetail {
  id: number;
  equipmentId: string;
  inventoryNumber: string;
  nka: string;
  nkaAcqDate: string | null;
  serialNumber: string;
  superiorEquipment: string;
  remarks: string;
  createdAt: string;
  updatedAt: string;
  type: Omit<EquipmentType, "items">;
  site: Omit<InventorySite, "items">;
}

export interface InventoryFilters {
  search?: string;
  typeId?: number;
  siteId?: number;
  dateFrom?: string;
  dateTo?: string;
  page: number;
  limit: number;
}

export async function listInventory(filters: InventoryFilters): Promise<{ rows: InventoryItem[]; total: number }> {
  const { data, meta } = await api.page<InventoryItem>(`/api/inventory${queryString({ ...filters })}`);
  return { rows: data, total: meta?.total ?? data.length };
}

async function listAll<T>(path: string): Promise<T[]> {
  const all: T[] = [];
  for (let page = 1; ; page++) {
    const { data, meta } = await api.page<T>(`${path}?limit=100&page=${page}`);
    all.push(...data);
    if (!meta || all.length >= meta.total || data.length === 0) return all;
  }
}

export const listEquipmentTypes = () => listAll<EquipmentType>("/api/equipment-types");
export const listInventorySites = () => listAll<InventorySite>("/api/inventory-sites");
export const getInventoryItem = (id: number) => api.get<InventoryDetail>(`/api/inventory/${id}`);
