import { create } from "zustand";

export type InteractionMode = "point" | "route";

interface RouteState {
	interactionMode: InteractionMode;
	waypoints: [number, number][];
	setInteractionMode: (mode: InteractionMode) => void;
	addWaypoint: (pos: [number, number]) => void;
	updateWaypoint: (index: number, pos: [number, number]) => void;
	removeWaypoint: (index: number) => void;
	setWaypoints: (waypoints: [number, number][]) => void;
	clearRoute: () => void;
}

export const useRouteStore = create<RouteState>()((set) => ({
	interactionMode: "point",
	waypoints: [],
	setInteractionMode: (mode) => set({ interactionMode: mode }),
	addWaypoint: (pos) => set((state) => ({ waypoints: [...state.waypoints, pos] })),
	updateWaypoint: (index, pos) =>
		set((state) => ({
			waypoints: state.waypoints.map((wp, i) => (i === index ? pos : wp)),
		})),
	removeWaypoint: (index) =>
		set((state) => ({
			waypoints: state.waypoints.filter((_, i) => i !== index),
		})),
	setWaypoints: (waypoints) => set({ waypoints }),
	clearRoute: () => set({ waypoints: [] }),
}));
