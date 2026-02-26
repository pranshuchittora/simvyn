import { useEffect, useState } from "react";
import { useFavoritesStore } from "./stores/favorites-store";
import { useLocationStore } from "./stores/location-store";
import { useRouteStore } from "./stores/route-store";

export default function FavoritesPanel({
	onFlyTo,
	onClose,
}: {
	onFlyTo?: (lat: number, lon: number) => void;
	onClose: () => void;
}) {
	const locations = useFavoritesStore((s) => s.locations);
	const routes = useFavoritesStore((s) => s.routes);
	const fetchLocations = useFavoritesStore((s) => s.fetchLocations);
	const fetchRoutes = useFavoritesStore((s) => s.fetchRoutes);
	const addLocation = useFavoritesStore((s) => s.addLocation);
	const removeLocation = useFavoritesStore((s) => s.removeLocation);
	const addRoute = useFavoritesStore((s) => s.addRoute);
	const removeRoute = useFavoritesStore((s) => s.removeRoute);

	const currentLat = useLocationStore((s) => s.currentLat);
	const currentLon = useLocationStore((s) => s.currentLon);
	const setCurrentLocation = useLocationStore((s) => s.setCurrentLocation);
	const selectedDeviceId = useLocationStore((s) => s.selectedDeviceId);
	const waypoints = useRouteStore((s) => s.waypoints);
	const setWaypoints = useRouteStore((s) => s.setWaypoints);

	const [newLocName, setNewLocName] = useState("");
	const [newRouteName, setNewRouteName] = useState("");
	const [showLocInput, setShowLocInput] = useState(false);
	const [showRouteInput, setShowRouteInput] = useState(false);

	useEffect(() => {
		fetchLocations();
		fetchRoutes();
	}, [fetchLocations, fetchRoutes]);

	const handleSaveLocation = async () => {
		if (!newLocName.trim() || currentLat === null || currentLon === null) return;
		await addLocation(newLocName.trim(), currentLat, currentLon);
		setNewLocName("");
		setShowLocInput(false);
	};

	const handleSaveRoute = async () => {
		if (!newRouteName.trim() || waypoints.length < 2) return;
		await addRoute(newRouteName.trim(), waypoints);
		setNewRouteName("");
		setShowRouteInput(false);
	};

	const handleSelectLocation = async (lat: number, lon: number) => {
		setCurrentLocation(lat, lon);
		onFlyTo?.(lat, lon);
		if (selectedDeviceId) {
			try {
				await fetch("/api/modules/location/set", {
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({ deviceId: selectedDeviceId, lat, lon }),
				});
			} catch {}
		}
	};

	const handleSelectRoute = (wp: [number, number][]) => {
		setWaypoints(wp);
		if (wp.length > 0) {
			onFlyTo?.(wp[0][0], wp[0][1]);
		}
	};

	return (
		<div className="favorites-sidebar">
			<div className="flex items-center justify-between">
				<span className="text-sm font-medium text-text-primary">Favorites</span>
				<button
					type="button"
					onClick={onClose}
					className="text-text-muted hover:text-text-primary text-lg leading-none"
				>
					&times;
				</button>
			</div>

			{/* Saved Locations */}
			<div>
				<div className="favorites-section-title">Saved Locations</div>
				{locations.length === 0 && (
					<div className="text-xs text-text-muted py-2">No saved locations</div>
				)}
				{locations.map((loc) => (
					<div
						key={loc.id}
						className="favorites-item"
						onClick={() => handleSelectLocation(loc.lat, loc.lon)}
					>
						<div className="min-w-0">
							<div className="truncate text-sm">{loc.name}</div>
							<div className="favorites-item-meta">
								{loc.lat.toFixed(4)}, {loc.lon.toFixed(4)}
							</div>
						</div>
						<button
							type="button"
							className="favorites-item-delete"
							onClick={(e) => {
								e.stopPropagation();
								removeLocation(loc.id);
							}}
						>
							&times;
						</button>
					</div>
				))}
				{showLocInput ? (
					<div className="flex gap-1 mt-1">
						<input
							type="text"
							value={newLocName}
							onChange={(e) => setNewLocName(e.target.value)}
							placeholder="Name"
							className="flex-1 min-w-0 rounded-md bg-bg-surface/60 border border-border px-2 py-1 text-xs text-text-primary placeholder:text-text-muted focus:outline-none"
							onKeyDown={(e) => e.key === "Enter" && handleSaveLocation()}
						/>
						<button
							type="button"
							onClick={handleSaveLocation}
							className="text-xs text-accent-blue hover:text-accent-blue/80 px-1"
						>
							Save
						</button>
					</div>
				) : (
					<button
						type="button"
						onClick={() => setShowLocInput(true)}
						disabled={currentLat === null}
						className="text-xs text-text-muted hover:text-text-secondary mt-1 disabled:opacity-40"
					>
						+ Save current location
					</button>
				)}
			</div>

			{/* Saved Routes */}
			<div>
				<div className="favorites-section-title">Saved Routes</div>
				{routes.length === 0 && <div className="text-xs text-text-muted py-2">No saved routes</div>}
				{routes.map((route) => (
					<div
						key={route.id}
						className="favorites-item"
						onClick={() => handleSelectRoute(route.waypoints)}
					>
						<div className="min-w-0">
							<div className="truncate text-sm">{route.name}</div>
							<div className="favorites-item-meta">{route.waypoints.length} waypoints</div>
						</div>
						<button
							type="button"
							className="favorites-item-delete"
							onClick={(e) => {
								e.stopPropagation();
								removeRoute(route.id);
							}}
						>
							&times;
						</button>
					</div>
				))}
				{showRouteInput ? (
					<div className="flex gap-1 mt-1">
						<input
							type="text"
							value={newRouteName}
							onChange={(e) => setNewRouteName(e.target.value)}
							placeholder="Name"
							className="flex-1 min-w-0 rounded-md bg-bg-surface/60 border border-border px-2 py-1 text-xs text-text-primary placeholder:text-text-muted focus:outline-none"
							onKeyDown={(e) => e.key === "Enter" && handleSaveRoute()}
						/>
						<button
							type="button"
							onClick={handleSaveRoute}
							className="text-xs text-accent-blue hover:text-accent-blue/80 px-1"
						>
							Save
						</button>
					</div>
				) : (
					<button
						type="button"
						onClick={() => setShowRouteInput(true)}
						disabled={waypoints.length < 2}
						className="text-xs text-text-muted hover:text-text-secondary mt-1 disabled:opacity-40"
					>
						+ Save current route
					</button>
				)}
			</div>
		</div>
	);
}
