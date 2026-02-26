import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { useFavoritesStore } from "./stores/favorites-store";

const EMOJI_OPTIONS = ["📍", "🏠", "🏢", "☕", "🍕", "🏖️", "🏔️", "🎯", "⭐", "❤️", "🚀", "🎮"];

function locationsMatch(a: [number, number] | null, lat: number, lon: number) {
	if (!a) return false;
	return Math.abs(a[0] - lat) < 0.0001 && Math.abs(a[1] - lon) < 0.0001;
}

function routesMatch(a: [number, number][], b: [number, number][]) {
	if (a.length !== b.length) return false;
	return a.every(
		(wp, i) => Math.abs(wp[0] - b[i][0]) < 0.0001 && Math.abs(wp[1] - b[i][1]) < 0.0001,
	);
}

interface Props {
	open: boolean;
	onToggle: () => void;
	onLoadLocation: (lat: number, lon: number) => void;
	onLoadRoute: (waypoints: [number, number][]) => void;
	markerPosition: [number, number] | null;
	reverseGeocode: string | null;
	waypoints: [number, number][];
}

export default function FavoritesPanel({
	open,
	onToggle,
	onLoadLocation,
	onLoadRoute,
	markerPosition,
	reverseGeocode,
	waypoints,
}: Props) {
	const locations = useFavoritesStore((s) => s.locations);
	const routes = useFavoritesStore((s) => s.routes);
	const loading = useFavoritesStore((s) => s.loading);
	const fetchLocations = useFavoritesStore((s) => s.fetchLocations);
	const fetchRoutes = useFavoritesStore((s) => s.fetchRoutes);
	const deleteLocation = useFavoritesStore((s) => s.deleteLocation);
	const deleteRoute = useFavoritesStore((s) => s.deleteRoute);

	const [locName, setLocName] = useState("");
	const [locEmoji, setLocEmoji] = useState<string>("📍");
	const [savingLoc, setSavingLoc] = useState(false);
	const [routeName, setRouteName] = useState("");
	const [savingRoute, setSavingRoute] = useState(false);
	const locInputRef = useRef<HTMLInputElement>(null);

	const isBookmarked =
		markerPosition != null &&
		locations.some((loc) => locationsMatch(markerPosition, loc.lat, loc.lon));

	const isRouteSaved =
		waypoints.length >= 2 && routes.some((r) => routesMatch(waypoints, r.waypoints));

	useEffect(() => {
		if (open) {
			fetchLocations();
			fetchRoutes();
			setTimeout(() => locInputRef.current?.focus(), 50);
		} else {
			setLocName("");
			setLocEmoji("📍");
			setRouteName("");
		}
	}, [open, fetchLocations, fetchRoutes]);

	const handleSaveLocation = async () => {
		if (!markerPosition || !locName.trim()) return;
		setSavingLoc(true);
		try {
			await useFavoritesStore.getState().saveLocation({
				name: locName.trim(),
				lat: markerPosition[0],
				lon: markerPosition[1],
				address: reverseGeocode ?? undefined,
				emoji: locEmoji,
			});
			toast.success(`Saved "${locName.trim()}"`);
			setLocName("");
			setLocEmoji("📍");
			fetchLocations();
		} catch {
			toast.error("Failed to save location");
		} finally {
			setSavingLoc(false);
		}
	};

	const handleSaveRoute = async () => {
		if (waypoints.length < 2 || !routeName.trim()) return;
		setSavingRoute(true);
		try {
			await useFavoritesStore.getState().saveRoute({ name: routeName.trim(), waypoints });
			toast.success(`Saved "${routeName.trim()}"`);
			setRouteName("");
			fetchRoutes();
		} catch {
			toast.error("Failed to save route");
		} finally {
			setSavingRoute(false);
		}
	};

	const handleDeleteLocation = async (e: React.MouseEvent, id: string, name: string) => {
		e.stopPropagation();
		await deleteLocation(id);
		toast.success(`Deleted "${name}"`);
	};

	const handleDeleteRoute = async (e: React.MouseEvent, id: string, name: string) => {
		e.stopPropagation();
		await deleteRoute(id);
		toast.success(`Deleted "${name}"`);
	};

	return (
		<div className={`bookmarks-card glass-panel${open ? " bookmarks-card-open" : ""}`}>
			<button type="button" className="bookmarks-toggle" onClick={onToggle}>
				<span className={`bookmark-btn-star${isBookmarked ? " bookmarked" : ""}`}>★</span>
				<span className="bookmarks-toggle-label">Bookmarks</span>
				<span className={`bookmarks-chevron${open ? " open" : ""}`}>›</span>
			</button>

			{open && (
				<div className="bookmarks-body">
					{loading && <div className="favorites-empty">Loading...</div>}

					{/* ─── Save location form ─── */}
					{markerPosition && (
						<div className="bookmarks-save-section">
							<div className="bookmarks-save-title">Save Location</div>
							<div className="emoji-picker">
								{EMOJI_OPTIONS.map((e) => (
									<button
										key={e}
										type="button"
										className={`emoji-picker-item${locEmoji === e ? " selected" : ""}`}
										onClick={() => setLocEmoji(e)}
									>
										{e}
									</button>
								))}
							</div>
							<input
								ref={locInputRef}
								className="save-dialog-input"
								type="text"
								placeholder="Location name"
								value={locName}
								onChange={(e) => setLocName(e.target.value)}
								onKeyDown={(e) => e.key === "Enter" && handleSaveLocation()}
							/>
							<div className="save-dialog-preview">
								<span>
									{markerPosition[0].toFixed(5)}, {markerPosition[1].toFixed(5)}
								</span>
								{reverseGeocode && (
									<span style={{ color: "rgba(255,255,255,0.4)", fontSize: "0.75rem" }}>
										{reverseGeocode}
									</span>
								)}
							</div>
							<button
								type="button"
								className="glass-button save-dialog-save-btn"
								onClick={handleSaveLocation}
								disabled={!locName.trim() || savingLoc}
								style={{ width: "100%", marginTop: 2 }}
							>
								{savingLoc ? "Saving…" : "Save"}
							</button>
						</div>
					)}

					{/* ─── Saved locations ─── */}
					<div className="favorites-section">
						<div className="favorites-section-header">
							<span className="favorites-section-title">Locations</span>
						</div>
						{locations.length === 0 && !loading && (
							<div className="favorites-empty">No saved locations</div>
						)}
						{locations.map((loc) => {
							const active = locationsMatch(markerPosition, loc.lat, loc.lon);
							return (
								<button
									type="button"
									key={loc.id}
									className={`favorites-item${active ? " favorites-item-active" : ""}`}
									onClick={() => onLoadLocation(loc.lat, loc.lon)}
								>
									<div className="favorites-item-name">
										{loc.emoji && <span style={{ marginRight: 4 }}>{loc.emoji}</span>}
										{loc.name}
									</div>
									<div className="favorites-item-meta">
										{loc.lat.toFixed(4)}, {loc.lon.toFixed(4)}
									</div>
									<button
										type="button"
										className="favorites-delete-btn"
										onClick={(e) => handleDeleteLocation(e, loc.id, loc.name)}
										title="Delete"
									>
										✕
									</button>
								</button>
							);
						})}
					</div>

					{/* ─── Save route form ─── */}
					{waypoints.length >= 2 && !isRouteSaved && (
						<div className="bookmarks-save-section">
							<div className="bookmarks-save-title">Save Route</div>
							<input
								className="save-dialog-input"
								type="text"
								placeholder="Route name"
								value={routeName}
								onChange={(e) => setRouteName(e.target.value)}
								onKeyDown={(e) => e.key === "Enter" && handleSaveRoute()}
							/>
							<div className="save-dialog-preview">
								<span>{waypoints.length} waypoints</span>
							</div>
							<button
								type="button"
								className="glass-button save-dialog-save-btn"
								onClick={handleSaveRoute}
								disabled={!routeName.trim() || savingRoute}
								style={{ width: "100%", marginTop: 2 }}
							>
								{savingRoute ? "Saving…" : "Save"}
							</button>
						</div>
					)}

					{/* ─── Saved routes ─── */}
					<div className="favorites-section">
						<div className="favorites-section-header">
							<span className="favorites-section-title">Routes</span>
						</div>
						{routes.length === 0 && !loading && (
							<div className="favorites-empty">No saved routes</div>
						)}
						{routes.map((route) => {
							const active = waypoints.length >= 2 && routesMatch(waypoints, route.waypoints);
							return (
								<button
									type="button"
									key={route.id}
									className={`favorites-item${active ? " favorites-item-active" : ""}`}
									onClick={() => onLoadRoute(route.waypoints)}
								>
									<div className="favorites-item-name">{route.name}</div>
									<div className="favorites-item-meta">{route.waypoints.length} waypoints</div>
									<button
										type="button"
										className="favorites-delete-btn"
										onClick={(e) => handleDeleteRoute(e, route.id, route.name)}
										title="Delete"
									>
										✕
									</button>
								</button>
							);
						})}
					</div>
				</div>
			)}
		</div>
	);
}
