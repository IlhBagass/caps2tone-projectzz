"use client";

import { useSyncExternalStore } from "react";
import { assets as seedAssets, history as seedHistory } from "./mock-data";
import type { Asset, AssetHistory } from "./types";

// Penyimpanan sementara di memori browser yang dipakai bersama halaman teknisi
// dan admin, supaya input teknisi (foto, kode label, REF/STATUS) langsung
// terlihat di data aset admin selama pindah halaman tanpa refresh. Hilang saat
// refresh. Ganti dengan API + NeonDB saat backend siap.
interface StoreState {
  assets: Asset[];
  history: AssetHistory[];
}

let state: StoreState = { assets: seedAssets, history: seedHistory };
const listeners = new Set<() => void>();

function emit(next: StoreState) {
  state = next;
  listeners.forEach((l) => l());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

const getSnapshot = () => state;
const initialState = state;
const getServerSnapshot = () => initialState;

export function useAssetStore() {
  const s = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  return { assets: s.assets, history: s.history };
}

export function updateAsset(id: number, patch: Partial<Asset>) {
  emit({
    ...state,
    assets: state.assets.map((a) => (a.id === id ? { ...a, ...patch } : a)),
  });
}

export function setAssets(assets: Asset[]) {
  emit({ ...state, assets });
}

export function appendHistory(
  entries: Omit<AssetHistory, "id">[],
) {
  if (entries.length === 0) return;
  let nextId = state.history.reduce((m, h) => Math.max(m, h.id), 0) + 1;
  emit({
    ...state,
    history: [...state.history, ...entries.map((e) => ({ ...e, id: nextId++ }))],
  });
}
