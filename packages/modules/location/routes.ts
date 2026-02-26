import crypto from "node:crypto";
import type {} from "@simvyn/server";
import type { Device } from "@simvyn/types";
import type { FastifyInstance } from "fastify";
import { createNominatimProxy } from "./nominatim.js";
import {
	deleteLocation,
	deleteRoute,
	getLocations,
	getRoutes,
	type SavedLocation,
	type SavedRoute,
	saveLocation,
	saveRoute,
} from "./storage.js";

const nominatim = createNominatimProxy();

export async function locationRoutes(fastify: FastifyInstance) {
	fastify.post<{ Body: { deviceId: string; lat: number; lon: number } }>(
		"/set",
		async (req, reply) => {
			const { deviceId, lat, lon } = req.body;
			const device = fastify.deviceManager.devices.find((d: Device) => d.id === deviceId);
			if (!device) {
				return reply.status(404).send({ error: "Device not found" });
			}
			const adapter = fastify.deviceManager.getAdapter(device.platform);
			if (!adapter?.setLocation) {
				return reply.status(400).send({ error: "Adapter does not support setLocation" });
			}
			try {
				await adapter.setLocation(deviceId, lat, lon);
				return { success: true };
			} catch (err) {
				return reply.status(500).send({ error: (err as Error).message });
			}
		},
	);

	fastify.post<{ Body: { deviceId: string } }>("/clear", async (req, reply) => {
		const { deviceId } = req.body;
		const device = fastify.deviceManager.devices.find((d: Device) => d.id === deviceId);
		if (!device) {
			return reply.status(404).send({ error: "Device not found" });
		}
		const adapter = fastify.deviceManager.getAdapter(device.platform);
		if (!adapter?.clearLocation) {
			return reply.status(400).send({ error: "Adapter does not support clearLocation" });
		}
		try {
			await adapter.clearLocation(deviceId);
			return { success: true };
		} catch (err) {
			return reply.status(500).send({ error: (err as Error).message });
		}
	});

	fastify.get<{ Querystring: { q: string; limit?: string } }>("/search", async (req) => {
		const { q, limit } = req.query;
		const results = await nominatim.search(q, limit ? parseInt(limit, 10) : undefined);
		return results;
	});

	fastify.get<{ Querystring: { lat: string; lon: string } }>("/reverse", async (req) => {
		const { lat, lon } = req.query;
		const result = await nominatim.reverse(parseFloat(lat), parseFloat(lon));
		return result;
	});

	fastify.get("/favorites/locations", async () => {
		return await getLocations();
	});

	fastify.post<{ Body: Omit<SavedLocation, "id" | "createdAt"> }>(
		"/favorites/locations",
		async (req) => {
			const loc: SavedLocation = {
				...req.body,
				id: crypto.randomUUID(),
				createdAt: Date.now(),
			};
			await saveLocation(loc);
			return loc;
		},
	);

	fastify.delete<{ Params: { id: string } }>("/favorites/locations/:id", async (req) => {
		await deleteLocation(req.params.id);
		return { success: true };
	});

	fastify.get("/favorites/routes", async () => {
		return await getRoutes();
	});

	fastify.post<{ Body: Omit<SavedRoute, "id" | "createdAt"> }>("/favorites/routes", async (req) => {
		const route: SavedRoute = {
			...req.body,
			id: crypto.randomUUID(),
			createdAt: Date.now(),
		};
		await saveRoute(route);
		return route;
	});

	fastify.delete<{ Params: { id: string } }>("/favorites/routes/:id", async (req) => {
		await deleteRoute(req.params.id);
		return { success: true };
	});
}
