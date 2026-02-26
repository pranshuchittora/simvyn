import { create } from "zustand";

interface AppInfo {
	bundleId: string;
	name: string;
	version: string;
	type: "user" | "system";
	dataContainer?: string;
	appPath?: string;
}

interface AppStore {
	apps: AppInfo[];
	loading: boolean;
	error: string | null;
	filter: "all" | "user" | "system";
	setApps: (apps: AppInfo[]) => void;
	setLoading: (loading: boolean) => void;
	setError: (error: string | null) => void;
	setFilter: (filter: "all" | "user" | "system") => void;
	fetchApps: (deviceId: string) => Promise<void>;
}

export type { AppInfo };

export const useAppStore = create<AppStore>((set) => ({
	apps: [],
	loading: false,
	error: null,
	filter: "all",

	setApps: (apps) => set({ apps }),
	setLoading: (loading) => set({ loading }),
	setError: (error) => set({ error }),
	setFilter: (filter) => set({ filter }),

	fetchApps: async (deviceId: string) => {
		set({ loading: true, error: null });
		try {
			const res = await fetch(`/api/modules/apps/list/${deviceId}`);
			if (!res.ok) {
				const data = await res.json().catch(() => ({ error: "Failed to fetch apps" }));
				set({ error: data.error || "Failed to fetch apps", loading: false });
				return;
			}
			const data = await res.json();
			set({ apps: data.apps, loading: false });
		} catch {
			set({ error: "Network error", loading: false });
		}
	},
}));
