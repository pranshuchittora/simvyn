import { create } from "zustand";

interface LocationState {
	currentLat: number | null;
	currentLon: number | null;
	mode: "point" | "route";
	selectedDeviceId: string | null;
	setCurrentLocation: (lat: number, lon: number) => void;
	setMode: (mode: "point" | "route") => void;
	setSelectedDevice: (id: string | null) => void;
	clearLocation: () => void;
}

export const useLocationStore = create<LocationState>((set) => ({
	currentLat: null,
	currentLon: null,
	mode: "point",
	selectedDeviceId: null,

	setCurrentLocation: (lat, lon) => set({ currentLat: lat, currentLon: lon }),
	setMode: (mode) => set({ mode }),
	setSelectedDevice: (id) => set({ selectedDeviceId: id }),
	clearLocation: () => set({ currentLat: null, currentLon: null }),
}));
