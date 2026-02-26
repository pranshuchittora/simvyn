import type { WebSocket } from "@fastify/websocket";
import type {} from "@simvyn/server";
import type { Device, LogEntry } from "@simvyn/types";
import type { FastifyInstance } from "fastify";
import { createLogStreamer, type LogStreamer } from "./log-streamer.js";

interface StreamRef {
	streamer: LogStreamer;
	clients: Set<WebSocket>;
}

const activeStreams = new Map<string, StreamRef>();
const socketDevices = new WeakMap<WebSocket, Set<string>>();
const socketCleanupAttached = new WeakSet<WebSocket>();

export function getLogHistory(deviceId: string): readonly LogEntry[] {
	return activeStreams.get(deviceId)?.streamer.history ?? [];
}

export function registerLogWsHandler(fastify: FastifyInstance) {
	const { wsBroker, deviceManager, processManager } = fastify;

	function cleanupSocket(socket: WebSocket) {
		const devices = socketDevices.get(socket);
		if (!devices) return;
		for (const deviceId of devices) {
			const ref = activeStreams.get(deviceId);
			if (!ref) continue;
			ref.clients.delete(socket);
			if (ref.clients.size === 0) {
				ref.streamer.stop();
				activeStreams.delete(deviceId);
			}
		}
		devices.clear();
	}

	function trackSocket(socket: WebSocket) {
		if (!socketCleanupAttached.has(socket)) {
			socketCleanupAttached.add(socket);
			socket.on("close", () => cleanupSocket(socket));
		}
		if (!socketDevices.has(socket)) {
			socketDevices.set(socket, new Set());
		}
	}

	wsBroker.registerChannel("logs", (type, payload, socket, requestId) => {
		const data = payload as Record<string, string>;
		trackSocket(socket);

		function sendError(message: string) {
			wsBroker.send(socket, "logs", "error", { message }, requestId);
		}

		if (type === "start-stream") {
			const { deviceId } = data;
			if (!deviceId) {
				sendError("Missing deviceId");
				return;
			}

			const device = deviceManager.devices.find((d: Device) => d.id === deviceId);
			if (!device) {
				sendError(`Device not found: ${deviceId}`);
				return;
			}
			if (device.state !== "booted") {
				sendError("Device must be booted");
				return;
			}

			const existing = activeStreams.get(deviceId);
			if (existing) {
				existing.clients.add(socket);
				socketDevices.get(socket)!.add(deviceId);
				wsBroker.send(socket, "logs", "stream-started", { deviceId }, requestId);
				return;
			}

			const ref: StreamRef = {
				streamer: createLogStreamer({
					deviceId: device.id,
					platform: device.platform,
					processManager,
					onFlush(entries: LogEntry[]) {
						for (const client of ref.clients) {
							if (client.readyState === client.OPEN) {
								wsBroker.send(client, "logs", "log-batch", { deviceId, entries });
							}
						}
					},
				}),
				clients: new Set([socket]),
			};

			activeStreams.set(deviceId, ref);
			socketDevices.get(socket)!.add(deviceId);

			try {
				ref.streamer.start();
				wsBroker.send(socket, "logs", "stream-started", { deviceId }, requestId);
			} catch (err) {
				activeStreams.delete(deviceId);
				socketDevices.get(socket)!.delete(deviceId);
				sendError((err as Error).message);
			}
			return;
		}

		if (type === "stop-stream") {
			const { deviceId } = data;
			if (!deviceId) {
				sendError("Missing deviceId");
				return;
			}

			const ref = activeStreams.get(deviceId);
			if (ref) {
				ref.clients.delete(socket);
				if (ref.clients.size === 0) {
					ref.streamer.stop();
					activeStreams.delete(deviceId);
				}
			}

			socketDevices.get(socket)?.delete(deviceId);
			wsBroker.send(socket, "logs", "stream-stopped", { deviceId }, requestId);
			return;
		}

		if (type === "get-history") {
			const { deviceId, before, limit } = data as unknown as {
				deviceId: string;
				before?: number;
				limit?: number;
			};
			if (!deviceId) {
				sendError("Missing deviceId");
				return;
			}

			const history = getLogHistory(deviceId);
			const pageSize = Math.min(limit ?? 500, 500);
			const endIdx = before != null ? Math.min(before, history.length) : history.length;
			const startIdx = Math.max(0, endIdx - pageSize);
			const page = history.slice(startIdx, endIdx);

			wsBroker.send(
				socket,
				"logs",
				"history-page",
				{
					deviceId,
					entries: [...page].reverse(),
					cursor: startIdx,
					hasMore: startIdx > 0,
				},
				requestId,
			);
			return;
		}

		if (type === "clear-device-logs") {
			const { deviceId } = data as { deviceId: string };
			if (!deviceId) {
				sendError("Missing deviceId");
				return;
			}

			const device = deviceManager.devices.find((d: Device) => d.id === deviceId);
			if (!device) {
				sendError(`Device not found: ${deviceId}`);
				return;
			}

			if (device.platform === "android") {
				processManager.spawn("adb", ["-s", deviceId, "logcat", "-c"]);
			} else if (device.platform === "ios") {
				const ref = activeStreams.get(deviceId);
				if (ref && ref.streamer.isRunning) {
					ref.streamer.stop();
					ref.streamer.start();
				}
			}

			const ref = activeStreams.get(deviceId);
			if (ref) {
				ref.streamer.clearHistory();
			}

			wsBroker.send(socket, "logs", "device-cleared", { deviceId }, requestId);
			return;
		}
	});
}
