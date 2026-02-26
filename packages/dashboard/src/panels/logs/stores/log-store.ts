import type { LogEntry, LogLevel } from "@simvyn/types";
import { create } from "zustand";

interface LogStore {
	entries: LogEntry[];
	isStreaming: boolean;
	streamDeviceId: string | null;
	minLevel: LogLevel;
	searchPattern: string;
	processFilter: string;
	addBatch: (batch: LogEntry[]) => void;
	clear: () => void;
	setStreaming: (deviceId: string | null) => void;
	setMinLevel: (level: LogLevel) => void;
	setSearchPattern: (pattern: string) => void;
	setProcessFilter: (filter: string) => void;
}

const MAX_ENTRIES = 50_000;

export const useLogStore = create<LogStore>((set) => ({
	entries: [],
	isStreaming: false,
	streamDeviceId: null,
	minLevel: "verbose",
	searchPattern: "",
	processFilter: "",

	addBatch: (batch) =>
		set((s) => {
			const combined = s.entries.concat(batch);
			return {
				entries:
					combined.length > MAX_ENTRIES ? combined.slice(combined.length - MAX_ENTRIES) : combined,
			};
		}),

	clear: () => set({ entries: [] }),

	setStreaming: (deviceId) => set({ streamDeviceId: deviceId, isStreaming: deviceId !== null }),

	setMinLevel: (level) => set({ minLevel: level }),
	setSearchPattern: (pattern) => set({ searchPattern: pattern }),
	setProcessFilter: (filter) => set({ processFilter: filter }),
}));

const LEVELS: LogLevel[] = ["verbose", "debug", "info", "warning", "error", "fatal"];

export function selectFilteredEntries(state: LogStore): LogEntry[] {
	const minIdx = LEVELS.indexOf(state.minLevel);
	let filtered = state.entries;

	if (minIdx > 0) {
		filtered = filtered.filter((e) => LEVELS.indexOf(e.level) >= minIdx);
	}

	if (state.processFilter) {
		const pf = state.processFilter.toLowerCase();
		filtered = filtered.filter((e) => e.processName.toLowerCase().includes(pf));
	}

	if (state.searchPattern) {
		try {
			const re = new RegExp(state.searchPattern, "i");
			filtered = filtered.filter((e) => re.test(e.message) || re.test(e.processName));
		} catch {
			const sp = state.searchPattern.toLowerCase();
			filtered = filtered.filter(
				(e) => e.message.toLowerCase().includes(sp) || e.processName.toLowerCase().includes(sp),
			);
		}
	}

	return filtered;
}
