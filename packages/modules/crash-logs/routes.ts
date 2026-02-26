import type {} from "@simvyn/server";
import type { Device } from "@simvyn/types";
import type { FastifyInstance } from "fastify";
import { listAndroidCrashLogs } from "./android-crashes.js";
import { listIosCrashLogs, readIosCrashLog } from "./ios-crashes.js";

export async function crashLogRoutes(fastify: FastifyInstance) {
	fastify.get<{ Params: { deviceId: string }; Querystring: { app?: string; since?: string } }>(
		"/list/:deviceId",
		async (req, reply) => {
			const { deviceId } = req.params;
			const { app, since } = req.query;
			const device = fastify.deviceManager.devices.find((d: Device) => d.id === deviceId);
			if (!device) return reply.status(404).send({ error: "Device not found" });
			if (device.state !== "booted")
				return reply.status(400).send({ error: "Device must be booted" });

			try {
				if (device.platform === "ios") {
					const logs = await listIosCrashLogs({ app, since });
					return { logs };
				}
				const logs = await listAndroidCrashLogs(device.id, { app, since });
				return { logs };
			} catch (err) {
				return reply.status(500).send({ error: (err as Error).message });
			}
		},
	);

	fastify.get<{ Params: { deviceId: string; logId: string } }>(
		"/view/:deviceId/:logId",
		async (req, reply) => {
			const { deviceId, logId } = req.params;
			const device = fastify.deviceManager.devices.find((d: Device) => d.id === deviceId);
			if (!device) return reply.status(404).send({ error: "Device not found" });
			if (device.state !== "booted")
				return reply.status(400).send({ error: "Device must be booted" });

			try {
				if (device.platform === "ios") {
					const content = await readIosCrashLog(logId);
					return { content };
				}

				// For Android, re-query logcat and find matching entry
				const logs = await listAndroidCrashLogs(device.id);
				const entry = logs.find((l) => l.id === logId);
				if (!entry) return reply.status(404).send({ error: "Crash log not found" });
				return { content: entry.preview };
			} catch (err) {
				if ((err as Error).message.includes("not found")) {
					return reply.status(404).send({ error: (err as Error).message });
				}
				return reply.status(500).send({ error: (err as Error).message });
			}
		},
	);
}
