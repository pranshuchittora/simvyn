import { addFavourite, getFavourites, removeFavourite } from "@simvyn/core";
import type {} from "@simvyn/server";
import type { Device } from "@simvyn/types";
import type { FastifyInstance } from "fastify";

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

	fastify.get("/device-types", async (_req, reply) => {
		try {
			const adapter = fastify.deviceManager.getAdapter("ios");
			if (!adapter?.listDeviceTypes) {
				return { deviceTypes: [] };
			}
			const deviceTypes = await adapter.listDeviceTypes();
			return { deviceTypes };
		} catch (err) {
			return reply.status(500).send({ error: (err as Error).message });
		}
	});

	fastify.get("/runtimes", async (_req, reply) => {
		try {
			const adapter = fastify.deviceManager.getAdapter("ios");
			if (!adapter?.listRuntimes) {
				return { runtimes: [] };
			}
			const runtimes = await adapter.listRuntimes();
			return { runtimes };
		} catch (err) {
			return reply.status(500).send({ error: (err as Error).message });
		}
	});

	fastify.post<{
		Body: { name: string; deviceTypeId: string; runtimeId?: string };
	}>("/create", async (req, reply) => {
		const { name, deviceTypeId, runtimeId } = req.body;
		if (!name?.trim()) {
			return reply.status(400).send({ error: "Name is required" });
		}
		const adapter = fastify.deviceManager.getAdapter("ios");
		if (!adapter?.createDevice) {
			return reply.status(500).send({ error: "Create device not available" });
		}
		try {
			const deviceId = await adapter.createDevice(name, deviceTypeId, runtimeId);
			await fastify.deviceManager.refresh();
			return { success: true, deviceId };
		} catch (err) {
			return reply.status(500).send({ error: (err as Error).message });
		}
	});

	fastify.post<{ Body: { deviceId: string; newName: string } }>("/clone", async (req, reply) => {
		const { deviceId, newName } = req.body;
		const device = fastify.deviceManager.devices.find((d: Device) => d.id === deviceId);
		if (!device) {
			return reply.status(404).send({ error: "Device not found" });
		}
		if (device.platform !== "ios") {
			return reply.status(400).send({ error: "Clone is only supported for iOS simulators" });
		}
		const adapter = fastify.deviceManager.getAdapter("ios");
		if (!adapter?.cloneDevice) {
			return reply.status(500).send({ error: "Clone device not available" });
		}
		try {
			const newDeviceId = await adapter.cloneDevice(deviceId, newName);
			await fastify.deviceManager.refresh();
			return { success: true, deviceId: newDeviceId };
		} catch (err) {
			return reply.status(500).send({ error: (err as Error).message });
		}
	});

	fastify.post<{ Body: { deviceId: string; newName: string } }>("/rename", async (req, reply) => {
		const { deviceId, newName } = req.body;
		const device = fastify.deviceManager.devices.find((d: Device) => d.id === deviceId);
		if (!device) {
			return reply.status(404).send({ error: "Device not found" });
		}
		if (device.platform !== "ios") {
			return reply.status(400).send({ error: "Rename is only supported for iOS simulators" });
		}
		const adapter = fastify.deviceManager.getAdapter("ios");
		if (!adapter?.renameDevice) {
			return reply.status(500).send({ error: "Rename device not available" });
		}
		try {
			await adapter.renameDevice(deviceId, newName);
			await fastify.deviceManager.refresh();
			return { success: true };
		} catch (err) {
			return reply.status(500).send({ error: (err as Error).message });
		}
	});

	fastify.post<{ Body: { deviceId: string } }>("/delete", async (req, reply) => {
		const { deviceId } = req.body;
		const device = fastify.deviceManager.devices.find((d: Device) => d.id === deviceId);
		if (!device) {
			return reply.status(404).send({ error: "Device not found" });
		}
		if (device.platform !== "ios") {
			return reply.status(400).send({ error: "Delete is only supported for iOS simulators" });
		}
		if (device.state !== "shutdown") {
			return reply.status(400).send({ error: "Device must be shut down before deleting" });
		}
		const adapter = fastify.deviceManager.getAdapter("ios");
		if (!adapter?.deleteDevice) {
			return reply.status(500).send({ error: "Delete device not available" });
		}
		try {
			await adapter.deleteDevice(deviceId);
			await fastify.deviceManager.refresh();
			return { success: true };
		} catch (err) {
			return reply.status(500).send({ error: (err as Error).message });
		}
	});

	fastify.post<{
		Body: { deviceId: string; certBase64: string; isRoot: boolean };
	}>("/keychain/add-cert", async (req, reply) => {
		const { deviceId, certBase64, isRoot } = req.body;
		const device = fastify.deviceManager.devices.find((d: Device) => d.id === deviceId);
		if (!device) {
			return reply.status(404).send({ error: "Device not found" });
		}
		if (device.platform !== "ios") {
			return reply.status(400).send({ error: "Keychain is only supported for iOS simulators" });
		}
		const adapter = fastify.deviceManager.getAdapter("ios");
		if (!adapter?.addKeychainCert) {
			return reply.status(500).send({ error: "Keychain cert not available" });
		}
		try {
			const certBuffer = Buffer.from(certBase64, "base64");
			await adapter.addKeychainCert(deviceId, certBuffer, isRoot);
			return { success: true };
		} catch (err) {
			return reply.status(500).send({ error: (err as Error).message });
		}
	});

	fastify.post<{ Body: { deviceId: string } }>("/keychain/reset", async (req, reply) => {
		const { deviceId } = req.body;
		const device = fastify.deviceManager.devices.find((d: Device) => d.id === deviceId);
		if (!device) {
			return reply.status(404).send({ error: "Device not found" });
		}
		if (device.platform !== "ios") {
			return reply.status(400).send({ error: "Keychain is only supported for iOS simulators" });
		}
		const adapter = fastify.deviceManager.getAdapter("ios");
		if (!adapter?.resetKeychain) {
			return reply.status(500).send({ error: "Keychain reset not available" });
		}
		try {
			await adapter.resetKeychain(deviceId);
			return { success: true };
		} catch (err) {
			return reply.status(500).send({ error: (err as Error).message });
		}
	});

	// Favourites
	fastify.get("/favourites", async () => {
		return { favourites: await getFavourites() };
	});

	fastify.post<{ Body: { deviceId: string } }>("/favourites", async (req) => {
		await addFavourite(req.body.deviceId);
		return { success: true };
	});

	fastify.delete<{ Body: { deviceId: string } }>("/favourites", async (req) => {
		await removeFavourite(req.body.deviceId);
		return { success: true };
	});

	fastify.post("/refresh", async () => {
		const devices = await fastify.deviceManager.refresh();
		return { devices };
	});
}
