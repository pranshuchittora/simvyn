import type {} from "@simvyn/server";
import type { Device } from "@simvyn/types";
import type { FastifyInstance } from "fastify";
import { createPlaybackEngine, type PlaybackEngine } from "./playback.js";

export function registerLocationWsHandler(fastify: FastifyInstance) {
	const { wsBroker, deviceManager, processManager } = fastify;

	const engines = new Map<string, PlaybackEngine>();

	wsBroker.registerChannel("location", (type, payload, socket, requestId) => {
		const data = payload as any;

		if (type === "set-location") {
			const { lat, lon, deviceIds } = data;
			const targets = deviceIds?.length
				? deviceManager.devices.filter((d: Device) => deviceIds.includes(d.id))
				: deviceManager.devices.filter((d: Device) => d.state === "booted");

			const results: Array<{ deviceId: string; success: boolean; error?: string }> = [];

			Promise.all(
				targets.map(async (device: Device) => {
					const adapter = deviceManager.getAdapter(device.platform);
					if (!adapter?.setLocation) {
						results.push({
							deviceId: device.id,
							success: false,
							error: "setLocation not supported",
						});
						return;
					}
					try {
						await adapter.setLocation(device.id, lat, lon);
						results.push({ deviceId: device.id, success: true });
					} catch (err) {
						results.push({ deviceId: device.id, success: false, error: (err as Error).message });
					}
				}),
			).then(() => {
				wsBroker.broadcast("location", "location-set", { lat, lon, results });
			});
			return;
		}

		if (type === "start-playback") {
			const { deviceId, waypoints, speedMs } = data;
			const device = deviceManager.devices.find((d: Device) => d.id === deviceId);
			if (!device) {
				wsBroker.send(
					socket,
					"location",
					"error",
					{ message: `Device not found: ${deviceId}` },
					requestId,
				);
				return;
			}
			const adapter = deviceManager.getAdapter(device.platform);
			if (!adapter) {
				wsBroker.send(
					socket,
					"location",
					"error",
					{ message: `No adapter for ${device.platform}` },
					requestId,
				);
				return;
			}

			// Stop existing engine for this device if any
			const existing = engines.get(deviceId);
			if (existing) {
				existing.stop();
				engines.delete(deviceId);
			}

			const engine = createPlaybackEngine({
				deviceId,
				platform: device.platform,
				waypoints,
				speedMs: speedMs ?? 10,
				processManager,
				adapter,
				onPosition(pos) {
					wsBroker.broadcast("location", "playback-position", { deviceId, ...pos });
				},
				onComplete() {
					engines.delete(deviceId);
					wsBroker.broadcast("location", "playback-complete", { deviceId });
				},
				onError(error) {
					wsBroker.broadcast("location", "playback-error", { deviceId, message: error.message });
				},
			});

			engines.set(deviceId, engine);
			engine.start();
			wsBroker.send(socket, "location", "playback-started", { deviceId }, requestId);
			return;
		}

		if (type === "pause-playback") {
			const { deviceId } = data;
			const engine = engines.get(deviceId);
			if (!engine) {
				wsBroker.send(
					socket,
					"location",
					"error",
					{ message: `No active playback for ${deviceId}` },
					requestId,
				);
				return;
			}
			engine.pause();
			wsBroker.broadcast("location", "playback-paused", { deviceId });
			return;
		}

		if (type === "resume-playback") {
			const { deviceId } = data;
			const engine = engines.get(deviceId);
			if (!engine) {
				wsBroker.send(
					socket,
					"location",
					"error",
					{ message: `No active playback for ${deviceId}` },
					requestId,
				);
				return;
			}
			engine.resume();
			wsBroker.broadcast("location", "playback-resumed", { deviceId });
			return;
		}

		if (type === "stop-playback") {
			const { deviceId } = data;
			const engine = engines.get(deviceId);
			if (!engine) {
				wsBroker.send(
					socket,
					"location",
					"error",
					{ message: `No active playback for ${deviceId}` },
					requestId,
				);
				return;
			}
			engine.stop();
			engines.delete(deviceId);
			wsBroker.broadcast("location", "playback-stopped", { deviceId });
			return;
		}

		if (type === "set-speed") {
			const { deviceId, speedMs } = data;
			const engine = engines.get(deviceId);
			if (!engine) {
				wsBroker.send(
					socket,
					"location",
					"error",
					{ message: `No active playback for ${deviceId}` },
					requestId,
				);
				return;
			}
			engine.setSpeed(speedMs);
			wsBroker.broadcast("location", "speed-changed", { deviceId, speedMs });
			return;
		}
	});
}
