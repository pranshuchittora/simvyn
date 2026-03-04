import { spawn } from "node:child_process";
import { createWriteStream } from "node:fs";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { basename, extname, join } from "node:path";
import { pipeline } from "node:stream/promises";
import multipart from "@fastify/multipart";
import { isPhysicalDevice } from "@simvyn/core";
import type {} from "@simvyn/server";
import type { Device } from "@simvyn/types";
import type { FastifyInstance } from "fastify";
import {
	androidGetContainerPath,
	androidListDir,
	androidPullFile,
	androidPushFile,
} from "./android-fs.js";
import { iosGetContainerPath, iosListDir, iosReadFile, iosWriteFile } from "./ios-fs.js";

const TEXT_EXTENSIONS = new Set([
	".txt",
	".json",
	".xml",
	".plist",
	".sql",
	".csv",
	".html",
	".css",
	".js",
	".ts",
	".md",
	".log",
	".cfg",
	".ini",
	".yaml",
	".yml",
]);

async function resolveContainer(
	deviceId: string,
	bundleId: string,
	fastify: FastifyInstance,
): Promise<{
	containerPath: string;
	platform: "ios" | "android";
	device: Device;
}> {
	if (isPhysicalDevice(deviceId))
		throw Object.assign(
			new Error(
				"File system browsing is not available on physical iOS devices (no filesystem access without jailbreak)",
			),
			{ statusCode: 400 },
		);

	const device = fastify.deviceManager.devices.find((d: Device) => d.id === deviceId);
	if (!device) throw Object.assign(new Error("Device not found"), { statusCode: 404 });
	if (device.state !== "booted")
		throw Object.assign(new Error("Device must be booted"), {
			statusCode: 400,
		});

	if (device.platform === "ios") {
		const containerPath = await iosGetContainerPath(deviceId, bundleId);
		return { containerPath, platform: "ios", device };
	}
	const containerPath = await androidGetContainerPath(deviceId, bundleId);
	return { containerPath, platform: "android", device };
}

function plistToXml(filePath: string): Promise<string> {
	return new Promise((resolve, reject) => {
		const proc = spawn("plutil", ["-convert", "xml1", "-o", "-", filePath]);
		let out = "";
		let err = "";
		proc.stdout.on("data", (d: Buffer) => {
			out += d.toString();
		});
		proc.stderr.on("data", (d: Buffer) => {
			err += d.toString();
		});
		proc.on("close", (code) =>
			code === 0 ? resolve(out) : reject(new Error(`plutil exit ${code}: ${err}`)),
		);
	});
}

