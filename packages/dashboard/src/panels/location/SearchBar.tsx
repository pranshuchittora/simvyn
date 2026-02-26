import { useCallback, useEffect, useRef, useState } from "react";
import { useLocationStore } from "./stores/location-store";

interface SearchResult {
	display_name: string;
	lat: string;
	lon: string;
}

export default function SearchBar({ onFlyTo }: { onFlyTo?: (lat: number, lon: number) => void }) {
	const [query, setQuery] = useState("");
	const [results, setResults] = useState<SearchResult[]>([]);
	const [open, setOpen] = useState(false);
	const setCurrentLocation = useLocationStore((s) => s.setCurrentLocation);
	const selectedDeviceId = useLocationStore((s) => s.selectedDeviceId);
	const timerRef = useRef<ReturnType<typeof setTimeout>>();
	const wrapperRef = useRef<HTMLDivElement>(null);

	const doSearch = useCallback(async (q: string) => {
		if (!q.trim()) {
			setResults([]);
			setOpen(false);
			return;
		}
		try {
			const res = await fetch(`/api/modules/location/search?q=${encodeURIComponent(q)}`);
			if (res.ok) {
				const data = (await res.json()) as SearchResult[];
				setResults(data);
				setOpen(data.length > 0);
			}
		} catch {
			// network error
		}
	}, []);

	const handleInput = (value: string) => {
		setQuery(value);
		clearTimeout(timerRef.current);
		timerRef.current = setTimeout(() => doSearch(value), 300);
	};

	const handleSelect = async (result: SearchResult) => {
		const lat = parseFloat(result.lat);
		const lon = parseFloat(result.lon);
		setCurrentLocation(lat, lon);
		setQuery(result.display_name);
		setOpen(false);
		onFlyTo?.(lat, lon);

		if (selectedDeviceId) {
			try {
				await fetch("/api/modules/location/set", {
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({ deviceId: selectedDeviceId, lat, lon }),
				});
			} catch {
				// network error
			}
		}
	};

	useEffect(() => {
		function handleClickOutside(e: MouseEvent) {
			if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
				setOpen(false);
			}
		}
		document.addEventListener("mousedown", handleClickOutside);
		return () => document.removeEventListener("mousedown", handleClickOutside);
	}, []);

	return (
		<div ref={wrapperRef} className="relative flex-1 min-w-0">
			<input
				type="text"
				value={query}
				onChange={(e) => handleInput(e.target.value)}
				placeholder="Search location..."
				className="w-full rounded-[var(--radius-button)] bg-bg-surface/60 border border-border px-3 py-1.5 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent-blue/50"
			/>
			{open && results.length > 0 && (
				<div className="search-dropdown">
					{results.map((r, i) => (
						<div
							key={`${r.lat}-${r.lon}-${i}`}
							className="search-dropdown-item"
							onClick={() => handleSelect(r)}
						>
							<div className="truncate">{r.display_name}</div>
							<div className="search-coords">
								{parseFloat(r.lat).toFixed(4)}, {parseFloat(r.lon).toFixed(4)}
							</div>
						</div>
					))}
				</div>
			)}
		</div>
	);
}
