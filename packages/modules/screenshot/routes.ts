import { createReadStream } from "node:fs";
import { mkdir, stat, unlink } from "node:fs/promises";
import { basename, join } from "node:path";
import { createModuleStorage, getSimvynDir } from "@simvyn/core";
import type {} from "@simvyn/server";
import type { Device } from "@simvyn/types";
import type { FastifyInstance } from "fastify";
import * as recorder from "./recorder.js";

interface CaptureEntry {
	type: "screenshot" | "recording";
	filename: string;
	path: string;
	timestamp: number;
	deviceId: string;
	deviceName: string;
	duration?: number;
}

const storage = createModuleStorage("screenshot");
const capturesDir = join(getSimvynDir(), "screenshot", "captures");
const recordingsDir = join(getSimvynDir(), "screenshot", "recordings");

async function ensureDirs() {
	await mkdir(capturesDir, { recursive: true });
	await mkdir(recordingsDir, { recursive: true });
}

async function appendHistory(entry: CaptureEntry) {
	const history = (await storage.read<CaptureEntry[]>("history")) ?? [];
	history.push(entry);
	await storage.write("history", history);
}

export async function screenshotRoutes(fastify: FastifyInstance) {
	await ensureDirs();

	fastify.post<{ Params: { deviceId: string } }>("/capture/:deviceId", async (req, reply) => {
		const { deviceId } = req.params;
		const device = fastify.deviceManager.devices.find((d: Device) => d.id === deviceId);
		if (!device) return reply.status(404).send({ error: "Device not found" });
		if (device.state !== "booted")
			return reply.status(400).send({ error: "Device must be booted" });

		const adapter = fastify.deviceManager.getAdapter(device.platform);
		if (!adapter?.screenshot)
			return reply.status(400).send({ error: "Screenshot not supported for this platform" });

		const timestamp = Date.now();
		const safeName = deviceId.replace(/[^a-zA-Z0-9-]/g, "_");
		const filename = `screenshot-${safeName}-${timestamp}.png`;
		const outputPath = join(capturesDir, filename);

		try {
			await adapter.screenshot(device.id, outputPath);
			const entry: CaptureEntry = {
				type: "screenshot",
				filename,
				path: outputPath,
				timestamp,
				deviceId: device.id,
				deviceName: device.name,
			};
			await appendHistory(entry);
			return { filename, path: outputPath, timestamp, deviceId: device.id };
		} catch (err) {
			return reply.status(500).send({ error: (err as Error).message });
		}
	});

	fastify.post<{ Params: { deviceId: string } }>("/record/start/:deviceId", async (req, reply) => {
		const { deviceId } = req.params;
		const device = fastify.deviceManager.devices.find((d: Device) => d.id === deviceId);
		if (!device) return reply.status(404).send({ error: "Device not found" });
		if (device.state !== "booted")
			return reply.status(400).send({ error: "Device must be booted" });

		const adapter = fastify.deviceManager.getAdapter(device.platform);
		if (!adapter?.startRecording)
			return reply.status(400).send({ error: "Recording not supported for this platform" });

		try {
			const { outputPath } = await recorder.startRecording(
				device.id,
				device.platform,
				adapter,
				recordingsDir,
			);
			fastify.wsBroker.broadcast("screenshot", "recording-started", {
				deviceId: device.id,
				deviceName: device.name,
				outputPath,
			});
			return { recording: true, deviceId: device.id, outputPath };
		} catch (err) {
			return reply.status(500).send({ error: (err as Error).message });
		}
	});

	fastify.post<{ Params: { deviceId: string } }>("/record/stop/:deviceId", async (req, reply) => {
		const { deviceId } = req.params;
		const device = fastify.deviceManager.devices.find((d: Device) => d.id === deviceId);
		if (!device) return reply.status(404).send({ error: "Device not found" });

		const adapter = fastify.deviceManager.getAdapter(device.platform);
		if (!adapter?.stopRecording)
			return reply.status(400).send({ error: "Stop recording not supported for this platform" });

		try {
			const { outputPath, duration } = await recorder.stopRecording(device.id, adapter);
			const filename = basename(outputPath);
			const entry: CaptureEntry = {
				type: "recording",
				filename,
				path: outputPath,
				timestamp: Date.now(),
				deviceId: device.id,
				deviceName: device.name,
				duration,
			};
			await appendHistory(entry);
			fastify.wsBroker.broadcast("screenshot", "recording-stopped", {
				deviceId: device.id,
				deviceName: device.name,
				filename,
				duration,
			});
			return { filename, path: outputPath, duration, deviceId: device.id };
		} catch (err) {
			return reply.status(500).send({ error: (err as Error).message });
		}
	});

	fastify.get("/history", async () => {
		const history = (await storage.read<CaptureEntry[]>("history")) ?? [];
		return history;
	});

	fastify.delete<{ Params: { filename: string } }>("/history/:filename", async (req, reply) => {
		const { filename } = req.params;
		const history = (await storage.read<CaptureEntry[]>("history")) ?? [];
		const idx = history.findIndex((e) => e.filename === filename);
		if (idx === -1) return reply.status(404).send({ error: "Entry not found" });

		const entry = history[idx];
		try {
			await unlink(entry.path);
		} catch {
			// file may already be gone
		}

		history.splice(idx, 1);
		await storage.write("history", history);
		return { deleted: true };
	});

	fastify.delete("/history", async () => {
		const history = (await storage.read<CaptureEntry[]>("history")) ?? [];
		const count = history.length;

		for (const entry of history) {
			try {
				await unlink(entry.path);
			} catch {
				// file may already be gone
			}
		}

		await storage.write("history", []);
		return { cleared: true, count };
	});

	fastify.get<{ Params: { filename: string } }>("/download/:filename", async (req, reply) => {
		const { filename } = req.params;

		for (const dir of [capturesDir, recordingsDir]) {
			const filePath = join(dir, filename);
			try {
				await stat(filePath);
				const ext = filename.endsWith(".mp4") ? "video/mp4" : "image/png";
				reply.header("Content-Type", ext);
				const disposition =
					req.query && (req.query as Record<string, string>).download === "1"
						? "attachment"
						: "inline";
				reply.header("Content-Disposition", `${disposition}; filename="${filename}"`);
				return reply.send(createReadStream(filePath));
			} catch {
				// not in this dir, try next
			}
		}

		return reply.status(404).send({ error: "File not found" });
	});

	fastify.get("/recording-status", async () => {
		return { recording: recorder.getActiveRecordings() };
	});
}
