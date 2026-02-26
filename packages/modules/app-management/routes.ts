import { createWriteStream } from "node:fs";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pipeline } from "node:stream/promises";
import multipart from "@fastify/multipart";
import type {} from "@simvyn/server";
import type { Device } from "@simvyn/types";
import type { FastifyInstance } from "fastify";

export async function appRoutes(fastify: FastifyInstance) {
	await fastify.register(multipart, {
		limits: { fileSize: 500_000_000 },
	});

	fastify.get<{ Params: { deviceId: string } }>("/list/:deviceId", async (req, reply) => {
		const { deviceId } = req.params;
		const device = fastify.deviceManager.devices.find((d: Device) => d.id === deviceId);
		if (!device) return reply.status(404).send({ error: "Device not found" });
		if (device.state !== "booted")
			return reply.status(400).send({ error: "Device must be booted" });

		const adapter = fastify.deviceManager.getAdapter(device.platform);
		if (!adapter?.listApps)
			return reply.status(400).send({ error: "Not supported for this platform" });

		try {
			const apps = await adapter.listApps(device.id);
			return { apps };
		} catch (err) {
			return reply.status(500).send({ error: (err as Error).message });
		}
	});

	fastify.post<{ Params: { deviceId: string } }>("/install/:deviceId", async (req, reply) => {
		const { deviceId } = req.params;
		const device = fastify.deviceManager.devices.find((d: Device) => d.id === deviceId);
		if (!device) return reply.status(404).send({ error: "Device not found" });
		if (device.state !== "booted")
			return reply.status(400).send({ error: "Device must be booted" });

		const adapter = fastify.deviceManager.getAdapter(device.platform);
		if (!adapter?.installApp)
			return reply.status(400).send({ error: "Not supported for this platform" });

		const data = await req.file();
		if (!data) return reply.status(400).send({ error: "No file uploaded" });

		const tmpDir = await mkdtemp(join(tmpdir(), "simvyn-upload-"));
		const filePath = join(tmpDir, data.filename);

		try {
			await pipeline(data.file, createWriteStream(filePath));
			await adapter.installApp(device.id, filePath);
			return { success: true };
		} catch (err) {
			return reply.status(500).send({ error: (err as Error).message });
		} finally {
			await rm(tmpDir, { recursive: true, force: true }).catch(() => {});
		}
	});

	fastify.post<{ Body: { deviceId: string; bundleId: string } }>(
		"/uninstall",
		async (req, reply) => {
			const { deviceId, bundleId } = req.body;
			const device = fastify.deviceManager.devices.find((d: Device) => d.id === deviceId);
			if (!device) return reply.status(404).send({ error: "Device not found" });
			if (device.state !== "booted")
				return reply.status(400).send({ error: "Device must be booted" });

			const adapter = fastify.deviceManager.getAdapter(device.platform);
			if (!adapter?.uninstallApp)
				return reply.status(400).send({ error: "Not supported for this platform" });

			try {
				await adapter.uninstallApp(device.id, bundleId);
				return { success: true };
			} catch (err) {
				return reply.status(500).send({ error: (err as Error).message });
			}
		},
	);

	fastify.post<{ Body: { deviceId: string; bundleId: string } }>("/launch", async (req, reply) => {
		const { deviceId, bundleId } = req.body;
		const device = fastify.deviceManager.devices.find((d: Device) => d.id === deviceId);
		if (!device) return reply.status(404).send({ error: "Device not found" });
		if (device.state !== "booted")
			return reply.status(400).send({ error: "Device must be booted" });

		const adapter = fastify.deviceManager.getAdapter(device.platform);
		if (!adapter?.launchApp)
			return reply.status(400).send({ error: "Not supported for this platform" });

		try {
			await adapter.launchApp(device.id, bundleId);
			return { success: true };
		} catch (err) {
			return reply.status(500).send({ error: (err as Error).message });
		}
	});

	fastify.post<{ Body: { deviceId: string; bundleId: string } }>(
		"/terminate",
		async (req, reply) => {
			const { deviceId, bundleId } = req.body;
			const device = fastify.deviceManager.devices.find((d: Device) => d.id === deviceId);
			if (!device) return reply.status(404).send({ error: "Device not found" });
			if (device.state !== "booted")
				return reply.status(400).send({ error: "Device must be booted" });

			const adapter = fastify.deviceManager.getAdapter(device.platform);
			if (!adapter?.terminateApp)
				return reply.status(400).send({ error: "Not supported for this platform" });

			try {
				await adapter.terminateApp(device.id, bundleId);
				return { success: true };
			} catch (err) {
				return reply.status(500).send({ error: (err as Error).message });
			}
		},
	);

	fastify.get<{ Params: { deviceId: string; bundleId: string } }>(
		"/info/:deviceId/:bundleId",
		async (req, reply) => {
			const { deviceId, bundleId } = req.params;
			const device = fastify.deviceManager.devices.find((d: Device) => d.id === deviceId);
			if (!device) return reply.status(404).send({ error: "Device not found" });
			if (device.state !== "booted")
				return reply.status(400).send({ error: "Device must be booted" });

			const adapter = fastify.deviceManager.getAdapter(device.platform);
			if (!adapter?.getAppInfo)
				return reply.status(400).send({ error: "Not supported for this platform" });

			try {
				const info = await adapter.getAppInfo(device.id, bundleId);
				if (!info) return reply.status(404).send({ error: "App not found" });
				return info;
			} catch (err) {
				return reply.status(500).send({ error: (err as Error).message });
			}
		},
	);

	fastify.post<{ Body: { deviceId: string; bundleId: string } }>(
		"/clear-data",
		async (req, reply) => {
			const { deviceId, bundleId } = req.body;
			const device = fastify.deviceManager.devices.find((d: Device) => d.id === deviceId);
			if (!device) return reply.status(404).send({ error: "Device not found" });
			if (device.state !== "booted")
				return reply.status(400).send({ error: "Device must be booted" });

			const adapter = fastify.deviceManager.getAdapter(device.platform);
			if (!adapter?.clearAppData)
				return reply.status(400).send({ error: "Clear data not supported for this platform" });

			try {
				await adapter.clearAppData(device.id, bundleId);
				return { success: true };
			} catch (err) {
				return reply.status(500).send({ error: (err as Error).message });
			}
		},
	);
}
