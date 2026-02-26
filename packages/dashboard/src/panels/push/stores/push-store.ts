import { toast } from "sonner";
import { create } from "zustand";

interface Template {
	id: string;
	name: string;
	description: string;
	payload: Record<string, unknown>;
}

interface SavedPayload {
	id: string;
	name: string;
	bundleId?: string;
	payload: Record<string, unknown>;
	createdAt: string;
}

interface HistoryEntry {
	bundleId: string;
	payload: Record<string, unknown>;
	deviceId: string;
	deviceName: string;
	timestamp: string;
}

interface PushStore {
	templates: Template[];
	savedPayloads: SavedPayload[];
	history: HistoryEntry[];
	loading: boolean;
	sendPush: (deviceId: string, bundleId: string, payload: object) => Promise<void>;
	fetchTemplates: () => Promise<void>;
	fetchPayloads: () => Promise<void>;
	savePayload: (name: string, bundleId: string | undefined, payload: object) => Promise<void>;
	deletePayload: (id: string) => Promise<void>;
	fetchHistory: () => Promise<void>;
}

export type { Template, SavedPayload, HistoryEntry };

export const usePushStore = create<PushStore>((set) => ({
	templates: [],
	savedPayloads: [],
	history: [],
	loading: false,

	sendPush: async (deviceId, bundleId, payload) => {
		try {
			const res = await fetch("/api/modules/push/send", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ deviceId, bundleId, payload }),
			});
			if (!res.ok) {
				const data = await res.json().catch(() => ({ error: "Failed to send push" }));
				toast.error(data.error || "Failed to send push");
				return;
			}
			toast.success("Push notification sent");
		} catch {
			toast.error("Network error sending push");
		}
	},

	fetchTemplates: async () => {
		try {
			const res = await fetch("/api/modules/push/templates");
			if (!res.ok) return;
			const data = await res.json();
			set({ templates: data.templates ?? [] });
		} catch {
			// silent
		}
	},

	fetchPayloads: async () => {
		try {
			const res = await fetch("/api/modules/push/payloads");
			if (!res.ok) return;
			const data = await res.json();
			set({ savedPayloads: data.payloads ?? [] });
		} catch {
			// silent
		}
	},

	savePayload: async (name, bundleId, payload) => {
		try {
			const res = await fetch("/api/modules/push/payloads", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ name, bundleId, payload }),
			});
			if (!res.ok) {
				const data = await res.json().catch(() => ({ error: "Failed to save payload" }));
				toast.error(data.error || "Failed to save payload");
				return;
			}
			const data = await res.json();
			set((s) => ({ savedPayloads: [...s.savedPayloads, data] }));
			toast.success("Payload saved");
		} catch {
			toast.error("Network error saving payload");
		}
	},

	deletePayload: async (id) => {
		try {
			const res = await fetch(`/api/modules/push/payloads/${id}`, { method: "DELETE" });
			if (!res.ok) {
				toast.error("Failed to delete payload");
				return;
			}
			set((s) => ({ savedPayloads: s.savedPayloads.filter((p) => p.id !== id) }));
			toast.success("Payload deleted");
		} catch {
			toast.error("Network error deleting payload");
		}
	},

	fetchHistory: async () => {
		set({ loading: true });
		try {
			const res = await fetch("/api/modules/push/history");
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
