import { usePlaybackStore } from "./stores/playback-store";
import { useRouteStore } from "./stores/route-store";

interface Props {
	onPlay: () => void;
}

export default function RouteActionBar({ onPlay }: Props) {
	const waypoints = useRouteStore((s) => s.waypoints);
	const clearRoute = useRouteStore((s) => s.clearRoute);
	const status = usePlaybackStore((s) => s.status);

	if (waypoints.length < 2) return null;
	if (status !== "idle") return null;

	return (
		<div className="route-action-bar glass-panel">
			<div className="route-action-info">
				<span className="route-action-label">Route ready</span>
				<span className="route-action-detail">{waypoints.length} waypoints</span>
			</div>
			<div className="route-action-buttons">
				<button type="button" className="glass-button route-play-btn" onClick={onPlay}>
					<svg
						xmlns="http://www.w3.org/2000/svg"
						width="14"
						height="14"
						viewBox="0 0 24 24"
						fill="currentColor"
					>
						<title>Play</title>
						<polygon points="5 3 19 12 5 21 5 3" />
					</svg>
					Play Route
				</button>
				<button type="button" className="glass-button route-clear-btn" onClick={clearRoute}>
					Clear
				</button>
			</div>
		</div>
	);
}
