import { create } from "zustand";

export interface SavedLocation {
	id: string;
	name: string;
	lat: number;
	lon: number;
	createdAt: number;
}

export interface SavedRoute {
	id: string;
	name: string;
	waypoints: [number, number][];
	createdAt: number;
}

interface FavoritesState {
	locations: SavedLocation[];
	routes: SavedRoute[];
	loading: boolean;
	fetchLocations: () => Promise<void>;
	fetchRoutes: () => Promise<void>;
	addLocation: (name: string, lat: number, lon: number) => Promise<void>;
	removeLocation: (id: string) => Promise<void>;
	addRoute: (name: string, waypoints: [number, number][]) => Promise<void>;
	removeRoute: (id: string) => Promise<void>;
}

export const useFavoritesStore = create<FavoritesState>((set, get) => ({
	locations: [],
	routes: [],
	loading: false,

	fetchLocations: async () => {
		set({ loading: true });
		try {
			const res = await fetch("/api/modules/location/favorites/locations");
			if (res.ok) {
				const locations = (await res.json()) as SavedLocation[];
				set({ locations });
			}
		} catch {
			// server unavailable
		} finally {
			set({ loading: false });
		}
	},

	fetchRoutes: async () => {
		set({ loading: true });
		try {
			const res = await fetch("/api/modules/location/favorites/routes");
			if (res.ok) {
				const routes = (await res.json()) as SavedRoute[];
				set({ routes });
			}
		} catch {
			// server unavailable
		} finally {
			set({ loading: false });
		}
	},

	addLocation: async (name, lat, lon) => {
		try {
			const res = await fetch("/api/modules/location/favorites/locations", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ name, lat, lon }),
			});
			if (res.ok) {
				const loc = (await res.json()) as SavedLocation;
				set((s) => ({ locations: [...s.locations, loc] }));
			}
		} catch {
			// network error
		}
	},

	removeLocation: async (id) => {
		try {
			const res = await fetch(`/api/modules/location/favorites/locations/${id}`, {
				method: "DELETE",
			});
			if (res.ok) {
				set((s) => ({
					locations: s.locations.filter((l) => l.id !== id),
				}));
			}
		} catch {
			// network error
		}
	},

	addRoute: async (name, waypoints) => {
		try {
			const res = await fetch("/api/modules/location/favorites/routes", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ name, waypoints }),
			});
			if (res.ok) {
				const route = (await res.json()) as SavedRoute;
				set((s) => ({ routes: [...s.routes, route] }));
			}
		} catch {
			// network error
		}
	},

	removeRoute: async (id) => {
		try {
			const res = await fetch(`/api/modules/location/favorites/routes/${id}`, {
				method: "DELETE",
			});
			if (res.ok) {
				set((s) => ({
					routes: s.routes.filter((r) => r.id !== id),
				}));
			}
		} catch {
			// network error
		}
	},
}));
