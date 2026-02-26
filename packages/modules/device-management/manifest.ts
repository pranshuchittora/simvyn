import type { SimvynModule, PlatformCapability } from "@simvyn/types";
import { deviceRoutes } from "./routes.js";
import { registerDeviceWsHandler } from "./ws-handler.js";

const deviceManagementModule: SimvynModule = {
	name: "devices",
	version: "0.1.0",
	description: "Device discovery, lifecycle management, and real-time status",
	icon: "monitor-smartphone",

	async register(fastify, _opts) {
		await fastify.register(deviceRoutes);
		registerDeviceWsHandler(fastify);
		fastify.deviceManager.start();

		fastify.addHook("onClose", () => {
			fastify.deviceManager.stop();
		});
	},

	cli(program) {
		const device = program.command("device").description("Device management commands");

		device
			.command("list")
			.description("List all devices")
			.action(async () => {
				const { createAvailableAdapters, createDeviceManager } = await import("@simvyn/core");
				const adapters = await createAvailableAdapters();
				const dm = createDeviceManager(adapters);
				const devices = await dm.refresh();
				dm.stop();

				if (devices.length === 0) {
					console.log("No devices found.");
					return;
				}

				const rows = devices.map((d) => ({
					ID: d.id.slice(0, 20),
					Name: d.name,
					Platform: d.platform,
					State: d.state,
					OS: d.osVersion,
				}));
				console.table(rows);
			});

		device
			.command("boot <id>")
			.description("Boot a device")
			.action(async (id: string) => {
				const { createAvailableAdapters, createDeviceManager } = await import("@simvyn/core");
				const adapters = await createAvailableAdapters();
				const dm = createDeviceManager(adapters);
				const devices = await dm.refresh();
				const target = devices.find((d) => d.id === id || d.id.startsWith(id));
				if (!target) {
					console.error(`Device not found: ${id}`);
					process.exit(1);
				}
				const adapter = dm.getAdapter(target.platform);
				if (!adapter) {
					console.error(`No adapter for platform: ${target.platform}`);
					process.exit(1);
				}
				await adapter.boot(target.id);
				console.log(`Booted: ${target.name} (${target.id})`);
				dm.stop();
			});

		device
			.command("shutdown <id>")
			.description("Shutdown a device")
			.action(async (id: string) => {
				const { createAvailableAdapters, createDeviceManager } = await import("@simvyn/core");
				const adapters = await createAvailableAdapters();
				const dm = createDeviceManager(adapters);
				const devices = await dm.refresh();
				const target = devices.find((d) => d.id === id || d.id.startsWith(id));
				if (!target) {
					console.error(`Device not found: ${id}`);
					process.exit(1);
				}
				const adapter = dm.getAdapter(target.platform);
				if (!adapter) {
					console.error(`No adapter for platform: ${target.platform}`);
					process.exit(1);
				}
				await adapter.shutdown(target.id);
				console.log(`Shutdown: ${target.name} (${target.id})`);
				dm.stop();
			});

		device
			.command("erase <id>")
			.description("Erase an iOS simulator")
			.action(async (id: string) => {
				const { createAvailableAdapters, createDeviceManager } = await import("@simvyn/core");
				const adapters = await createAvailableAdapters();
				const dm = createDeviceManager(adapters);
				const devices = await dm.refresh();
				const target = devices.find((d) => d.id === id || d.id.startsWith(id));
				if (!target) {
					console.error(`Device not found: ${id}`);
					process.exit(1);
				}
				if (target.platform !== "ios") {
					console.error("Erase is only supported for iOS simulators");
					process.exit(1);
				}
				const adapter = dm.getAdapter("ios");
				if (!adapter?.erase) {
					console.error("Erase not available");
					process.exit(1);
				}
				await adapter.erase(target.id);
				console.log(`Erased: ${target.name} (${target.id})`);
				dm.stop();
			});
	},

	capabilities: ["appManagement", "logs", "screenshot", "screenRecord"] as PlatformCapability[],
};

export default deviceManagementModule;
