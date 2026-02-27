import {
	type ChildProcess,
	execFile as nodeExecFile,
	spawn as nodeSpawn,
} from "node:child_process";
import { mkdir, readdir, rm, stat } from "node:fs/promises";
import { join } from "node:path";
import { promisify } from "node:util";
import fastifyStatic from "@fastify/static";
import fastifyWebsocket from "@fastify/websocket";
import { createModuleStorage, getSimvynDir } from "@simvyn/core";
import type { Device, PlatformAdapter, SimvynModule } from "@simvyn/types";
import Fastify, { type FastifyInstance } from "fastify";
import { moduleLoaderFromArrayPlugin, moduleLoaderPlugin } from "./module-loader.js";
import { wsBrokerPlugin } from "./ws-broker.js";

const execFileAsync = promisify(nodeExecFile);

export interface AppOptions {
	port?: number;
	host?: string;
	modulesDir?: string;
	modules?: SimvynModule[];
	dashboardDir?: string;
	logger?: boolean | object;
}

export interface DeviceManager {
	devices: Device[];
	pollInterval: number;
	start(): void;
	stop(): void;
	refresh(): Promise<Device[]>;
	setPollInterval(ms: number): void;
	on(event: "devices-changed", cb: (devices: Device[]) => void): void;
	off(event: "devices-changed", cb: (devices: Device[]) => void): void;
	getAdapter(platform: string): PlatformAdapter | undefined;
}

export interface ProcessManager {
	spawn(command: string, args: string[], opts?: object): ChildProcess;
	exec(command: string, args: string[]): Promise<{ stdout: string; stderr: string }>;
	cleanup(): void;
}

declare module "fastify" {
	interface FastifyInstance {
		deviceManager: DeviceManager;
		processManager: ProcessManager;
	}
}

function createStubDeviceManager(): DeviceManager {
	return {
		devices: [],
		pollInterval: 5000,
		start() {},
		stop() {},
		async refresh() {
			return [];
		},
		setPollInterval() {},
		on() {},
		off() {},
		getAdapter() {
			return undefined;
		},
	};
}

function createStubProcessManager(): ProcessManager {
	return {
		spawn(cmd: string, args: string[], opts?: object) {
			return nodeSpawn(cmd, args, opts);
		},
		async exec(cmd: string, args: string[]) {
			return execFileAsync(cmd, args);
		},
		cleanup() {},
	};
}

export async function createApp(opts: AppOptions = {}): Promise<FastifyInstance> {
	const { modulesDir, modules, dashboardDir, logger = true } = opts;

	const fastify = Fastify({ logger });

	await fastify.register(fastifyWebsocket);

	if (dashboardDir) {
		await fastify.register(fastifyStatic, {
			root: dashboardDir,
			wildcard: false,
		});

		fastify.setNotFoundHandler((req, reply) => {
			if (req.url.startsWith("/api/")) {
				return reply.status(404).send({
					statusCode: 404,
					error: "Not Found",
					message: `Route ${req.method}:${req.url} not found`,
				});
			}
			return reply.sendFile("index.html");
		});
	}

	const toolSettingsStorage = createModuleStorage("tool-settings");
	const savedConfig = await toolSettingsStorage.read<{ pollInterval?: number }>("config");
	const savedPollInterval = savedConfig?.pollInterval ?? 5000;

	let deviceManager: DeviceManager;
	let processManager: ProcessManager;
	try {
		const core = await import("@simvyn/core");
		if (
			typeof (core as any).createAvailableAdapters === "function" &&
			typeof (core as any).createDeviceManager === "function"
		) {
			const adapters = await (core as any).createAvailableAdapters();
			deviceManager = (core as any).createDeviceManager(adapters, {
				pollInterval: savedPollInterval,
			});
		} else {
			deviceManager = createStubDeviceManager();
		}
		if (typeof (core as any).createProcessManager === "function") {
			processManager = (core as any).createProcessManager();
		} else {
			processManager = createStubProcessManager();
		}
	} catch {
		deviceManager = createStubDeviceManager();
		processManager = createStubProcessManager();
	}

	fastify.decorate("deviceManager", deviceManager);
	fastify.decorate("processManager", processManager);

	await fastify.register(wsBrokerPlugin);

	if (modules && modules.length > 0) {
		await fastify.register(moduleLoaderFromArrayPlugin, { modules });
	} else if (modulesDir) {
		await fastify.register(moduleLoaderPlugin, { modulesDir });
	}

	if (fastify.hasDecorator("moduleRegistry")) {
		fastify.moduleRegistry.set("tool-settings", {
			name: "tool-settings",
			version: "1.0.0",
			description: "Configure simvyn server and manage stored data",
		});
	} else {
		const registry = new Map();
		registry.set("tool-settings", {
			name: "tool-settings",
			version: "1.0.0",
			description: "Configure simvyn server and manage stored data",
		});
		fastify.decorate("moduleRegistry", registry);
		fastify.get("/api/modules", async () => {
			return Array.from(registry.values());
		});
	}

	fastify.get("/api/health", async () => {
		return {
			status: "ok",
			uptime: process.uptime(),
			deviceCount: fastify.deviceManager.devices.length,
		};
	});

	// Tool Settings API
	interface ToolConfig {
		port: number;
		autoOpen: boolean;
		pollInterval: number;
	}

	fastify.get("/api/tool-settings/config", async () => {
		const config = await toolSettingsStorage.read<ToolConfig>("config");
		return config ?? { port: 3847, autoOpen: true, pollInterval: 5000 };
	});

	fastify.put("/api/tool-settings/config", async (request) => {
		const body = request.body as Partial<ToolConfig>;
		const existing = await toolSettingsStorage.read<ToolConfig>("config");
		const updated: ToolConfig = {
			port: body.port ?? existing?.port ?? 3847,
			autoOpen: body.autoOpen ?? existing?.autoOpen ?? true,
			pollInterval: body.pollInterval ?? existing?.pollInterval ?? 5000,
		};
		await toolSettingsStorage.write("config", updated);

		if (body.pollInterval && body.pollInterval !== existing?.pollInterval) {
			fastify.deviceManager.setPollInterval(body.pollInterval);
		}

		return updated;
	});

	async function calculateDirSize(dirPath: string): Promise<number> {
		let total = 0;
		try {
			const entries = await readdir(dirPath, { withFileTypes: true });
			for (const entry of entries) {
				const entryPath = join(dirPath, entry.name);
				if (entry.isDirectory()) {
					total += await calculateDirSize(entryPath);
				} else {
					const s = await stat(entryPath);
					total += s.size;
				}
			}
		} catch {}
		return total;
	}

	fastify.get("/api/tool-settings/storage", async () => {
		const totalBytes = await calculateDirSize(getSimvynDir());
		let humanReadable: string;
		if (totalBytes < 1024) {
			humanReadable = `${totalBytes} B`;
		} else if (totalBytes < 1024 * 1024) {
			humanReadable = `${(totalBytes / 1024).toFixed(1)} KB`;
		} else {
			humanReadable = `${(totalBytes / 1024 / 1024).toFixed(1)} MB`;
		}
		return { totalBytes, humanReadable };
	});

	fastify.delete("/api/tool-settings/data", async () => {
		await rm(getSimvynDir(), { recursive: true, force: true });
		await mkdir(getSimvynDir(), { recursive: true });
		return { wiped: true };
	});

	return fastify;
}
