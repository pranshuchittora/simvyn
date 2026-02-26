import { randomUUID } from "node:crypto";
import { createModuleStorage } from "@simvyn/core";
import type {} from "@simvyn/server";
import type { Device } from "@simvyn/types";
import type { FastifyInstance } from "fastify";

interface Favorite {
	id: string;
	url: string;
	label: string;
	bundleId?: string;
	createdAt: string;
}

interface HistoryEntry {
	url: string;
	deviceId: string;
	deviceName: string;
	timestamp: string;
}

const MAX_HISTORY = 50;

export async function deepLinkRoutes(fastify: FastifyInstance) {
	const storage = createModuleStorage("deep-links");

	fastify.post<{ Body: { deviceId: string; url: string } }>("/open", async (req, reply) => {
		const { deviceId, url } = req.body;
		const device = fastify.deviceManager.devices.find((d: Device) => d.id === deviceId);
		if (!device) return reply.status(404).send({ error: "Device not found" });
		if (device.state !== "booted")
			return reply.status(400).send({ error: "Device must be booted" });

		const adapter = fastify.deviceManager.getAdapter(device.platform);
		if (!adapter?.openUrl)
			return reply.status(400).send({ error: "Deep links not supported for this platform" });

		try {
			await adapter.openUrl(device.id, url);

			const history = (await storage.read<HistoryEntry[]>("history")) ?? [];
			history.unshift({
				url,
				deviceId: device.id,
				deviceName: device.name,
				timestamp: new Date().toISOString(),
			});
			if (history.length > MAX_HISTORY) history.length = MAX_HISTORY;
			await storage.write("history", history);

			return { success: true, url, deviceId: device.id };
		} catch (err) {
			return reply.status(500).send({ error: (err as Error).message });
		}
	});

	fastify.get("/favorites", async () => {
		const favorites = (await storage.read<Favorite[]>("favorites")) ?? [];
		return { favorites };
	});

	fastify.post<{ Body: { url: string; label: string; bundleId?: string } }>(
		"/favorites",
		async (req) => {
			const { url, label, bundleId } = req.body;
			const favorites = (await storage.read<Favorite[]>("favorites")) ?? [];
			const favorite: Favorite = {
				id: randomUUID(),
				url,
				label,
				bundleId,
				createdAt: new Date().toISOString(),
			};
			favorites.push(favorite);
			await storage.write("favorites", favorites);
			return favorite;
		},
	);

	fastify.delete<{ Params: { id: string } }>("/favorites/:id", async (req, reply) => {
		const { id } = req.params;
		const favorites = (await storage.read<Favorite[]>("favorites")) ?? [];
		const idx = favorites.findIndex((f) => f.id === id);
		if (idx === -1) return reply.status(404).send({ error: "Favorite not found" });
		favorites.splice(idx, 1);
		await storage.write("favorites", favorites);
		return { success: true };
	});

	fastify.get("/history", async () => {
		const history = (await storage.read<HistoryEntry[]>("history")) ?? [];
		return { history };
	});
}
