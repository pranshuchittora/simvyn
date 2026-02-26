import type {} from "@simvyn/server";
import type { Device } from "@simvyn/types";
import type { FastifyInstance } from "fastify";

export async function clipboardRoutes(fastify: FastifyInstance) {
	fastify.get<{ Params: { deviceId: string } }>("/get/:deviceId", async (req, reply) => {
		const { deviceId } = req.params;
		const device = fastify.deviceManager.devices.find((d: Device) => d.id === deviceId);
		if (!device) return reply.status(404).send({ error: "Device not found" });
		if (device.state !== "booted")
			return reply.status(400).send({ error: "Device must be booted" });

		const adapter = fastify.deviceManager.getAdapter(device.platform);
		if (!adapter?.getClipboard)
			return reply.status(400).send({ error: "Clipboard read not supported for this platform" });

		try {
			const text = await adapter.getClipboard(device.id);
			return { text };
		} catch (err) {
			return reply.status(500).send({ error: (err as Error).message });
		}
	});

	fastify.post<{ Params: { deviceId: string }; Body: { text: string } }>(
		"/set/:deviceId",
		async (req, reply) => {
			const { deviceId } = req.params;
			const { text } = req.body;
			const device = fastify.deviceManager.devices.find((d: Device) => d.id === deviceId);
			if (!device) return reply.status(404).send({ error: "Device not found" });
			if (device.state !== "booted")
				return reply.status(400).send({ error: "Device must be booted" });

			const adapter = fastify.deviceManager.getAdapter(device.platform);
			if (!adapter?.setClipboard)
				return reply.status(400).send({ error: "Clipboard write not supported for this platform" });

			try {
				await adapter.setClipboard(device.id, text);
				return { success: true };
			} catch (err) {
				return reply.status(500).send({ error: (err as Error).message });
			}
		},
	);
}
