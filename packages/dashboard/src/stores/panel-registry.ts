import { create } from "zustand";
import type { ComponentType } from "react";

const panelMap = new Map<string, ComponentType>();

interface PanelRegistryStore {
	version: number;
}

const usePanelRegistryStore = create<PanelRegistryStore>(() => ({
	version: 0,
}));

export function registerPanel(moduleName: string, component: ComponentType) {
	panelMap.set(moduleName, component);
	usePanelRegistryStore.setState((s) => ({ version: s.version + 1 }));
}

export function getPanel(moduleName: string): ComponentType | undefined {
	return panelMap.get(moduleName);
}

export function usePanelRegistry() {
	usePanelRegistryStore((s) => s.version);

	return {
		getPanel: (name: string) => panelMap.get(name),
		has: (name: string) => panelMap.has(name),
	};
}
