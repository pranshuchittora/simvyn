import { create } from "zustand";

interface RouteState {
	waypoints: [number, number][];
	addWaypoint: (lat: number, lon: number) => void;
	removeWaypoint: (index: number) => void;
	clearWaypoints: () => void;
	setWaypoints: (waypoints: [number, number][]) => void;
}

export const useRouteStore = create<RouteState>((set) => ({
	waypoints: [],

	addWaypoint: (lat, lon) => set((s) => ({ waypoints: [...s.waypoints, [lat, lon]] })),

	removeWaypoint: (index) =>
		set((s) => ({
			waypoints: s.waypoints.filter((_, i) => i !== index),
		})),

	clearWaypoints: () => set({ waypoints: [] }),

	setWaypoints: (waypoints) => set({ waypoints }),
}));
