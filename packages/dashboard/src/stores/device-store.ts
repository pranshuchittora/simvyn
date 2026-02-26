import type { Device } from "@simvyn/types";
import { create } from "zustand";

interface DeviceStore {
	devices: Device[];
	selectedDeviceIds: string[];
	setDevices: (devices: Device[]) => void;
	selectDevice: (id: string) => void;
	toggleDevice: (id: string) => void;
	truncateToFirst: () => void;
	selectedDevice: () => Device | undefined;
}

export const useDeviceStore = create<DeviceStore>((set, get) => ({
	devices: [],
	selectedDeviceIds: [],

	setDevices: (devices) => {
		if (!Array.isArray(devices)) return;
		set({ devices });
		const state = get();
		const firstSelected = state.selectedDeviceIds[0];
		if (firstSelected && !devices.find((d) => d.id === firstSelected)) {
			const fallback = devices[0]?.id;
			set({ selectedDeviceIds: fallback ? [fallback] : [] });
		}
		if (state.selectedDeviceIds.length === 0 && devices.length > 0) {
			set({ selectedDeviceIds: [devices[0].id] });
		}
	},

	selectDevice: (id) => set({ selectedDeviceIds: [id] }),

	toggleDevice: (id) =>
		set((s) => {
			const idx = s.selectedDeviceIds.indexOf(id);
			if (idx >= 0) {
				if (s.selectedDeviceIds.length <= 1) return s;
				return { selectedDeviceIds: s.selectedDeviceIds.filter((x) => x !== id) };
			}
			return { selectedDeviceIds: [...s.selectedDeviceIds, id] };
		}),

	truncateToFirst: () =>
		set((s) => {
			if (s.selectedDeviceIds.length <= 1) return s;
			return { selectedDeviceIds: [s.selectedDeviceIds[0]] };
		}),

	selectedDevice: () => {
		const state = get();
		return state.devices.find((d) => d.id === state.selectedDeviceIds[0]);
	},
}));
