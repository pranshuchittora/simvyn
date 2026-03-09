import type { LogEntry, LogLevel } from "@simvyn/types";
import { create } from "zustand";

const ALL_LEVELS: LogLevel[] = ["verbose", "debug", "info", "warning", "error", "fatal"];

interface LogStore {
	entries: LogEntry[];
	firstItemIndex: number;
	cursor: number | null;
	hasMore: boolean;
	isLoadingHistory: boolean;
	isStreaming: boolean;
	streamDeviceId: string | null;
	isPaused: boolean;
	enabledLevels: LogLevel[];
	searchPattern: string;
	processFilter: string;

	addNewBatch: (batch: LogEntry[]) => void;
	prependHistory: (batch: LogEntry[], cursor: number, hasMore: boolean) => void;
	setLoadingHistory: (loading: boolean) => void;
	clear: () => void;
	reset: () => void;
	setStreaming: (deviceId: string | null) => void;
	pause: () => void;
	resume: () => void;
	toggleLevel: (level: LogLevel) => void;
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
	isPaused: false,
	enabledLevels: [...ALL_LEVELS] as LogLevel[],
	searchPattern: "",
	processFilter: "",
};

export const useLogStore = create<LogStore>((set) => ({
	...initialState,

	addNewBatch: (batch) =>
		set((s) => {
			if (s.isPaused) return s;
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
	pause: () => set({ isPaused: true }),
	resume: () => set({ isPaused: false }),
	toggleLevel: (level: LogLevel) =>
		set((s) => {
			const has = s.enabledLevels.includes(level);
			if (has && s.enabledLevels.length === 1) return s;
			return {
				enabledLevels: has
					? s.enabledLevels.filter((l) => l !== level)
					: [...s.enabledLevels, level],
			};
		}),
	setSearchPattern: (pattern) => set({ searchPattern: pattern }),
	setProcessFilter: (filter) => set({ processFilter: filter }),
}));

export function filterEntries(
	entries: LogEntry[],
	enabledLevels: LogLevel[],
	processFilter: string,
	searchPattern: string,
): LogEntry[] {
	let filtered = entries;

	if (enabledLevels.length < ALL_LEVELS.length) {
		filtered = filtered.filter((e) => enabledLevels.includes(e.level));
	}

	if (processFilter) {
		const pf = processFilter.toLowerCase();
		filtered = filtered.filter((e) => e.processName.toLowerCase().includes(pf));
	}

	if (searchPattern) {
		try {
			const re = new RegExp(searchPattern, "i");
			filtered = filtered.filter((e) => re.test(e.message) || re.test(e.processName));
		} catch {
			const sp = searchPattern.toLowerCase();
			filtered = filtered.filter(
				(e) => e.message.toLowerCase().includes(sp) || e.processName.toLowerCase().includes(sp),
			);
		}
	}

	return filtered;
}
