import { create } from "zustand";

export type PlaybackStatus = "idle" | "playing" | "paused";
export type SpeedUnit = "kmh" | "ms";

export interface SpeedPreset {
	label: string;
	speedKmh: number;
}

export const SPEED_PRESETS: SpeedPreset[] = [
	{ label: "Walking", speedKmh: 5 },
	{ label: "Cycling", speedKmh: 20 },
	{ label: "Driving", speedKmh: 50 },
	{ label: "Train", speedKmh: 160 },
	{ label: "Plane", speedKmh: 900 },
];

export const MULTIPLIERS = [1, 2, 5, 10] as const;

interface PlaybackState {
	status: PlaybackStatus;
	progress: number;
	currentPosition: [number, number] | null;
	speedKmh: number;
	speedUnit: SpeedUnit;
	multiplier: number;
	loop: boolean;
	setStatus: (s: PlaybackStatus) => void;
	setProgress: (p: number) => void;
	setCurrentPosition: (pos: [number, number] | null) => void;
	setSpeedKmh: (s: number) => void;
	setSpeedUnit: (u: SpeedUnit) => void;
	setMultiplier: (m: number) => void;
	setLoop: (l: boolean) => void;
	reset: () => void;
}

export const usePlaybackStore = create<PlaybackState>()((set) => ({
	status: "idle",
	progress: 0,
	currentPosition: null,
	speedKmh: 50,
	speedUnit: "kmh",
	multiplier: 1,
	loop: false,
	setStatus: (status) => set({ status }),
	setProgress: (progress) => set({ progress }),
	setCurrentPosition: (currentPosition) => set({ currentPosition }),
	setSpeedKmh: (speedKmh) => set({ speedKmh }),
	setSpeedUnit: (speedUnit) => set({ speedUnit }),
	setMultiplier: (multiplier) => set({ multiplier }),
	setLoop: (loop) => set({ loop }),
	reset: () => set({ status: "idle", progress: 0, currentPosition: null }),
}));

export function kmhToMs(kmh: number): number {
	return kmh / 3.6;
}

export function msToKmh(ms: number): number {
	return ms * 3.6;
}
