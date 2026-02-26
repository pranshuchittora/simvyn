import type { ChildProcess, SpawnOptions } from "node:child_process";
import type { PlatformAdapter } from "@simvyn/types";
import { cumulativeDistances, interpolateAlongRoute } from "./geo.js";

interface SpawnCapable {
	spawn(command: string, args: string[], opts?: SpawnOptions): ChildProcess;
}

export interface PlaybackOptions {
	deviceId: string;
	platform: "ios" | "android";
	waypoints: [number, number][];
	speedMs: number;
	processManager: SpawnCapable;
	adapter: PlatformAdapter;
	onPosition: (data: PlaybackPosition) => void;
	onComplete: () => void;
	onError: (error: Error) => void;
}

export interface PlaybackPosition {
	lat: number;
	lon: number;
	progress: number;
	waypointIndex: number;
	speedMs: number;
}

export interface PlaybackEngine {
	start(): void;
	pause(): void;
	resume(): void;
	stop(): void;
	setSpeed(speedMs: number): void;
	state: "idle" | "playing" | "paused";
}

const TICK_MS = 200;

export function createPlaybackEngine(opts: PlaybackOptions): PlaybackEngine {
	const {
		deviceId,
		platform,
		waypoints,
		processManager,
		adapter,
		onPosition,
		onComplete,
		onError,
	} = opts;

	let speedMs = opts.speedMs || 10;
	let state: "idle" | "playing" | "paused" = "idle";
	const distances = cumulativeDistances(waypoints);
	const totalDistance = distances[distances.length - 1];

	// Shared tracking
	let distanceTraveled = 0;
	let lastTickTime = 0;
	let tickTimer: ReturnType<typeof setInterval> | null = null;

	// iOS-specific
	let childProcess: ChildProcess | null = null;

	function computePosition(): PlaybackPosition {
		const clampedDist = Math.min(distanceTraveled, totalDistance);
		const [lat, lon] = interpolateAlongRoute(waypoints, distances, clampedDist);

		let waypointIndex = 0;
		for (let i = 1; i < distances.length; i++) {
			if (distances[i] >= clampedDist) {
				waypointIndex = i - 1;
				break;
			}
			waypointIndex = i;
		}

		return {
			lat,
			lon,
			progress: totalDistance > 0 ? clampedDist / totalDistance : 1,
			waypointIndex,
			speedMs,
		};
	}

	function startPositionTicker() {
		lastTickTime = Date.now();
		tickTimer = setInterval(() => {
			const now = Date.now();
			const dt = (now - lastTickTime) / 1000;
			lastTickTime = now;
			distanceTraveled += speedMs * dt;

			if (distanceTraveled >= totalDistance) {
				distanceTraveled = totalDistance;
				onPosition(computePosition());
				engine.stop();
				onComplete();
				return;
			}

			onPosition(computePosition());
		}, TICK_MS);
	}

	function clearTicker() {
		if (tickTimer !== null) {
			clearInterval(tickTimer);
			tickTimer = null;
		}
	}

	function killChild() {
		if (childProcess) {
			try {
				childProcess.kill("SIGTERM");
			} catch {
				// already dead
			}
			childProcess = null;
		}
	}

	function startIos(startWaypoints: [number, number][]) {
		try {
			const args = [
				"simctl",
				"location",
				deviceId,
				"start",
				`--speed=${speedMs}`,
				"--interval=1",
				"-",
			];
			const child = processManager.spawn("xcrun", args, { stdio: ["pipe", "pipe", "pipe"] });
			childProcess = child;

			child.on("error", (err: Error) => {
				onError(err);
			});

			if (child.stdin) {
				for (const [lat, lon] of startWaypoints) {
					child.stdin.write(`${lat},${lon}\n`);
				}
				child.stdin.end();
			}
		} catch (err) {
			onError(err as Error);
		}
	}

	function startAndroid() {
		// Android uses tick-based setLocation calls — no child process needed
	}

	const engine: PlaybackEngine = {
		get state() {
			return state;
		},

		start() {
			if (state !== "idle") return;
			state = "playing";
			distanceTraveled = 0;

			if (platform === "ios") {
				startIos(waypoints);
			} else {
				startAndroid();
			}

			// Position tracking ticker (for both platforms)
			// On Android, also drives the actual location updates
			lastTickTime = Date.now();
			tickTimer = setInterval(() => {
				const now = Date.now();
				const dt = (now - lastTickTime) / 1000;
				lastTickTime = now;
				distanceTraveled += speedMs * dt;

				if (distanceTraveled >= totalDistance) {
					distanceTraveled = totalDistance;
					const pos = computePosition();
					onPosition(pos);

					if (platform === "android" && adapter.setLocation) {
						adapter.setLocation(deviceId, pos.lat, pos.lon).catch(() => {});
					}

					engine.stop();
					onComplete();
					return;
				}

				const pos = computePosition();
				onPosition(pos);

				if (platform === "android" && adapter.setLocation) {
					adapter.setLocation(deviceId, pos.lat, pos.lon).catch(() => {});
				}
			}, TICK_MS);
		},

		pause() {
			if (state !== "playing") return;
			state = "paused";
			clearTicker();
			killChild();
		},

		resume() {
			if (state !== "paused") return;
			state = "playing";

			if (platform === "ios") {
				// Restart simctl from current position forward
				const currentIdx = computePosition().waypointIndex;
				const remaining = waypoints.slice(currentIdx);
				if (remaining.length >= 2) {
					// Prepend current interpolated position
					const [lat, lon] = interpolateAlongRoute(waypoints, distances, distanceTraveled);
					remaining[0] = [lat, lon];
					startIos(remaining);
				}
			}

			startPositionTicker();
		},

		stop() {
			if (state === "idle") return;
			state = "idle";
			clearTicker();
			killChild();

			if (platform === "android" && adapter.clearLocation) {
				adapter.clearLocation(deviceId).catch(() => {});
			}
		},

		setSpeed(newSpeed: number) {
			speedMs = newSpeed;

			if (platform === "ios" && state === "playing") {
				// Restart simctl with new speed
				killChild();
				const currentIdx = computePosition().waypointIndex;
				const remaining = waypoints.slice(currentIdx);
				if (remaining.length >= 2) {
					const [lat, lon] = interpolateAlongRoute(waypoints, distances, distanceTraveled);
					remaining[0] = [lat, lon];
					startIos(remaining);
				}
			}
		},
	};

	return engine;
}
