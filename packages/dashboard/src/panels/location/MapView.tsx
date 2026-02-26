import type { Map as LeafletMap } from "leaflet";
import { type MutableRefObject, useCallback } from "react";
import { MapContainer, TileLayer, useMap, useMapEvents } from "react-leaflet";
import LocationMarker from "./LocationMarker";
import PlaybackMarker from "./PlaybackMarker";
import RouteLayer from "./RouteLayer";
import { useLocationStore } from "./stores/location-store";
import { useRouteStore } from "./stores/route-store";

function MapClickHandler() {
	const mode = useLocationStore((s) => s.mode);
	const selectedDeviceId = useLocationStore((s) => s.selectedDeviceId);
	const setCurrentLocation = useLocationStore((s) => s.setCurrentLocation);
	const addWaypoint = useRouteStore((s) => s.addWaypoint);

	const handleMapClick = useCallback(
		async (lat: number, lon: number) => {
			if (mode === "point") {
				setCurrentLocation(lat, lon);
				if (selectedDeviceId) {
					try {
						await fetch("/api/modules/location/set", {
							method: "POST",
							headers: { "Content-Type": "application/json" },
							body: JSON.stringify({ deviceId: selectedDeviceId, lat, lon }),
						});
					} catch {
						// network error — marker is still shown
					}
				}
			} else {
				addWaypoint(lat, lon);
			}
		},
		[mode, selectedDeviceId, setCurrentLocation, addWaypoint],
	);

	useMapEvents({
		click(e) {
			handleMapClick(e.latlng.lat, e.latlng.lng);
		},
	});

	return null;
}

function MapRefSetter({ mapRef }: { mapRef: MutableRefObject<LeafletMap | null> }) {
	const map = useMap();
	mapRef.current = map;
	return null;
}

export default function MapView({ mapRef }: { mapRef?: MutableRefObject<LeafletMap | null> }) {
	return (
		<MapContainer
			center={[37.7749, -122.4194]}
			zoom={13}
			style={{ height: "100%", width: "100%" }}
			zoomControl={true}
		>
			<TileLayer
				attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
				url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
			/>
			{mapRef && <MapRefSetter mapRef={mapRef} />}
			<MapClickHandler />
			<LocationMarker />
			<RouteLayer />
			<PlaybackMarker />
		</MapContainer>
	);
}
