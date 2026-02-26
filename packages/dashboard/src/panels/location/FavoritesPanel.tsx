import { useEffect } from "react";
import { toast } from "sonner";
import { useFavoritesStore } from "./stores/favorites-store";

interface Props {
	open: boolean;
	onLoadLocation: (lat: number, lon: number) => void;
	onLoadRoute: (waypoints: [number, number][]) => void;
	onSaveRoute?: () => void;
}

export default function FavoritesPanel({ open, onLoadLocation, onLoadRoute, onSaveRoute }: Props) {
	const locations = useFavoritesStore((s) => s.locations);
	const routes = useFavoritesStore((s) => s.routes);
	const loading = useFavoritesStore((s) => s.loading);
	const fetchLocations = useFavoritesStore((s) => s.fetchLocations);
	const fetchRoutes = useFavoritesStore((s) => s.fetchRoutes);
	const deleteLocation = useFavoritesStore((s) => s.deleteLocation);
	const deleteRoute = useFavoritesStore((s) => s.deleteRoute);

	useEffect(() => {
		if (open) {
			fetchLocations();
			fetchRoutes();
		}
	}, [open, fetchLocations, fetchRoutes]);

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

	if (!open) return null;

	return (
		<div className="favorites-panel glass-panel">
			{loading && <div className="favorites-empty">Loading...</div>}

			<div className="favorites-section">
				<h4 style={{ margin: "0 0 6px", fontSize: "0.8rem", fontWeight: 600 }}>Locations</h4>
				{locations.length === 0 && !loading && (
					<div className="favorites-empty">No saved locations</div>
				)}
				{locations.map((loc) => (
					<button
						type="button"
						key={loc.id}
						className="favorites-item"
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
				))}
			</div>

			<div className="favorites-section">
				<h4 style={{ margin: "0 0 6px", fontSize: "0.8rem", fontWeight: 600 }}>Routes</h4>
				{routes.length === 0 && !loading && <div className="favorites-empty">No saved routes</div>}
				{routes.map((route) => (
					<button
						type="button"
						key={route.id}
						className="favorites-item"
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
				))}
				{onSaveRoute && (
					<button
						type="button"
						className="glass-button"
						onClick={onSaveRoute}
						style={{ marginTop: 6, width: "100%" }}
					>
						Save Current Route
					</button>
				)}
			</div>
		</div>
	);
}
