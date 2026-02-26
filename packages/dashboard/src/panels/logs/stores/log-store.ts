import type { LogEntry, LogLevel } from "@simvyn/types";
import { create } from "zustand";

interface LogStore {
	entries: LogEntry[];
	firstItemIndex: number;
	cursor: number | null;
	hasMore: boolean;
	isLoadingHistory: boolean;
	isStreaming: boolean;
	streamDeviceId: string | null;
	minLevel: LogLevel;
	searchPattern: string;
	processFilter: string;

	addNewBatch: (batch: LogEntry[]) => void;
	prependHistory: (batch: LogEntry[], cursor: number, hasMore: boolean) => void;
	setLoadingHistory: (loading: boolean) => void;
	clear: () => void;
	reset: () => void;
	setStreaming: (deviceId: string | null) => void;
	setMinLevel: (level: LogLevel) => void;
	setSearchPattern: (pattern: string) => void;
	setProcessFilter: (filter: string) => void;
}

const INITIAL_INDEX = 100_000;
const MAX_ENTRIES = 5_000;

const initialState = {
	entries: [] as LogEntry[],
	firstItemIndex: INITIAL_INDEX,
	cursor: null as number | null,
	hasMore: true,
	isLoadingHistory: false,
	isStreaming: false,
	streamDeviceId: null as string | null,
	minLevel: "verbose" as LogLevel,
	searchPattern: "",
	processFilter: "",
};

export const useLogStore = create<LogStore>((set) => ({
	...initialState,

	addNewBatch: (batch) =>
		set((s) => {
			const newEntries = [...batch].reverse();
			const combined = [...newEntries, ...s.entries];
			const trimmed = combined.length > MAX_ENTRIES ? combined.slice(0, MAX_ENTRIES) : combined;
			return { entries: trimmed };
		}),

	prependHistory: (batch, cursor, hasMore) =>
		set((s) => {
			const combined = [...s.entries, ...batch];
			const trimmed = combined.length > MAX_ENTRIES ? combined.slice(0, MAX_ENTRIES) : combined;
			return {
				entries: trimmed,
				firstItemIndex: s.firstItemIndex - batch.length,
				cursor,
				hasMore,
				isLoadingHistory: false,
			};
		}),

	setLoadingHistory: (loading) => set({ isLoadingHistory: loading }),

	clear: () =>
		set({
			entries: [],
			firstItemIndex: INITIAL_INDEX,
			cursor: null,
			hasMore: true,
		}),

	reset: () => set({ ...initialState }),

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
