import { create } from "zustand";

interface ModuleInfo {
	name: string;
	version: string;
	description: string;
	icon?: string;
}

const DOCK_ORDER: string[] = [
	"devices",
	"apps",
	"logs",
	"screenshot",
	"deep-links",
	"push",
	"clipboard",
	"location",
	"media",
	"fs",
	"database",
	"crash-logs",
	"collections",
	"device-settings",
	"tool-settings",
];

function sortModules(modules: ModuleInfo[]): ModuleInfo[] {
	return [...modules].sort((a, b) => {
		const ai = DOCK_ORDER.indexOf(a.name);
		const bi = DOCK_ORDER.indexOf(b.name);
		return (ai === -1 ? DOCK_ORDER.length : ai) - (bi === -1 ? DOCK_ORDER.length : bi);
	});
}

interface ModuleStore {
	modules: ModuleInfo[];
	activeModule: string | null;
	setModules: (modules: ModuleInfo[]) => void;
	setActiveModule: (name: string) => void;
	clearActiveModule: () => void;
	fetchModules: () => Promise<void>;
}

export const useModuleStore = create<ModuleStore>((set) => ({
	modules: [],
	activeModule: null,

	setModules: (modules) => set({ modules: sortModules(modules) }),

	setActiveModule: (name) => set({ activeModule: name }),

	clearActiveModule: () => set({ activeModule: null }),

	fetchModules: async () => {
		try {
			const res = await fetch("/api/modules");
			if (res.ok) {
				const data = await res.json();
				if (Array.isArray(data)) {
					set({ modules: sortModules(data) });
				}
			}
		} catch {
			// server not available yet
		}
	},
}));
