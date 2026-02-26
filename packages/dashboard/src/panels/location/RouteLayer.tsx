import type { LatLngExpression } from "leaflet";
import { Marker, Polyline } from "react-leaflet";
import { createWaypointIcon } from "./markers";
import { useRouteStore } from "./stores/route-store";

function haversineDistance([lat1, lon1]: [number, number], [lat2, lon2]: [number, number]): number {
	const R = 6371e3;
	const toRad = (d: number) => (d * Math.PI) / 180;
	const dLat = toRad(lat2 - lat1);
	const dLon = toRad(lon2 - lon1);
	const a =
		Math.sin(dLat / 2) ** 2 +
		Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
	return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export default function RouteLayer() {
	const waypoints = useRouteStore((s) => s.waypoints);
	const removeWaypoint = useRouteStore((s) => s.removeWaypoint);

	if (waypoints.length === 0) return null;

	const positions: LatLngExpression[] = waypoints.map(([lat, lon]) => [lat, lon]);

	let totalDistance = 0;
	for (let i = 1; i < waypoints.length; i++) {
		totalDistance += haversineDistance(waypoints[i - 1], waypoints[i]);
	}

	return (
		<>
			{waypoints.length >= 2 && (
				<Polyline
					positions={positions}
					pathOptions={{
						color: "oklch(0.65 0.12 290)",
						weight: 3,
						opacity: 0.8,
						dashArray: "8 4",
					}}
				/>
			)}
			{waypoints.map(([lat, lon], i) => (
				<Marker
					key={`wp-${i}-${lat}-${lon}`}
					position={[lat, lon]}
					icon={createWaypointIcon(i)}
					eventHandlers={{
						contextmenu: () => removeWaypoint(i),
					}}
				/>
			))}
		</>
	);
}
