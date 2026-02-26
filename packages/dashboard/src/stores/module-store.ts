import { create } from "zustand";

interface ModuleInfo {
	name: string;
	version: string;
	description: string;
	icon?: string;
}

interface ModuleStore {
	modules: ModuleInfo[];
	activeModule: string | null;
	setModules: (modules: ModuleInfo[]) => void;
	setActiveModule: (name: string) => void;
	fetchModules: () => Promise<void>;
}

export const useModuleStore = create<ModuleStore>((set) => ({
	modules: [],
	activeModule: null,

	setModules: (modules) => set({ modules }),

	setActiveModule: (name) => set({ activeModule: name }),

	fetchModules: async () => {
		try {
			const res = await fetch("/api/modules");
			if (res.ok) {
				const data = await res.json();
				if (Array.isArray(data)) {
					set({ modules: data });
				}
			}
		} catch {
			// server not available yet
		}
	},
}));
