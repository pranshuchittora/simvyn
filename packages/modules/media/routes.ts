import { createWriteStream } from "node:fs";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pipeline } from "node:stream/promises";
import multipart from "@fastify/multipart";
import type {} from "@simvyn/server";
import type { Device } from "@simvyn/types";
import type { FastifyInstance } from "fastify";

export async function mediaRoutes(fastify: FastifyInstance) {
	await fastify.register(multipart, {
		limits: { fileSize: 500_000_000 },
	});

	fastify.post<{ Params: { deviceId: string } }>("/add/:deviceId", async (req, reply) => {
		const { deviceId } = req.params;
		const device = fastify.deviceManager.devices.find((d: Device) => d.id === deviceId);
		if (!device) return reply.status(404).send({ error: "Device not found" });
		if (device.state !== "booted")
			return reply.status(400).send({ error: "Device must be booted" });

		const adapter = fastify.deviceManager.getAdapter(device.platform);
		if (!adapter?.addMedia)
			return reply.status(400).send({ error: "Media injection not supported for this platform" });

		const data = await req.file();
		if (!data) return reply.status(400).send({ error: "No file uploaded" });

		const tmpDir = await mkdtemp(join(tmpdir(), "simvyn-media-"));
		const filePath = join(tmpDir, data.filename);

		try {
			await pipeline(data.file, createWriteStream(filePath));
			await adapter.addMedia(device.id, filePath);
			return { success: true, filename: data.filename };
		} catch (err) {
			return reply.status(500).send({ error: (err as Error).message });
		} finally {
			await rm(tmpDir, { recursive: true, force: true }).catch(() => {});
		}
	});
}
