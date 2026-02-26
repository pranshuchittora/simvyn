import { Marker } from "react-leaflet";
import { createPlaybackIcon } from "./markers";
import { usePlaybackStore } from "./stores/playback-store";

export default function PlaybackMarker() {
	const state = usePlaybackStore((s) => s.state);
	const lat = usePlaybackStore((s) => s.currentLat);
	const lon = usePlaybackStore((s) => s.currentLon);

	if (state === "idle" || lat === null || lon === null) return null;

	return <Marker position={[lat, lon]} icon={createPlaybackIcon()} />;
}
