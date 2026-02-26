import { spawn as nodeSpawn, type ChildProcess } from "node:child_process";
import { execFile as nodeExecFile } from "node:child_process";
import { promisify } from "node:util";
import Fastify, { type FastifyInstance } from "fastify";
import fastifyWebsocket from "@fastify/websocket";
import fastifyStatic from "@fastify/static";
import type { Device, PlatformAdapter } from "@simvyn/types";
import { wsBrokerPlugin } from "./ws-broker.js";
import { moduleLoaderPlugin } from "./module-loader.js";

const execFileAsync = promisify(nodeExecFile);

export interface AppOptions {
	port?: number;
	host?: string;
	modulesDir?: string;
	dashboardDir?: string;
	logger?: boolean | object;
}

export interface DeviceManager {
	devices: Device[];
	start(): void;
	stop(): void;
	refresh(): Promise<Device[]>;
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
		start() {},
		stop() {},
		async refresh() { return []; },
		on() {},
		off() {},
		getAdapter() { return undefined; },
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
	const {
		modulesDir,
		dashboardDir,
		logger = true,
	} = opts;

	const fastify = Fastify({ logger });

	await fastify.register(fastifyWebsocket);

	if (dashboardDir) {
		await fastify.register(fastifyStatic, {
			root: dashboardDir,
			wildcard: false,
		});

		fastify.setNotFoundHandler((_req, reply) => {
			return reply.sendFile("index.html");
		});
	}

	let deviceManager: DeviceManager;
	let processManager: ProcessManager;
	try {
		const core = await import("@simvyn/core");
		if (typeof (core as any).createAvailableAdapters === "function" && typeof (core as any).createDeviceManager === "function") {
			const adapters = await (core as any).createAvailableAdapters();
			deviceManager = (core as any).createDeviceManager(adapters);
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

	if (modulesDir) {
		await fastify.register(moduleLoaderPlugin, { modulesDir });
	}

	fastify.get("/api/health", async () => {
		return {
			status: "ok",
			uptime: process.uptime(),
			deviceCount: fastify.deviceManager.devices.length,
		};
	});

	return fastify;
}
