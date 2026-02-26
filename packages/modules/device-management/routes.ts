import type { FastifyInstance } from "fastify";
import type { Device, PlatformAdapter } from "@simvyn/types";
import type {} from "@simvyn/server";

export async function deviceRoutes(fastify: FastifyInstance) {
	fastify.get("/list", async () => {
		return { devices: fastify.deviceManager.devices };
	});

	fastify.get("/capabilities", async () => {
		const ios = fastify.deviceManager.getAdapter("ios");
		const android = fastify.deviceManager.getAdapter("android");
		return {
			ios: ios?.capabilities() ?? [],
			android: android?.capabilities() ?? [],
		};
	});

	fastify.post<{ Body: { deviceId: string } }>("/boot", async (req, reply) => {
		const { deviceId } = req.body;
		const device = fastify.deviceManager.devices.find((d: Device) => d.id === deviceId);
		if (!device) {
			return reply.status(404).send({ error: "Device not found" });
		}
		if (device.state === "booted") {
			return reply.status(400).send({ error: "Device already booted" });
		}
		const adapter = fastify.deviceManager.getAdapter(device.platform);
		if (!adapter) {
			return reply.status(500).send({ error: `No adapter for platform: ${device.platform}` });
		}
		try {
			await adapter.boot(deviceId);
			await fastify.deviceManager.refresh();
			return { success: true };
		} catch (err) {
			return reply.status(500).send({ error: (err as Error).message });
		}
	});

	fastify.post<{ Body: { deviceId: string } }>("/shutdown", async (req, reply) => {
		const { deviceId } = req.body;
		const device = fastify.deviceManager.devices.find((d: Device) => d.id === deviceId);
		if (!device) {
			return reply.status(404).send({ error: "Device not found" });
		}
		const adapter = fastify.deviceManager.getAdapter(device.platform);
		if (!adapter) {
			return reply.status(500).send({ error: `No adapter for platform: ${device.platform}` });
		}
		try {
			await adapter.shutdown(deviceId);
			await fastify.deviceManager.refresh();
			return { success: true };
		} catch (err) {
			return reply.status(500).send({ error: (err as Error).message });
		}
	});

	fastify.post<{ Body: { deviceId: string } }>("/erase", async (req, reply) => {
		const { deviceId } = req.body;
		const device = fastify.deviceManager.devices.find((d: Device) => d.id === deviceId);
		if (!device) {
			return reply.status(404).send({ error: "Device not found" });
		}
		if (device.platform !== "ios") {
			return reply.status(400).send({ error: "Erase is only supported for iOS simulators" });
		}
		const adapter = fastify.deviceManager.getAdapter("ios");
		if (!adapter?.erase) {
			return reply.status(500).send({ error: "Erase not available" });
		}
		try {
			await adapter.erase(deviceId);
			await fastify.deviceManager.refresh();
			return { success: true };
		} catch (err) {
			return reply.status(500).send({ error: (err as Error).message });
		}
	});

	fastify.post("/refresh", async () => {
		const devices = await fastify.deviceManager.refresh();
		return { devices };
	});
}
