import { create } from "zustand";

interface FavouriteStore {
	favouriteIds: Set<string>;
	loaded: boolean;
	load: () => Promise<void>;
	toggle: (id: string) => Promise<void>;
	isFavourite: (id: string) => boolean;
}

export const useFavouriteStore = create<FavouriteStore>((set, get) => ({
	favouriteIds: new Set<string>(),
	loaded: false,

	load: async () => {
		try {
			const res = await fetch("/api/modules/devices/favourites");
			if (res.ok) {
				const data = await res.json();
				const ids: string[] = data.favourites ?? [];
				set({ favouriteIds: new Set(ids), loaded: true });
			}
		} catch {
			// server not available yet
		}
	},

	toggle: async (id: string) => {
		const { favouriteIds } = get();
		const wasFavourite = favouriteIds.has(id);
		const next = new Set(favouriteIds);

		if (wasFavourite) {
			next.delete(id);
		} else {
			next.add(id);
		}
		set({ favouriteIds: next });

		try {
			const res = await fetch("/api/modules/devices/favourites", {
				method: wasFavourite ? "DELETE" : "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ deviceId: id }),
			});
			if (!res.ok) {
				// revert on failure
				set({ favouriteIds });
			}
		} catch {
			// revert on failure
			set({ favouriteIds });
		}
	},

	isFavourite: (id: string) => get().favouriteIds.has(id),
}));

// Auto-load on store creation
useFavouriteStore.getState().load();
