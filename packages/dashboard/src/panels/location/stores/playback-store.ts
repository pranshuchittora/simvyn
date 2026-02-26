import { create } from "zustand";

interface PlaybackState {
	state: "idle" | "playing" | "paused";
	progress: number;
	currentLat: number | null;
	currentLon: number | null;
	speedMs: number;
	deviceId: string | null;
	setPlaybackState: (state: "idle" | "playing" | "paused") => void;
	setPosition: (lat: number, lon: number, progress: number) => void;
	setSpeed: (speed: number) => void;
	setDeviceId: (id: string | null) => void;
	reset: () => void;
}

export const usePlaybackStore = create<PlaybackState>((set) => ({
	state: "idle",
	progress: 0,
	currentLat: null,
	currentLon: null,
	speedMs: 10,
	deviceId: null,

	setPlaybackState: (state) => set({ state }),
	setPosition: (lat, lon, progress) => set({ currentLat: lat, currentLon: lon, progress }),
	setSpeed: (speed) => set({ speedMs: speed }),
	setDeviceId: (id) => set({ deviceId: id }),
	reset: () =>
		set({
			state: "idle",
			progress: 0,
			currentLat: null,
			currentLon: null,
			deviceId: null,
		}),
}));
