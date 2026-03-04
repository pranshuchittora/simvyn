import type { ActionParam, Collection, CollectionStep } from "@simvyn/types";
import { toast } from "sonner";
import { create } from "zustand";

export interface SerializedAction {
	id: string;
	label: string;
	description: string;
	module: string;
	params: ActionParam[];
}

interface CollectionsStore {
	collections: Collection[];
	actions: SerializedAction[];
	loading: boolean;
	activeCollectionId: string | null;
	fetchCollections: () => Promise<void>;
	fetchActions: () => Promise<void>;
	createCollection: (name: string) => Promise<void>;
	updateCollection: (
		id: string,
		data: { name?: string; description?: string; steps?: CollectionStep[] },
	) => Promise<void>;
	deleteCollection: (id: string) => Promise<void>;
	duplicateCollection: (id: string) => Promise<void>;
	setActiveCollectionId: (id: string | null) => void;
}

export const useCollectionsStore = create<CollectionsStore>((set) => ({
	collections: [],
	actions: [],
	loading: false,
	activeCollectionId: null,

	fetchCollections: async () => {
		set({ loading: true });
		try {
			const res = await fetch("/api/modules/collections/");
			if (!res.ok) {
				set({ loading: false });
				return;
			}
			const data = await res.json();
			set({ collections: data, loading: false });
		} catch {
			set({ loading: false });
		}
	},

	fetchActions: async () => {
		try {
			const res = await fetch("/api/modules/collections/actions");
			if (!res.ok) return;
			const data = await res.json();
			set({ actions: data });
		} catch {
			// silent
		}
	},

	createCollection: async (name) => {
		try {
			const res = await fetch("/api/modules/collections/", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ name }),
			});
			if (!res.ok) {
				const data = await res.json().catch(() => ({ error: "Failed to create collection" }));
				toast.error(data.error || "Failed to create collection");
				return;
			}
			const collection = await res.json();
			set((s) => ({
				collections: [collection, ...s.collections],
				activeCollectionId: collection.id,
			}));
			toast.success("Collection created");
		} catch {
			toast.error("Network error creating collection");
		}
	},

	updateCollection: async (id, data) => {
		try {
			const res = await fetch(`/api/modules/collections/${id}`, {
				method: "PUT",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify(data),
			});
			if (!res.ok) {
				const err = await res.json().catch(() => ({ error: "Failed to update collection" }));
				toast.error(err.error || "Failed to update collection");
				return;
			}
			const updated = await res.json();
			set((s) => ({
				collections: s.collections.map((c) => (c.id === id ? updated : c)),
			}));
			toast.success("Collection updated");
		} catch {
			toast.error("Network error updating collection");
		}
	},

	deleteCollection: async (id) => {
		try {
			const res = await fetch(`/api/modules/collections/${id}`, { method: "DELETE" });
			if (!res.ok) {
				toast.error("Failed to delete collection");
				return;
			}
			set((s) => ({
				collections: s.collections.filter((c) => c.id !== id),
				activeCollectionId: s.activeCollectionId === id ? null : s.activeCollectionId,
			}));
			toast.success("Collection deleted");
		} catch {
			toast.error("Network error deleting collection");
		}
	},

	duplicateCollection: async (id) => {
		try {
			const res = await fetch(`/api/modules/collections/${id}/duplicate`, { method: "POST" });
			if (!res.ok) {
				toast.error("Failed to duplicate collection");
				return;
			}
			const duplicate = await res.json();
			set((s) => ({ collections: [duplicate, ...s.collections] }));
			toast.success("Collection duplicated");
		} catch {
			toast.error("Network error duplicating collection");
		}
	},

	setActiveCollectionId: (id) => set({ activeCollectionId: id }),
}));
