import type { PlatformCapability, SimvynModule } from "@simvyn/types";
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
		const keychain = program.command("keychain").description("SSL keychain management commands");

		keychain
			.command("add <deviceId> <certPath>")
			.description("Add a certificate to device keychain")
			.option("--root", "Add as root certificate")
			.action(async (deviceId: string, certPath: string, options: { root?: boolean }) => {
				const fs = await import("node:fs/promises");
				const { createAvailableAdapters, createDeviceManager } = await import("@simvyn/core");
				const adapters = await createAvailableAdapters();
				const dm = createDeviceManager(adapters);
				const devices = await dm.refresh();
				const target = devices.find((d) => d.id === deviceId || d.id.startsWith(deviceId));
				if (!target) {
					console.error(`Device not found: ${deviceId}`);
					process.exit(1);
				}
				if (target.platform !== "ios") {
					console.error("Keychain is only supported for iOS simulators");
					process.exit(1);
				}
				const adapter = dm.getAdapter("ios");
				if (!adapter?.addKeychainCert) {
					console.error("Keychain cert not available");
					process.exit(1);
				}
				const certData = await fs.readFile(certPath);
				await adapter.addKeychainCert(target.id, certData, !!options.root);
				console.log(`Certificate added to ${target.name} (${options.root ? "root" : "non-root"})`);
				dm.stop();
			});

		keychain
			.command("reset <deviceId>")
			.description("Reset device keychain")
			.action(async (deviceId: string) => {
				const { createAvailableAdapters, createDeviceManager } = await import("@simvyn/core");
				const adapters = await createAvailableAdapters();
				const dm = createDeviceManager(adapters);
				const devices = await dm.refresh();
				const target = devices.find((d) => d.id === deviceId || d.id.startsWith(deviceId));
				if (!target) {
					console.error(`Device not found: ${deviceId}`);
					process.exit(1);
				}
				if (target.platform !== "ios") {
					console.error("Keychain is only supported for iOS simulators");
					process.exit(1);
				}
				const adapter = dm.getAdapter("ios");
				if (!adapter?.resetKeychain) {
					console.error("Keychain reset not available");
					process.exit(1);
				}
				await adapter.resetKeychain(target.id);
				console.log(`Keychain reset: ${target.name} (${target.id})`);
				dm.stop();
			});
	},

	capabilities: ["appManagement", "logs", "screenshot", "screenRecord"] as PlatformCapability[],
};

export default deviceManagementModule;
