import { useWs } from "../../hooks/use-ws";
import { useLocationStore } from "./stores/location-store";
import { usePlaybackStore } from "./stores/playback-store";
import { useRouteStore } from "./stores/route-store";

const SPEEDS = [
	{ label: "0.5x", value: 20 },
	{ label: "1x", value: 10 },
	{ label: "2x", value: 5 },
	{ label: "5x", value: 2 },
	{ label: "10x", value: 1 },
];

export default function PlaybackControls() {
	const { send } = useWs();
	const playbackState = usePlaybackStore((s) => s.state);
	const progress = usePlaybackStore((s) => s.progress);
	const speedMs = usePlaybackStore((s) => s.speedMs);
	const setSpeed = usePlaybackStore((s) => s.setSpeed);
	const waypoints = useRouteStore((s) => s.waypoints);
	const selectedDeviceId = useLocationStore((s) => s.selectedDeviceId);

	const visible = waypoints.length >= 2 || playbackState !== "idle";
	if (!visible) return null;

	const handlePlay = () => {
		if (playbackState === "idle") {
			send({
				channel: "location",
				type: "start-playback",
				payload: {
					deviceId: selectedDeviceId,
					waypoints,
					speedMs,
				},
			});
		} else if (playbackState === "paused") {
			send({
				channel: "location",
				type: "resume-playback",
				payload: { deviceId: selectedDeviceId },
			});
		} else {
			send({
				channel: "location",
				type: "pause-playback",
				payload: { deviceId: selectedDeviceId },
			});
		}
	};

	const handleStop = () => {
		send({
			channel: "location",
			type: "stop-playback",
			payload: { deviceId: selectedDeviceId },
		});
	};

	const handleSpeedChange = (value: number) => {
		setSpeed(value);
		if (playbackState !== "idle") {
			send({
				channel: "location",
				type: "set-speed",
				payload: { deviceId: selectedDeviceId, speedMs: value },
			});
		}
	};

	return (
		<div className="playback-controls">
			<button
				type="button"
				onClick={handlePlay}
				title={playbackState === "playing" ? "Pause" : "Play"}
			>
				{playbackState === "playing" ? "⏸" : "▶"}
			</button>
			<button type="button" onClick={handleStop} title="Stop" disabled={playbackState === "idle"}>
				⏹
			</button>

			<div className="playback-progress">
				<div
					className="playback-progress-bar"
					style={{ width: `${(progress * 100).toFixed(1)}%` }}
				/>
			</div>

			<span className="text-xs text-text-muted whitespace-nowrap">
				{(progress * 100).toFixed(0)}%
			</span>

			<select
				className="speed-selector"
				value={speedMs}
				onChange={(e) => handleSpeedChange(Number(e.target.value))}
			>
				{SPEEDS.map((s) => (
					<option key={s.value} value={s.value}>
						{s.label}
					</option>
				))}
			</select>
		</div>
	);
}
