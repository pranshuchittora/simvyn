import { createWriteStream } from "node:fs";
import { mkdir, mkdtemp, rename, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { basename, dirname, join } from "node:path";
import { pipeline } from "node:stream/promises";
import multipart from "@fastify/multipart";
import type {} from "@simvyn/server";
import type { Device } from "@simvyn/types";
import type { FastifyInstance } from "fastify";
import {
	AppBundleUploadError,
	assertSafeAppBundleName,
	parseAppBundleManifest,
	resolveBundleFilePath,
	validateAppBundleManifest,
} from "./upload-utils.js";

export async function appRoutes(fastify: FastifyInstance) {
	await fastify.register(multipart, {
		limits: { fileSize: 500_000_000, files: 5000, fields: 3, parts: 5005 },
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

		const tmpDir = await mkdtemp(join(tmpdir(), "simvyn-upload-"));
		const supportsAppBundleUpload = device.platform === "ios" && !device.id.startsWith("physical:");

		try {
			let uploadType = "";
			let bundleName = "";
			let manifest = "";
			let singleFilePath: string | undefined;
			const uploadedBundleFiles = new Map<string, string>();

			for await (const part of req.parts()) {
				if (part.type === "field") {
					if (part.fieldname === "uploadType") {
						uploadType = String(part.value ?? "");
						if (uploadType === "app-bundle" && !supportsAppBundleUpload) {
							throw new AppBundleUploadError(
								".app bundles can only be installed on iOS simulators",
							);
						}
					} else if (part.fieldname === "bundleName") {
						bundleName = String(part.value ?? "");
					} else if (part.fieldname === "manifest") {
						manifest = String(part.value ?? "");
					} else {
						throw new AppBundleUploadError("Unexpected upload field: " + part.fieldname);
					}
					continue;
				}

				if (part.fieldname === "file") {
					if (singleFilePath) {
						throw new AppBundleUploadError("Duplicate upload field: file");
					}
					const filename = basename(part.filename) || "upload";
					singleFilePath = join(tmpDir, filename);
					await pipeline(part.file, createWriteStream(singleFilePath));
					continue;
				}

				if (/^bundle-file-\d+$/.test(part.fieldname)) {
					if (!supportsAppBundleUpload) {
						throw new AppBundleUploadError(".app bundles can only be installed on iOS simulators");
					}
					if (uploadedBundleFiles.has(part.fieldname)) {
						throw new AppBundleUploadError("Duplicate uploaded file for " + part.fieldname);
					}
					const stagingDir = join(tmpDir, "parts");
					await mkdir(stagingDir, { recursive: true });
					const stagingPath = join(stagingDir, part.fieldname);
					await pipeline(part.file, createWriteStream(stagingPath));
					uploadedBundleFiles.set(part.fieldname, stagingPath);
					continue;
				}

				throw new AppBundleUploadError("Unexpected upload field: " + part.fieldname);
			}

			if (uploadType === "app-bundle") {
				if (!supportsAppBundleUpload) {
					throw new AppBundleUploadError(".app bundles can only be installed on iOS simulators");
				}

				const safeBundleName = assertSafeAppBundleName(bundleName);
				const entries = parseAppBundleManifest(manifest);
				validateAppBundleManifest(entries);

				const bundleRoot = join(tmpDir, safeBundleName);
				for (const entry of entries) {
					const stagedPath = uploadedBundleFiles.get(entry.field);
					if (!stagedPath) {
						throw new AppBundleUploadError("Missing uploaded file for " + entry.field);
					}

					const destination = resolveBundleFilePath(bundleRoot, entry.relativePath);
					await mkdir(dirname(destination), { recursive: true });
					await rename(stagedPath, destination);
				}

				await adapter.installApp(device.id, bundleRoot);
				return { success: true };
			}

			if (!singleFilePath) throw new AppBundleUploadError("No file uploaded");
			await adapter.installApp(device.id, singleFilePath);
			return { success: true };
		} catch (err) {
			if (err instanceof AppBundleUploadError) {
				return reply.status(err.statusCode).send({ error: err.message });
			}
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
