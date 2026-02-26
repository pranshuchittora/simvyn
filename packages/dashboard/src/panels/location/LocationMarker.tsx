import { Marker, Popup } from "react-leaflet";
import { createLocationPinIcon } from "./markers";
import { useLocationStore } from "./stores/location-store";
import { usePlaybackStore } from "./stores/playback-store";

const locationPinIcon = createLocationPinIcon();

export function LocationMarker() {
	const position = useLocationStore((s) => s.markerPosition);
	const reverseGeocode = useLocationStore((s) => s.reverseGeocode);
	const playbackStatus = usePlaybackStore((s) => s.status);

	if (!position || playbackStatus !== "idle") return null;

	return (
		<Marker position={position} icon={locationPinIcon} zIndexOffset={1000}>
			<Popup>
				<div>
					{position[0].toFixed(6)}, {position[1].toFixed(6)}
				</div>
				{reverseGeocode && (
					<div
						style={{
							fontSize: "0.75rem",
							color: "rgba(255, 255, 255, 0.5)",
							marginTop: "4px",
							maxWidth: "200px",
							wordWrap: "break-word",
						}}
					>
						{reverseGeocode}
					</div>
				)}
			</Popup>
		</Marker>
	);
}
