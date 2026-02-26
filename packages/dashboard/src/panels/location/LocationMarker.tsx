import { Marker, Popup } from "react-leaflet";
import { createLocationIcon } from "./markers";
import { useLocationStore } from "./stores/location-store";

export default function LocationMarker() {
	const lat = useLocationStore((s) => s.currentLat);
	const lon = useLocationStore((s) => s.currentLon);

	if (lat === null || lon === null) return null;

	return (
		<Marker position={[lat, lon]} icon={createLocationIcon()}>
			<Popup>
				<div className="text-xs">
					<div className="font-medium">
						{lat.toFixed(6)}, {lon.toFixed(6)}
					</div>
				</div>
			</Popup>
		</Marker>
	);
}
