import { toast } from "sonner";
import { create } from "zustand";

interface Favorite {
	id: string;
	url: string;
	label: string;
	bundleId?: string;
	createdAt: string;
}

interface HistoryEntry {
	url: string;
	deviceId: string;
	deviceName: string;
	timestamp: string;
}

interface DeepLinksStore {
	favorites: Favorite[];
	history: HistoryEntry[];
	loading: boolean;
	openUrl: (deviceId: string, url: string) => Promise<void>;
	fetchFavorites: () => Promise<void>;
	addFavorite: (url: string, label: string, bundleId?: string) => Promise<void>;
	removeFavorite: (id: string) => Promise<void>;
	fetchHistory: () => Promise<void>;
}

export type { Favorite, HistoryEntry };

export const useDeepLinksStore = create<DeepLinksStore>((set) => ({
	favorites: [],
	history: [],
	loading: false,

	openUrl: async (deviceId, url) => {
		try {
			const res = await fetch("/api/modules/deep-links/open", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ deviceId, url }),
			});
			if (!res.ok) {
				const data = await res.json().catch(() => ({ error: "Failed to open URL" }));
				toast.error(data.error || "Failed to open URL");
				return;
			}
			toast.success("URL opened on device");
		} catch {
			toast.error("Network error opening URL");
		}
	},

	fetchFavorites: async () => {
		try {
			const res = await fetch("/api/modules/deep-links/favorites");
			if (!res.ok) return;
			const data = await res.json();
			set({ favorites: data.favorites ?? [] });
		} catch {
			// silent
		}
	},

	addFavorite: async (url, label, bundleId) => {
		try {
			const res = await fetch("/api/modules/deep-links/favorites", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ url, label, bundleId }),
			});
			if (!res.ok) {
				const data = await res.json().catch(() => ({ error: "Failed to save favorite" }));
				toast.error(data.error || "Failed to save favorite");
				return;
			}
			const data = await res.json();
			set((s) => ({ favorites: [...s.favorites, data] }));
			toast.success("Favorite saved");
		} catch {
			toast.error("Network error saving favorite");
		}
	},

	removeFavorite: async (id) => {
		try {
			const res = await fetch(`/api/modules/deep-links/favorites/${id}`, { method: "DELETE" });
			if (!res.ok) {
				toast.error("Failed to remove favorite");
				return;
			}
			set((s) => ({ favorites: s.favorites.filter((f) => f.id !== id) }));
			toast.success("Favorite removed");
		} catch {
			toast.error("Network error removing favorite");
		}
	},

	fetchHistory: async () => {
		set({ loading: true });
		try {
			const res = await fetch("/api/modules/deep-links/history");
			if (!res.ok) {
				set({ loading: false });
				return;
			}
			const data = await res.json();
			set({ history: data.history ?? [], loading: false });
		} catch {
			set({ loading: false });
		}
	},
}));
