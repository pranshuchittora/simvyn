import { create } from "zustand";

interface SearchStore {
	isOpen: boolean;
	query: string;
	isRegex: boolean;
	matchIndices: number[];
	currentMatchIdx: number;
	totalMatches: number;

	open: () => void;
	close: () => void;
	setQuery: (q: string) => void;
	toggleRegex: () => void;
	setMatches: (indices: number[]) => void;
	nextMatch: () => void;
	prevMatch: () => void;
}

export const useSearchStore = create<SearchStore>((set) => ({
	isOpen: false,
	query: "",
	isRegex: false,
	matchIndices: [],
	currentMatchIdx: -1,
	totalMatches: 0,

	open: () => set({ isOpen: true }),
	close: () =>
		set({
			isOpen: false,
			query: "",
			matchIndices: [],
			currentMatchIdx: -1,
			totalMatches: 0,
		}),
	setQuery: (q) =>
		set({
			query: q,
			currentMatchIdx: q ? 0 : -1,
		}),
	toggleRegex: () => set((s) => ({ isRegex: !s.isRegex })),
	setMatches: (indices) =>
		set((s) => ({
			matchIndices: indices,
			totalMatches: indices.length,
			currentMatchIdx:
				indices.length === 0
					? -1
					: s.currentMatchIdx >= indices.length
						? 0
						: s.currentMatchIdx < 0
							? 0
							: s.currentMatchIdx,
		})),
	nextMatch: () =>
		set((s) => {
			if (s.totalMatches === 0) return s;
			return { currentMatchIdx: (s.currentMatchIdx + 1) % s.totalMatches };
		}),
	prevMatch: () =>
		set((s) => {
			if (s.totalMatches === 0) return s;
			return {
				currentMatchIdx: (s.currentMatchIdx - 1 + s.totalMatches) % s.totalMatches,
			};
		}),
}));
