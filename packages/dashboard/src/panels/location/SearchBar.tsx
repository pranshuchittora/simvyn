import { useCallback, useEffect, useRef, useState } from "react";
import { type SearchResult, useLocationStore } from "./stores/location-store";

const COORD_REGEX = /^\s*(-?\d+\.?\d*)\s*[,\s]\s*(-?\d+\.?\d*)\s*$/;

function parseCoordinates(input: string): [number, number] | null {
	const match = input.match(COORD_REGEX);
	if (!match) return null;
	const lat = Number.parseFloat(match[1]);
	const lon = Number.parseFloat(match[2]);
	if (Number.isNaN(lat) || Number.isNaN(lon)) return null;
	if (lat < -90 || lat > 90 || lon < -180 || lon > 180) return null;
	return [lat, lon];
}

export default function SearchBar() {
	const [query, setQuery] = useState("");
	const [focused, setFocused] = useState(false);
	const searchResults = useLocationStore((s) => s.searchResults);
	const setSearchResults = useLocationStore((s) => s.setSearchResults);
	const setMarkerPosition = useLocationStore((s) => s.setMarkerPosition);
	const clearMarkerPosition = useLocationStore((s) => s.clearMarkerPosition);
	const markerPosition = useLocationStore((s) => s.markerPosition);
	const setSearchQuery = useLocationStore((s) => s.setSearchQuery);
	const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
	const abortRef = useRef<AbortController | null>(null);

	const fetchSuggestions = useCallback(
		async (text: string) => {
			abortRef.current?.abort();
			const controller = new AbortController();
			abortRef.current = controller;

			try {
				const res = await fetch(`/api/modules/location/search?q=${encodeURIComponent(text)}`, {
					signal: controller.signal,
				});
				if (!res.ok) return;
				const data = await res.json();
				const results: SearchResult[] = data.map(
					(
						r: {
							displayName: string;
							lat: number;
							lon: number;
							type: string;
							importance: number;
						},
						i: number,
					) => ({
						placeId: i,
						lat: r.lat,
						lon: r.lon,
						displayName: r.displayName,
						type: r.type,
					}),
				);
				setSearchResults(results);
			} catch {
				// aborted or network error
			}
		},
		[setSearchResults],
	);

	useEffect(() => {
		if (debounceRef.current) clearTimeout(debounceRef.current);

		const trimmed = query.trim();

		if (parseCoordinates(trimmed)) {
			setSearchResults([]);
			return;
		}

		if (trimmed.length < 3) {
			setSearchResults([]);
			return;
		}

		debounceRef.current = setTimeout(() => {
			fetchSuggestions(trimmed);
		}, 400);

		return () => {
			if (debounceRef.current) clearTimeout(debounceRef.current);
		};
	}, [query, fetchSuggestions, setSearchResults]);

	function handleSubmit(e: React.FormEvent) {
		e.preventDefault();
		const trimmed = query.trim();
		if (!trimmed) return;

		const coords = parseCoordinates(trimmed);
		if (coords) {
			setMarkerPosition(coords);
			setSearchResults([]);
			return;
		}

		fetchSuggestions(trimmed);
	}

	function handleResultClick(result: SearchResult) {
		setMarkerPosition([result.lat, result.lon]);
		setSearchResults([]);
		setSearchQuery(result.displayName);
		setQuery(result.displayName);
	}

	function handleCoordClick(coords: [number, number]) {
		setMarkerPosition(coords);
		setSearchResults([]);
	}

	function handleClear() {
		setQuery("");
		setSearchResults([]);
		clearMarkerPosition();
	}

	const coordParsed = parseCoordinates(query.trim());
	const showResults = focused && (searchResults.length > 0 || coordParsed);
	const hasValue = query.trim().length > 0 || markerPosition !== null;

	return (
		<div className="search-bar">
			<form className="search-row" onSubmit={handleSubmit}>
				<input
					className="search-input"
					type="text"
					placeholder="Search places or enter coordinates..."
					value={query}
					onChange={(e) => setQuery(e.target.value)}
					onFocus={() => setFocused(true)}
					onBlur={() => setTimeout(() => setFocused(false), 200)}
				/>
				{hasValue && (
					<button className="search-clear-btn" type="button" onClick={handleClear} title="Clear">
						&times;
					</button>
				)}
			</form>
			{showResults && (
				<div className="search-results">
					{coordParsed && (
						<button
							type="button"
							className="search-result-item search-result-coord"
							onMouseDown={() => handleCoordClick(coordParsed)}
						>
							<span className="search-result-icon">
								<svg
									xmlns="http://www.w3.org/2000/svg"
									width="14"
									height="14"
									viewBox="0 0 24 24"
									fill="none"
									stroke="currentColor"
									strokeWidth="2"
									strokeLinecap="round"
									strokeLinejoin="round"
								>
									<title>Coordinates</title>
									<circle cx="12" cy="12" r="3" />
									<line x1="12" y1="2" x2="12" y2="6" />
									<line x1="12" y1="18" x2="12" y2="22" />
									<line x1="2" y1="12" x2="6" y2="12" />
									<line x1="18" y1="12" x2="22" y2="12" />
								</svg>
							</span>
							Go to {coordParsed[0].toFixed(6)}, {coordParsed[1].toFixed(6)}
						</button>
					)}
					{searchResults.map((r) => (
						<button
							key={r.placeId}
							type="button"
							className="search-result-item"
							onMouseDown={() => handleResultClick(r)}
						>
							{r.displayName}
						</button>
					))}
				</div>
			)}
		</div>
	);
}