export async function fsRoutes(fastify: FastifyInstance) {
	await fastify.register(multipart, {
		limits: { fileSize: 100_000_000 },
	});

	fastify.get<{
		Params: { deviceId: string; bundleId: string };
		Querystring: { path?: string };
	}>("/ls/:deviceId/:bundleId", async (req) => {
		const { deviceId, bundleId } = req.params;
		const relativePath = req.query.path ?? ".";
		const { containerPath, platform } = await resolveContainer(deviceId, bundleId, fastify);

		if (platform === "ios") {
			const entries = await iosListDir(containerPath, relativePath);
			return { entries };
		}
		const entries = await androidListDir(
			deviceId,
			bundleId,
			relativePath === "." ? "." : relativePath,
		);
		return { entries };
	});

	fastify.get<{
		Params: { deviceId: string; bundleId: string };
		Querystring: { path: string };
	}>("/pull/:deviceId/:bundleId", async (req, reply) => {
		const { deviceId, bundleId } = req.params;
		const remotePath = req.query.path;
		if (!remotePath) return reply.status(400).send({ error: "path query param required" });

		const { containerPath, platform } = await resolveContainer(deviceId, bundleId, fastify);
		let buffer: Buffer;

		if (platform === "ios") {
			buffer = await iosReadFile(containerPath, remotePath);
		} else {
			buffer = await androidPullFile(deviceId, bundleId, remotePath);
		}

		return reply
			.header("Content-Type", "application/octet-stream")
			.header("Content-Disposition", `attachment; filename="${basename(remotePath)}"`)
			.send(buffer);
	});

	fastify.post<{
		Params: { deviceId: string; bundleId: string };
		Querystring: { path: string };
	}>("/push/:deviceId/:bundleId", async (req, reply) => {
		const { deviceId, bundleId } = req.params;
		const remotePath = req.query.path;
		if (!remotePath) return reply.status(400).send({ error: "path query param required" });

		const data = await req.file();
		if (!data) return reply.status(400).send({ error: "No file uploaded" });

		const { containerPath, platform } = await resolveContainer(deviceId, bundleId, fastify);
		const tmpDir = await mkdtemp(join(tmpdir(), "simvyn-fspush-"));
		const localPath = join(tmpDir, data.filename);

		try {
			await pipeline(data.file, createWriteStream(localPath));
			if (platform === "ios") {
				const { readFile } = await import("node:fs/promises");
				const buf = await readFile(localPath);
				await iosWriteFile(containerPath, remotePath, buf);
			} else {
				await androidPushFile(deviceId, bundleId, localPath, remotePath);
			}
			return { success: true };
		} finally {
			await rm(tmpDir, { recursive: true, force: true }).catch(() => {});
		}
	});

	fastify.get<{
		Params: { deviceId: string; bundleId: string };
		Querystring: { path: string };
	}>("/read/:deviceId/:bundleId", async (req, reply) => {
		const { deviceId, bundleId } = req.params;
		const remotePath = req.query.path;
		if (!remotePath) return reply.status(400).send({ error: "path query param required" });

		const ext = extname(remotePath).toLowerCase();
		if (!TEXT_EXTENSIONS.has(ext))
			return reply.status(400).send({ error: "Binary file cannot be read as text" });

		const { containerPath, platform } = await resolveContainer(deviceId, bundleId, fastify);
		let buffer: Buffer;

		if (platform === "ios") {
			if (ext === ".plist") {
				const fullPath = join(containerPath, remotePath);
				const content = await plistToXml(fullPath);
				return { content, path: remotePath };
			}
			buffer = await iosReadFile(containerPath, remotePath);
		} else {
			buffer = await androidPullFile(deviceId, bundleId, remotePath);
		}

		return { content: buffer.toString("utf-8"), path: remotePath };
	});

	fastify.post<{
		Params: { deviceId: string; bundleId: string };
		Body: { path: string; content: string };
	}>("/write/:deviceId/:bundleId", async (req, reply) => {
		const { deviceId, bundleId } = req.params;
		const { path: remotePath, content } = req.body;
		if (!remotePath) return reply.status(400).send({ error: "path is required in body" });

		const { containerPath, platform } = await resolveContainer(deviceId, bundleId, fastify);
		const ext = extname(remotePath).toLowerCase();

		if (platform === "ios" && ext === ".plist") {
			const fullPath = join(containerPath, remotePath);
			await new Promise<void>((resolve, reject) => {
				const proc = spawn("plutil", ["-convert", "binary1", "-o", fullPath, "-"]);
				let err = "";
				proc.stderr.on("data", (d: Buffer) => {
					err += d.toString();
				});
				proc.on("close", (code) =>
					code === 0 ? resolve() : reject(new Error(`plutil exit ${code}: ${err}`)),
				);
				proc.stdin.write(content);
				proc.stdin.end();
			});
			return { success: true };
		}

		const buf = Buffer.from(content, "utf-8");
		if (platform === "ios") {
			await iosWriteFile(containerPath, remotePath, buf);
		} else {
			const tmpDir = await mkdtemp(join(tmpdir(), "simvyn-fswrite-"));
			const localPath = join(tmpDir, "file");
			try {
				const { writeFile } = await import("node:fs/promises");
				await writeFile(localPath, buf);
				await androidPushFile(deviceId, bundleId, localPath, remotePath);
			} finally {
				await rm(tmpDir, { recursive: true, force: true }).catch(() => {});
			}
		}
		return { success: true };
	});
}
