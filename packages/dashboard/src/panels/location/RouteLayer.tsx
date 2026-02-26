import type L from "leaflet";
import { useMemo, useRef } from "react";
import { Marker, Polyline } from "react-leaflet";
import { createWaypointIcon } from "./markers";
import { useRouteStore } from "./stores/route-store";

function DraggableWaypoint({
	position,
	index,
	onDragEnd,
}: {
	position: [number, number];
	index: number;
	onDragEnd: (index: number, pos: [number, number]) => void;
}) {
	const markerRef = useRef<L.Marker>(null);

	const eventHandlers = useMemo(
		() => ({
			dragend() {
				const marker = markerRef.current;
				if (marker) {
					const latlng = marker.getLatLng();
					onDragEnd(index, [latlng.lat, latlng.lng]);
				}
			},
		}),
		[index, onDragEnd],
	);

	return (
		<Marker
			position={position}
			draggable={true}
			icon={createWaypointIcon(index)}
			eventHandlers={eventHandlers}
			ref={markerRef}
		/>
	);
}

export function RouteLayer() {
	const waypoints = useRouteStore((s) => s.waypoints);
	const updateWaypoint = useRouteStore((s) => s.updateWaypoint);

	if (waypoints.length === 0) return null;

	return (
		<>
			{waypoints.length >= 2 && (
				<Polyline
					positions={waypoints}
					pathOptions={{ color: "#FF9500", weight: 3, opacity: 0.8, dashArray: "8, 8" }}
				/>
			)}
			{waypoints.map((pos, i) => (
				<DraggableWaypoint
					key={`${i}-${pos[0]}-${pos[1]}`}
					position={pos}
					index={i}
					onDragEnd={updateWaypoint}
				/>
			))}
		</>
	);
}
