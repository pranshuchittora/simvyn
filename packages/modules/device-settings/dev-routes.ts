import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import { homedir } from "node:os";
import { join } from "node:path";
import type {} from "@simvyn/server";
import type { Device } from "@simvyn/types";
import type { FastifyInstance } from "fastify";

export async function devUtilsRoutes(fastify: FastifyInstance) {
	// --- Port Forwarding ---

	fastify.post<{ Body: { deviceId: string; local: string; remote: string } }>(
		"/forward/add",
		async (req, reply) => {
			const { deviceId, local, remote } = req.body;
			const device = fastify.deviceManager.devices.find((d: Device) => d.id === deviceId);
			if (!device) return reply.status(404).send({ error: "Device not found" });
			if (device.state !== "booted")
				return reply.status(400).send({ error: "Device must be booted" });

			const adapter = fastify.deviceManager.getAdapter(device.platform);
			if (!adapter?.addForward)
				return reply.status(400).send({ error: "Port forwarding not supported for this platform" });

			try {
				await adapter.addForward(device.id, local, remote);
				return { success: true };
			} catch (err) {
				return reply.status(500).send({ error: (err as Error).message });
			}
		},
	);

	fastify.post<{ Body: { deviceId: string; local: string } }>(
		"/forward/remove",
		async (req, reply) => {
			const { deviceId, local } = req.body;
			const device = fastify.deviceManager.devices.find((d: Device) => d.id === deviceId);
			if (!device) return reply.status(404).send({ error: "Device not found" });
			if (device.state !== "booted")
				return reply.status(400).send({ error: "Device must be booted" });

			const adapter = fastify.deviceManager.getAdapter(device.platform);
			if (!adapter?.removeForward)
				return reply.status(400).send({ error: "Port forwarding not supported for this platform" });

			try {
				await adapter.removeForward(device.id, local);
				return { success: true };
			} catch (err) {
				return reply.status(500).send({ error: (err as Error).message });
			}
		},
	);

	fastify.get<{ Querystring: { deviceId: string } }>("/forward/list", async (req, reply) => {
		const { deviceId } = req.query;
		const device = fastify.deviceManager.devices.find((d: Device) => d.id === deviceId);
		if (!device) return reply.status(404).send({ error: "Device not found" });
		if (device.state !== "booted")
			return reply.status(400).send({ error: "Device must be booted" });

		const adapter = fastify.deviceManager.getAdapter(device.platform);
		if (!adapter?.listForwards)
			return reply.status(400).send({ error: "Port forwarding not supported for this platform" });

		try {
			const forwards = await adapter.listForwards(device.id);
			return { forwards };
		} catch (err) {
			return reply.status(500).send({ error: (err as Error).message });
		}
	});

	fastify.post<{ Body: { deviceId: string; remote: string; local: string } }>(
		"/reverse/add",
		async (req, reply) => {
			const { deviceId, remote, local } = req.body;
			const device = fastify.deviceManager.devices.find((d: Device) => d.id === deviceId);
			if (!device) return reply.status(404).send({ error: "Device not found" });
			if (device.state !== "booted")
				return reply.status(400).send({ error: "Device must be booted" });

			const adapter = fastify.deviceManager.getAdapter(device.platform);
			if (!adapter?.addReverse)
				return reply
					.status(400)
					.send({ error: "Reverse port forwarding not supported for this platform" });

			try {
				await adapter.addReverse(device.id, remote, local);
				return { success: true };
			} catch (err) {
				return reply.status(500).send({ error: (err as Error).message });
			}
		},
	);

	fastify.post<{ Body: { deviceId: string; remote: string } }>(
		"/reverse/remove",
		async (req, reply) => {
			const { deviceId, remote } = req.body;
			const device = fastify.deviceManager.devices.find((d: Device) => d.id === deviceId);
			if (!device) return reply.status(404).send({ error: "Device not found" });
			if (device.state !== "booted")
				return reply.status(400).send({ error: "Device must be booted" });

			const adapter = fastify.deviceManager.getAdapter(device.platform);
			if (!adapter?.removeReverse)
				return reply
					.status(400)
					.send({ error: "Reverse port forwarding not supported for this platform" });

			try {
				await adapter.removeReverse(device.id, remote);
				return { success: true };
			} catch (err) {
				return reply.status(500).send({ error: (err as Error).message });
			}
		},
	);

	fastify.get<{ Querystring: { deviceId: string } }>("/reverse/list", async (req, reply) => {
		const { deviceId } = req.query;
		const device = fastify.deviceManager.devices.find((d: Device) => d.id === deviceId);
		if (!device) return reply.status(404).send({ error: "Device not found" });
		if (device.state !== "booted")
			return reply.status(400).send({ error: "Device must be booted" });

		const adapter = fastify.deviceManager.getAdapter(device.platform);
		if (!adapter?.listReverses)
			return reply
				.status(400)
				.send({ error: "Reverse port forwarding not supported for this platform" });

		try {
			const reverses = await adapter.listReverses(device.id);
			return { reverses };
		} catch (err) {
			return reply.status(500).send({ error: (err as Error).message });
		}
	});

	// --- Display Overrides ---

	fastify.post<{ Body: { deviceId: string; width: number; height: number } }>(
		"/display/size",
		async (req, reply) => {
			const { deviceId, width, height } = req.body;
			if (!Number.isInteger(width) || width <= 0 || !Number.isInteger(height) || height <= 0)
				return reply.status(400).send({ error: "Width and height must be positive integers" });

			const device = fastify.deviceManager.devices.find((d: Device) => d.id === deviceId);
			if (!device) return reply.status(404).send({ error: "Device not found" });
			if (device.state !== "booted")
				return reply.status(400).send({ error: "Device must be booted" });

			const adapter = fastify.deviceManager.getAdapter(device.platform);
			if (!adapter?.setDisplaySize)
				return reply
					.status(400)
					.send({ error: "Display override not supported for this platform" });

			try {
				await adapter.setDisplaySize(device.id, width, height);
				return { success: true };
			} catch (err) {
				return reply.status(500).send({ error: (err as Error).message });
			}
		},
	);

	fastify.post<{ Body: { deviceId: string } }>("/display/size/reset", async (req, reply) => {
		const { deviceId } = req.body;
		const device = fastify.deviceManager.devices.find((d: Device) => d.id === deviceId);
		if (!device) return reply.status(404).send({ error: "Device not found" });
		if (device.state !== "booted")
			return reply.status(400).send({ error: "Device must be booted" });

		const adapter = fastify.deviceManager.getAdapter(device.platform);
		if (!adapter?.resetDisplaySize)
			return reply.status(400).send({ error: "Display override not supported for this platform" });

		try {
			await adapter.resetDisplaySize(device.id);
			return { success: true };
		} catch (err) {
			return reply.status(500).send({ error: (err as Error).message });
		}
	});

	fastify.post<{ Body: { deviceId: string; dpi: number } }>(
		"/display/density",
		async (req, reply) => {
			const { deviceId, dpi } = req.body;
			if (!Number.isInteger(dpi) || dpi <= 0)
				return reply.status(400).send({ error: "DPI must be a positive integer" });

			const device = fastify.deviceManager.devices.find((d: Device) => d.id === deviceId);
			if (!device) return reply.status(404).send({ error: "Device not found" });
			if (device.state !== "booted")
				return reply.status(400).send({ error: "Device must be booted" });

			const adapter = fastify.deviceManager.getAdapter(device.platform);
			if (!adapter?.setDisplayDensity)
				return reply
					.status(400)
					.send({ error: "Display override not supported for this platform" });

			try {
				await adapter.setDisplayDensity(device.id, dpi);
				return { success: true };
			} catch (err) {
				return reply.status(500).send({ error: (err as Error).message });
			}
		},
	);

	fastify.post<{ Body: { deviceId: string } }>("/display/density/reset", async (req, reply) => {
		const { deviceId } = req.body;
		const device = fastify.deviceManager.devices.find((d: Device) => d.id === deviceId);
		if (!device) return reply.status(404).send({ error: "Device not found" });
		if (device.state !== "booted")
			return reply.status(400).send({ error: "Device must be booted" });

		const adapter = fastify.deviceManager.getAdapter(device.platform);
		if (!adapter?.resetDisplayDensity)
			return reply.status(400).send({ error: "Display override not supported for this platform" });

		try {
			await adapter.resetDisplayDensity(device.id);
			return { success: true };
		} catch (err) {
			return reply.status(500).send({ error: (err as Error).message });
		}
	});

	// --- Battery Simulation ---

	fastify.post<{
		Body: { deviceId: string; level?: number; status?: number; ac?: boolean; usb?: boolean };
	}>("/battery/set", async (req, reply) => {
		const { deviceId, level, status, ac, usb } = req.body;
		if (level !== undefined && (level < 0 || level > 100))
			return reply.status(400).send({ error: "Battery level must be 0-100" });

		const device = fastify.deviceManager.devices.find((d: Device) => d.id === deviceId);
		if (!device) return reply.status(404).send({ error: "Device not found" });
		if (device.state !== "booted")
			return reply.status(400).send({ error: "Device must be booted" });

		const adapter = fastify.deviceManager.getAdapter(device.platform);
		if (!adapter?.setBattery)
			return reply
				.status(400)
				.send({ error: "Battery simulation not supported for this platform" });

		try {
			await adapter.setBattery(device.id, { level, status, ac, usb });
			return { success: true };
		} catch (err) {
			return reply.status(500).send({ error: (err as Error).message });
		}
	});

	fastify.post<{ Body: { deviceId: string } }>("/battery/unplug", async (req, reply) => {
		const { deviceId } = req.body;
		const device = fastify.deviceManager.devices.find((d: Device) => d.id === deviceId);
		if (!device) return reply.status(404).send({ error: "Device not found" });
		if (device.state !== "booted")
			return reply.status(400).send({ error: "Device must be booted" });

		const adapter = fastify.deviceManager.getAdapter(device.platform);
		if (!adapter?.unplugBattery)
			return reply
				.status(400)
				.send({ error: "Battery simulation not supported for this platform" });

		try {
			await adapter.unplugBattery(device.id);
			return { success: true };
		} catch (err) {
			return reply.status(500).send({ error: (err as Error).message });
		}
	});

	fastify.post<{ Body: { deviceId: string } }>("/battery/reset", async (req, reply) => {
		const { deviceId } = req.body;
		const device = fastify.deviceManager.devices.find((d: Device) => d.id === deviceId);
		if (!device) return reply.status(404).send({ error: "Device not found" });
		if (device.state !== "booted")
			return reply.status(400).send({ error: "Device must be booted" });

		const adapter = fastify.deviceManager.getAdapter(device.platform);
		if (!adapter?.resetBattery)
			return reply
				.status(400)
				.send({ error: "Battery simulation not supported for this platform" });

		try {
			await adapter.resetBattery(device.id);
			return { success: true };
		} catch (err) {
			return reply.status(500).send({ error: (err as Error).message });
		}
	});

	// --- Input Injection ---

	fastify.post<{ Body: { deviceId: string; x: number; y: number } }>(
		"/input/tap",
		async (req, reply) => {
			const { deviceId, x, y } = req.body;
			const device = fastify.deviceManager.devices.find((d: Device) => d.id === deviceId);
			if (!device) return reply.status(404).send({ error: "Device not found" });
			if (device.state !== "booted")
				return reply.status(400).send({ error: "Device must be booted" });

			const adapter = fastify.deviceManager.getAdapter(device.platform);
			if (!adapter?.inputTap)
				return reply.status(400).send({ error: "Input injection not supported for this platform" });

			try {
				await adapter.inputTap(device.id, x, y);
				return { success: true };
			} catch (err) {
				return reply.status(500).send({ error: (err as Error).message });
			}
		},
	);

	fastify.post<{
		Body: { deviceId: string; x1: number; y1: number; x2: number; y2: number; durationMs?: number };
	}>("/input/swipe", async (req, reply) => {
		const { deviceId, x1, y1, x2, y2, durationMs } = req.body;
		const device = fastify.deviceManager.devices.find((d: Device) => d.id === deviceId);
		if (!device) return reply.status(404).send({ error: "Device not found" });
		if (device.state !== "booted")
			return reply.status(400).send({ error: "Device must be booted" });

		const adapter = fastify.deviceManager.getAdapter(device.platform);
		if (!adapter?.inputSwipe)
			return reply.status(400).send({ error: "Input injection not supported for this platform" });

		try {
			await adapter.inputSwipe(device.id, x1, y1, x2, y2, durationMs);
			return { success: true };
		} catch (err) {
			return reply.status(500).send({ error: (err as Error).message });
		}
	});

	fastify.post<{ Body: { deviceId: string; text: string } }>("/input/text", async (req, reply) => {
		const { deviceId, text } = req.body;
		const device = fastify.deviceManager.devices.find((d: Device) => d.id === deviceId);
		if (!device) return reply.status(404).send({ error: "Device not found" });
		if (device.state !== "booted")
			return reply.status(400).send({ error: "Device must be booted" });

		const adapter = fastify.deviceManager.getAdapter(device.platform);
		if (!adapter?.inputText)
			return reply.status(400).send({ error: "Input injection not supported for this platform" });

		try {
			await adapter.inputText(device.id, text);
			return { success: true };
		} catch (err) {
			return reply.status(500).send({ error: (err as Error).message });
		}
	});

	fastify.post<{ Body: { deviceId: string; keyCode: number | string } }>(
		"/input/keyevent",
		async (req, reply) => {
			const { deviceId, keyCode } = req.body;
			const device = fastify.deviceManager.devices.find((d: Device) => d.id === deviceId);
			if (!device) return reply.status(404).send({ error: "Device not found" });
			if (device.state !== "booted")
				return reply.status(400).send({ error: "Device must be booted" });

			const adapter = fastify.deviceManager.getAdapter(device.platform);
			if (!adapter?.inputKeyEvent)
				return reply.status(400).send({ error: "Input injection not supported for this platform" });

			try {
				await adapter.inputKeyEvent(device.id, keyCode);
				return { success: true };
			} catch (err) {
				return reply.status(500).send({ error: (err as Error).message });
			}
		},
	);

	// --- Bug Reports ---

	fastify.post<{ Body: { deviceId: string } }>("/bugreport/collect", async (req, reply) => {
		const { deviceId } = req.body;
		const device = fastify.deviceManager.devices.find((d: Device) => d.id === deviceId);
		if (!device) return reply.status(404).send({ error: "Device not found" });
		if (device.state !== "booted")
			return reply.status(400).send({ error: "Device must be booted" });

		const adapter = fastify.deviceManager.getAdapter(device.platform);
		if (!adapter?.collectBugReport)
			return reply.status(400).send({ error: "Bug reports not supported for this platform" });

		try {
			const outputDir = join(homedir(), ".simvyn", "bug-reports");
			const result = await adapter.collectBugReport(device.id, outputDir);
			return {
				success: true,
				filename: result.filename,
				downloadUrl: `/api/modules/device-settings/bugreport/download/${result.filename}`,
				size: result.size,
			};
		} catch (err) {
			return reply.status(500).send({ error: (err as Error).message });
		}
	});

	fastify.get<{ Params: { filename: string } }>(
		"/bugreport/download/:filename",
		async (req, reply) => {
			const { filename } = req.params;
			const filePath = join(homedir(), ".simvyn", "bug-reports", filename);

			try {
				await stat(filePath);
			} catch {
				return reply.status(404).send({ error: "Bug report not found" });
			}

			reply.header("Content-Disposition", `attachment; filename="${filename}"`);
			return reply.send(createReadStream(filePath));
		},
	);
}
