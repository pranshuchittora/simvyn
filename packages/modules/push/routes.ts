import { execFile } from "node:child_process";
import { randomUUID } from "node:crypto";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";
import { createModuleStorage } from "@simvyn/core";
import type {} from "@simvyn/server";
import type { Device } from "@simvyn/types";
import type { FastifyInstance } from "fastify";

const execFileAsync = promisify(execFile);

interface SavedPayload {
	id: string;
	name: string;
	bundleId?: string;
	payload: Record<string, unknown>;
	createdAt: string;
}

interface HistoryEntry {
	bundleId: string;
	payload: Record<string, unknown>;
	deviceId: string;
	deviceName: string;
	timestamp: string;
}

const storage = createModuleStorage("push");

export async function pushRoutes(fastify: FastifyInstance) {
	fastify.post<{ Body: { deviceId: string; bundleId: string; payload: Record<string, unknown> } }>(
		"/send",
		async (req, reply) => {
			const { deviceId, bundleId, payload } = req.body;
			if (!deviceId || !bundleId || !payload) {
				return reply.status(400).send({ error: "deviceId, bundleId, and payload are required" });
			}

			const device = fastify.deviceManager.devices.find((d: Device) => d.id === deviceId);
			if (!device) return reply.status(404).send({ error: "Device not found" });
			if (device.state !== "booted")
				return reply.status(400).send({ error: "Device must be booted" });
			if (device.platform !== "ios") {
				return reply
					.status(400)
					.send({ error: "Push notifications are only supported on iOS simulators" });
			}

			const tmpDir = await mkdtemp(join(tmpdir(), "simvyn-push-"));
			const tmpFile = join(tmpDir, "payload.json");

			try {
				await writeFile(tmpFile, JSON.stringify(payload), "utf-8");
				await execFileAsync("xcrun", ["simctl", "push", deviceId, bundleId, tmpFile]);

				const history = (await storage.read<HistoryEntry[]>("history")) ?? [];
				history.unshift({
					bundleId,
					payload,
					deviceId,
					deviceName: device.name,
					timestamp: new Date().toISOString(),
				});
				if (history.length > 50) history.length = 50;
				await storage.write("history", history);

				return { success: true };
			} catch (err) {
				return reply.status(500).send({ error: (err as Error).message });
			} finally {
				await rm(tmpDir, { recursive: true, force: true }).catch(() => {});
			}
		},
	);

	fastify.get("/templates", async () => {
		const { pushTemplates } = await import("./templates.js");
		return { templates: pushTemplates };
	});

	fastify.get("/payloads", async () => {
		const payloads = (await storage.read<SavedPayload[]>("payloads")) ?? [];
		return { payloads };
	});

	fastify.post<{ Body: { name: string; bundleId?: string; payload: Record<string, unknown> } }>(
		"/payloads",
		async (req, reply) => {
			const { name, bundleId, payload } = req.body;
			if (!name || !payload) {
				return reply.status(400).send({ error: "name and payload are required" });
			}

			const payloads = (await storage.read<SavedPayload[]>("payloads")) ?? [];
			const created: SavedPayload = {
				id: randomUUID(),
				name,
				bundleId,
				payload,
				createdAt: new Date().toISOString(),
			};
			payloads.push(created);
			await storage.write("payloads", payloads);
			return created;
		},
	);

	fastify.delete<{ Params: { id: string } }>("/payloads/:id", async (req, reply) => {
		const { id } = req.params;
		const payloads = (await storage.read<SavedPayload[]>("payloads")) ?? [];
		const idx = payloads.findIndex((p) => p.id === id);
		if (idx === -1) return reply.status(404).send({ error: "Payload not found" });
		payloads.splice(idx, 1);
		await storage.write("payloads", payloads);
		return { success: true };
	});

	fastify.get("/history", async () => {
		const history = (await storage.read<HistoryEntry[]>("history")) ?? [];
		return { history };
	});
}
