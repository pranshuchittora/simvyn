import { useCallback, useState } from "react";
import { useDeviceStore } from "../../stores/device-store";
import {
	kmhToMs,
	MULTIPLIERS,
	msToKmh,
	SPEED_PRESETS,
	usePlaybackStore,
} from "./stores/playback-store";
import { useRouteStore } from "./stores/route-store";

interface Props {
	sendLocation: (type: string, payload: Record<string, unknown>) => void;
}

export default function PlaybackControls({ sendLocation }: Props) {
	const waypoints = useRouteStore((s) => s.waypoints);
	const status = usePlaybackStore((s) => s.status);
	const progress = usePlaybackStore((s) => s.progress);
	const speedKmh = usePlaybackStore((s) => s.speedKmh);
	const speedUnit = usePlaybackStore((s) => s.speedUnit);
	const multiplier = usePlaybackStore((s) => s.multiplier);
	const loop = usePlaybackStore((s) => s.loop);
	const setSpeedKmh = usePlaybackStore((s) => s.setSpeedKmh);
	const setSpeedUnit = usePlaybackStore((s) => s.setSpeedUnit);
	const setMultiplier = usePlaybackStore((s) => s.setMultiplier);
	const setLoop = usePlaybackStore((s) => s.setLoop);

	const [customSpeed, setCustomSpeed] = useState(() =>
		speedUnit === "ms" ? kmhToMs(speedKmh).toFixed(1) : String(speedKmh),
	);

	const commitCustomSpeed = useCallback(() => {
		const num = Number.parseFloat(customSpeed);
		if (Number.isNaN(num) || num <= 0) return;
		const kmh = speedUnit === "ms" ? msToKmh(num) : num;
		setSpeedKmh(kmh);
		if (usePlaybackStore.getState().status === "playing") {
			for (const deviceId of useDeviceStore.getState().selectedDeviceIds) {
				sendLocation("set-speed", {
					deviceId,
					speedMs: kmhToMs(kmh) * multiplier,
				});
			}
		}
	}, [customSpeed, speedUnit, multiplier, setSpeedKmh, sendLocation]);

	if (waypoints.length < 2 && status === "idle") return null;

	function handlePlay() {
		const deviceIds = useDeviceStore.getState().selectedDeviceIds;
		if (status === "paused") {
			for (const deviceId of deviceIds) {
				sendLocation("resume-playback", { deviceId });
			}
		} else {
			for (const deviceId of deviceIds) {
				sendLocation("start-playback", {
					waypoints,
					speedMs: kmhToMs(speedKmh),
					multiplier,
					loop,
					deviceId,
				});
			}
		}
	}

	function handlePause() {
		for (const deviceId of useDeviceStore.getState().selectedDeviceIds) {
			sendLocation("pause-playback", { deviceId });
		}
	}

	function handleStop() {
		for (const deviceId of useDeviceStore.getState().selectedDeviceIds) {
			sendLocation("stop-playback", { deviceId });
		}
	}

	function sendSpeedUpdate(newKmh: number, _newMultiplier: number) {
		if (status === "playing") {
			for (const deviceId of useDeviceStore.getState().selectedDeviceIds) {
				sendLocation("set-speed", {
					deviceId,
					speedMs: kmhToMs(newKmh) * _newMultiplier,
				});
			}
		}
	}

	const matchingPreset = SPEED_PRESETS.find((p) => p.speedKmh === speedKmh);

	function handlePresetChange(e: React.ChangeEvent<HTMLSelectElement>) {
		const val = Number(e.target.value);
		if (val > 0) {
			setSpeedKmh(val);
			setCustomSpeed(speedUnit === "ms" ? kmhToMs(val).toFixed(1) : String(val));
			sendSpeedUpdate(val, multiplier);
		}
	}

	function handleUnitToggle(unit: "kmh" | "ms") {
		if (unit === speedUnit) return;
		setSpeedUnit(unit);
		setCustomSpeed(unit === "ms" ? kmhToMs(speedKmh).toFixed(1) : String(Math.round(speedKmh)));
	}

	function handleMultiplierClick(m: number) {
		setMultiplier(m);
		sendSpeedUpdate(speedKmh, m);
	}

	return (
		<div className="playback-controls glass-panel">
			<div className="playback-row">
				{status === "playing" ? (
					<button
						type="button"
						className="glass-button playback-btn"
						onClick={handlePause}
						title="Pause"
					>
						⏸
					</button>
				) : (
					<button
						type="button"
						className="glass-button playback-btn"
						onClick={handlePlay}
						title="Play"
					>
						▶
					</button>
				)}

				<button
					type="button"
					className="glass-button playback-btn"
					onClick={handleStop}
					disabled={status === "idle"}
					title="Stop"
				>
					⏹
				</button>

				<span className="playback-sep" />

				<select
					className="playback-select"
					value={matchingPreset ? matchingPreset.speedKmh : ""}
					onChange={handlePresetChange}
				>
					{!matchingPreset && <option value="">Custom</option>}
					{SPEED_PRESETS.map((p) => (
						<option key={p.label} value={p.speedKmh}>
							{p.label}
						</option>
					))}
				</select>

				<input
					type="number"
					className="playback-speed-input"
					value={customSpeed}
					onChange={(e) => setCustomSpeed(e.target.value)}
					onBlur={commitCustomSpeed}
					onKeyDown={(e) => e.key === "Enter" && commitCustomSpeed()}
					min={0.1}
					step={speedUnit === "ms" ? 0.1 : 1}
				/>

				<div className="playback-unit-toggle">
					<button
						type="button"
						className={`playback-unit-btn ${speedUnit === "kmh" ? "active" : ""}`}
						onClick={() => handleUnitToggle("kmh")}
					>
						km/h
					</button>
					<button
						type="button"
						className={`playback-unit-btn ${speedUnit === "ms" ? "active" : ""}`}
						onClick={() => handleUnitToggle("ms")}
					>
						m/s
					</button>
				</div>

				<span className="playback-sep" />

				{MULTIPLIERS.map((m) => (
					<button
						key={m}
						type="button"
						className={`glass-button playback-mult-btn ${multiplier === m ? "active" : ""}`}
						onClick={() => handleMultiplierClick(m)}
					>
						{m}x
					</button>
				))}

				<span className="playback-sep" />

				<button
					type="button"
					className={`glass-button playback-loop-btn ${loop ? "active" : ""}`}
					onClick={() => setLoop(!loop)}
					title="Loop"
				>
					↻
				</button>

				<div className="playback-progress-container">
					<div className="playback-progress-bar">
						<div className="playback-progress-fill" style={{ width: `${progress * 100}%` }} />
					</div>
					<span className="playback-progress-text">{Math.round(progress * 100)}%</span>
				</div>
			</div>
		</div>
	);
}
