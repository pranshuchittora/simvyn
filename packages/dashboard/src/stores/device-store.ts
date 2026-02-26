import { create } from "zustand";
import type { Device } from "@simvyn/types";

interface DeviceStore {
	devices: Device[];
	selectedDeviceId: string | null;
	broadcastMode: boolean;
	setDevices: (devices: Device[]) => void;
	selectDevice: (id: string) => void;
	toggleBroadcast: () => void;
	selectedDevice: () => Device | undefined;
}

export const useDeviceStore = create<DeviceStore>((set, get) => ({
	devices: [],
	selectedDeviceId: null,
	broadcastMode: false,

	setDevices: (devices) => {
		set({ devices });
		const state = get();
		if (state.selectedDeviceId && !devices.find((d) => d.id === state.selectedDeviceId)) {
			set({ selectedDeviceId: devices[0]?.id ?? null });
		}
		if (!state.selectedDeviceId && devices.length > 0) {
			set({ selectedDeviceId: devices[0].id });
		}
	},

	selectDevice: (id) => set({ selectedDeviceId: id, broadcastMode: false }),

	toggleBroadcast: () =>
		set((s) => ({ broadcastMode: !s.broadcastMode })),

	selectedDevice: () => {
		const state = get();
		return state.devices.find((d) => d.id === state.selectedDeviceId);
	},
}));
