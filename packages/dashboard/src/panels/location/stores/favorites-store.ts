import { create } from "zustand";

export interface SavedLocation {
	id: string;
	name: string;
	lat: number;
	lon: number;
	address?: string;
	emoji?: string;
	createdAt: string;
}

export interface SavedRoute {
	id: string;
	name: string;
	waypoints: [number, number][];
	createdAt: string;
}

interface FavoritesState {
	locations: SavedLocation[];
	routes: SavedRoute[];
	loading: boolean;

	fetchLocations: () => Promise<void>;
	fetchRoutes: () => Promise<void>;
	saveLocation: (data: {
		name: string;
		lat: number;
		lon: number;
		address?: string;
		emoji?: string;
	}) => Promise<void>;
	saveRoute: (data: { name: string; waypoints: [number, number][] }) => Promise<void>;
	deleteLocation: (id: string) => Promise<void>;
	deleteRoute: (id: string) => Promise<void>;
}

export const useFavoritesStore = create<FavoritesState>()((set, get) => ({
	locations: [],
	routes: [],
	loading: false,

	async fetchLocations() {
		set({ loading: true });
		try {
			const res = await fetch("/api/modules/location/favorites/locations");
			const data = await res.json();
			set({ locations: data });
		} finally {
			set({ loading: false });
		}
	},

	async fetchRoutes() {
		set({ loading: true });
		try {
			const res = await fetch("/api/modules/location/favorites/routes");
			const data = await res.json();
			set({ routes: data });
		} finally {
			set({ loading: false });
		}
	},

	async saveLocation(data) {
		await fetch("/api/modules/location/favorites/locations", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify(data),
		});
		await get().fetchLocations();
	},

	async saveRoute(data) {
		await fetch("/api/modules/location/favorites/routes", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify(data),
		});
		await get().fetchRoutes();
	},

	async deleteLocation(id) {
		await fetch(`/api/modules/location/favorites/locations/${id}`, { method: "DELETE" });
		await get().fetchLocations();
	},

	async deleteRoute(id) {
		await fetch(`/api/modules/location/favorites/routes/${id}`, { method: "DELETE" });
		await get().fetchRoutes();
	},
}));
