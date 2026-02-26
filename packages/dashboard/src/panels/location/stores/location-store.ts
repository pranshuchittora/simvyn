import { create } from "zustand";

export interface SearchResult {
	placeId: number;
	lat: number;
	lon: number;
	displayName: string;
	type: string;
}

interface LocationState {
	markerPosition: [number, number] | null;
	cursorPosition: [number, number] | null;
	myLocation: [number, number] | null;
	reverseGeocode: string | null;
	searchResults: SearchResult[];
	searchQuery: string;
	setMarkerPosition: (pos: [number, number]) => void;
	setCursorPosition: (pos: [number, number] | null) => void;
	setMyLocation: (pos: [number, number] | null) => void;
	clearMarkerPosition: () => void;
	setReverseGeocode: (name: string | null) => void;
	setSearchResults: (results: SearchResult[]) => void;
	setSearchQuery: (query: string) => void;
}

export const useLocationStore = create<LocationState>()((set) => ({
	markerPosition: null,
	cursorPosition: null,
	myLocation: null,
	reverseGeocode: null,
	searchResults: [],
	searchQuery: "",
	setMarkerPosition: (pos) => set({ markerPosition: pos }),
	setCursorPosition: (pos) => set({ cursorPosition: pos }),
	setMyLocation: (pos) => set({ myLocation: pos }),
	clearMarkerPosition: () => set({ markerPosition: null, reverseGeocode: null }),
	setReverseGeocode: (name) => set({ reverseGeocode: name }),
	setSearchResults: (results) => set({ searchResults: results }),
	setSearchQuery: (query) => set({ searchQuery: query }),
}));
