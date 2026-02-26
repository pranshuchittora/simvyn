import { Marker } from "react-leaflet";
import { createPlaybackIcon } from "./markers";
import { usePlaybackStore } from "./stores/playback-store";

const playbackIcon = createPlaybackIcon();

export function PlaybackMarker() {
	const currentPosition = usePlaybackStore((s) => s.currentPosition);
	const status = usePlaybackStore((s) => s.status);

	if (!currentPosition || status === "idle") return null;

	return <Marker position={currentPosition} icon={playbackIcon} interactive={false} />;
}
