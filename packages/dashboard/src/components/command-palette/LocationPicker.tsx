import { Command } from "cmdk";
import { MapPin, Search } from "lucide-react";
import { useEffect, useRef, useState } from "react";

interface LocationResult {
	displayName: string;
	lat: number;
	lon: number;
}

interface Bookmark {
	id: string;
	name: string;
	lat: number;
	lon: number;
}

interface LocationPickerProps {
	search: string;
	onSelect: (location: { lat: number; lon: number; name: string }) => void;
}

export default function LocationPicker({ search, onSelect }: LocationPickerProps) {
	const [bookmarks, setBookmarks] = useState<Bookmark[]>([]);
	const [results, setResults] = useState<LocationResult[]>([]);
	const [searching, setSearching] = useState(false);
	const abortRef = useRef<AbortController | null>(null);
	const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);

	useEffect(() => {
		fetch("/api/modules/location/favorites/locations")
			.then((res) => res.json())
			.then((data) => setBookmarks(data))
			.catch(() => {});
	}, []);

	useEffect(() => {
		if (debounceRef.current) clearTimeout(debounceRef.current);
		if (abortRef.current) abortRef.current.abort();

		if (!search.trim()) {
			setResults([]);
			setSearching(false);
			return;
		}

		setSearching(true);
		debounceRef.current = setTimeout(() => {
			const controller = new AbortController();
			abortRef.current = controller;

			fetch(`/api/modules/location/search?q=${encodeURIComponent(search)}&limit=8`, {
				signal: controller.signal,
			})
				.then((res) => res.json())
				.then((data) => {
					if (!controller.signal.aborted) {
						setResults(data);
						setSearching(false);
					}
				})
				.catch(() => {
					if (!controller.signal.aborted) {
						setSearching(false);
					}
				});
		}, 300);

		return () => {
			if (debounceRef.current) clearTimeout(debounceRef.current);
		};
	}, [search]);

	const hasContent = bookmarks.length > 0 || results.length > 0 || searching;

	if (!hasContent && !search.trim()) {
		return (
			<div className="flex items-center justify-center py-8 text-text-muted text-sm text-center px-6">
				Type to search for a location or save bookmarks in the Location module
			</div>
		);
	}

	return (
		<>
			{bookmarks.length > 0 && !search.trim() && (
				<Command.Group heading="Bookmarks">
					{bookmarks.map((bm) => (
						<Command.Item
							key={bm.id}
							value={`bookmark ${bm.name} ${bm.lat} ${bm.lon}`}
							onSelect={() => onSelect({ lat: bm.lat, lon: bm.lon, name: bm.name })}
						>
							<MapPin size={16} className="text-accent-blue shrink-0" />
							<div className="cmdk-item-text">
								<span>{bm.name}</span>
								<span className="cmdk-item-description">
									{bm.lat.toFixed(4)}, {bm.lon.toFixed(4)}
								</span>
							</div>
						</Command.Item>
					))}
				</Command.Group>
			)}

			{searching && (
				<div className="flex items-center justify-center py-4 text-text-muted text-xs">
					Searching...
				</div>
			)}

			{results.length > 0 && (
				<Command.Group heading="Search Results">
					{results.map((r, i) => (
						<Command.Item
							key={`${r.lat}-${r.lon}-${i}`}
							value={`search ${r.displayName} ${r.lat} ${r.lon}`}
							onSelect={() => onSelect({ lat: r.lat, lon: r.lon, name: r.displayName })}
						>
							<Search size={16} className="text-text-secondary shrink-0" />
							<div className="cmdk-item-text">
								<span>{r.displayName}</span>
								<span className="cmdk-item-description">
									{r.lat.toFixed(4)}, {r.lon.toFixed(4)}
								</span>
							</div>
						</Command.Item>
					))}
				</Command.Group>
			)}
		</>
	);
}
