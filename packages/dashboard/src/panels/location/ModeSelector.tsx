import { useRouteStore } from "./stores/route-store";

export default function ModeSelector() {
	const interactionMode = useRouteStore((s) => s.interactionMode);
	const setInteractionMode = useRouteStore((s) => s.setInteractionMode);
	const waypoints = useRouteStore((s) => s.waypoints);
	const clearRoute = useRouteStore((s) => s.clearRoute);

	function switchToPoint() {
		if (waypoints.length < 2) {
			clearRoute();
		}
		setInteractionMode("point");
	}

	return (
		<div className="mode-selector">
			<button
				type="button"
				className={`mode-button ${interactionMode === "point" ? "active" : ""}`}
				onClick={switchToPoint}
			>
				Point
			</button>
			<button
				type="button"
				className={`mode-button ${interactionMode === "route" ? "active" : ""}`}
				onClick={() => setInteractionMode("route")}
			>
				Route
			</button>
		</div>
	);
}
