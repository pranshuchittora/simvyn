import type { SimvynModule } from "@simvyn/types";
import { appRoutes } from "./routes.js";
import { registerAppWsHandler } from "./ws-handler.js";

const appManagementModule: SimvynModule = {
	name: "apps",
	version: "0.1.0",
	description: "App lifecycle management — install, launch, terminate, inspect",
	icon: "app-window",

	async register(fastify, _opts) {
		await fastify.register(appRoutes);
		registerAppWsHandler(fastify);
	},

	cli(program) {
		const app = program.command("app").description("App management commands");

		app
			.command("list <device>")
			.description("List installed apps on a device")
			.option("-t, --type <filter>", "Filter by type: user, system, all", "all")
			.action(async (deviceId: string, opts: { type: string }) => {
				const { createAvailableAdapters, createDeviceManager } = await import("@simvyn/core");
				const adapters = await createAvailableAdapters();
				const dm = createDeviceManager(adapters);
				try {
					const devices = await dm.refresh();
					const target = devices.find((d) => d.id === deviceId || d.id.startsWith(deviceId));
					if (!target) {
						console.error(`Device not found: ${deviceId}`);
						process.exit(1);
					}
					if (target.state !== "booted") {
						console.error("Device must be booted");
						process.exit(1);
					}

					const adapter = dm.getAdapter(target.platform);
					if (!adapter?.listApps) {
						console.error(`Not supported for ${target.platform}`);
						process.exit(1);
					}

					let apps = await adapter.listApps(target.id);
					if (opts.type !== "all") {
						apps = apps.filter((a) => a.type === opts.type);
					}

					if (apps.length === 0) {
						console.log("No apps found");
						return;
					}

					const header = ["Bundle ID", "Name", "Version", "Type"];
					const rows = apps.map((a) => [a.bundleId, a.name, a.version, a.type]);
					const widths = header.map((h, i) => Math.max(h.length, ...rows.map((r) => r[i].length)));
					const pad = (s: string, w: number) => s + " ".repeat(Math.max(0, w - s.length));

					console.log(header.map((h, i) => pad(h, widths[i])).join("  "));
					console.log(widths.map((w) => "-".repeat(w)).join("  "));
					for (const row of rows) {
						console.log(row.map((c, i) => pad(c, widths[i])).join("  "));
					}
				} finally {
					dm.stop();
				}
			});

		app
			.command("install <device> <path>")
			.description("Install an IPA or APK on a device")
			.action(async (deviceId: string, appPath: string) => {
				const { stat } = await import("node:fs/promises");
				const { basename } = await import("node:path");
				try {
					await stat(appPath);
				} catch {
					console.error(`File not found: ${appPath}`);
					process.exit(1);
				}

				const { createAvailableAdapters, createDeviceManager } = await import("@simvyn/core");
				const adapters = await createAvailableAdapters();
				const dm = createDeviceManager(adapters);
				try {
					const devices = await dm.refresh();
					const target = devices.find((d) => d.id === deviceId || d.id.startsWith(deviceId));
					if (!target) {
						console.error(`Device not found: ${deviceId}`);
						process.exit(1);
					}
					if (target.state !== "booted") {
						console.error("Device must be booted");
						process.exit(1);
					}

					const adapter = dm.getAdapter(target.platform);
					if (!adapter?.installApp) {
						console.error(`Not supported for ${target.platform}`);
						process.exit(1);
					}

					await adapter.installApp(target.id, appPath);
					console.log(`Installed ${basename(appPath)} on ${target.name}`);
				} finally {
					dm.stop();
				}
			});

		app
			.command("uninstall <device> <bundle-id>")
			.description("Uninstall an app from a device")
			.action(async (deviceId: string, bundleId: string) => {
				const { createAvailableAdapters, createDeviceManager } = await import("@simvyn/core");
				const adapters = await createAvailableAdapters();
				const dm = createDeviceManager(adapters);
				try {
					const devices = await dm.refresh();
					const target = devices.find((d) => d.id === deviceId || d.id.startsWith(deviceId));
					if (!target) {
						console.error(`Device not found: ${deviceId}`);
						process.exit(1);
					}
					if (target.state !== "booted") {
						console.error("Device must be booted");
						process.exit(1);
					}

					const adapter = dm.getAdapter(target.platform);
					if (!adapter?.uninstallApp) {
						console.error(`Not supported for ${target.platform}`);
						process.exit(1);
					}

					await adapter.uninstallApp(target.id, bundleId);
					console.log(`Uninstalled ${bundleId} from ${target.name}`);
				} finally {
					dm.stop();
				}
			});

		app
			.command("launch <device> <bundle-id>")
			.description("Launch an app on a device")
			.action(async (deviceId: string, bundleId: string) => {
				const { createAvailableAdapters, createDeviceManager } = await import("@simvyn/core");
				const adapters = await createAvailableAdapters();
				const dm = createDeviceManager(adapters);
				try {
					const devices = await dm.refresh();
					const target = devices.find((d) => d.id === deviceId || d.id.startsWith(deviceId));
					if (!target) {
						console.error(`Device not found: ${deviceId}`);
						process.exit(1);
					}
					if (target.state !== "booted") {
						console.error("Device must be booted");
						process.exit(1);
					}

					const adapter = dm.getAdapter(target.platform);
					if (!adapter?.launchApp) {
						console.error(`Not supported for ${target.platform}`);
						process.exit(1);
					}

					await adapter.launchApp(target.id, bundleId);
					console.log(`Launched ${bundleId} on ${target.name}`);
				} finally {
					dm.stop();
				}
			});

		app
			.command("terminate <device> <bundle-id>")
			.description("Terminate an app on a device")
			.action(async (deviceId: string, bundleId: string) => {
				const { createAvailableAdapters, createDeviceManager } = await import("@simvyn/core");
				const adapters = await createAvailableAdapters();
				const dm = createDeviceManager(adapters);
				try {
					const devices = await dm.refresh();
					const target = devices.find((d) => d.id === deviceId || d.id.startsWith(deviceId));
					if (!target) {
						console.error(`Device not found: ${deviceId}`);
						process.exit(1);
					}
					if (target.state !== "booted") {
						console.error("Device must be booted");
						process.exit(1);
					}

					const adapter = dm.getAdapter(target.platform);
					if (!adapter?.terminateApp) {
						console.error(`Not supported for ${target.platform}`);
						process.exit(1);
					}

					await adapter.terminateApp(target.id, bundleId);
					console.log(`Terminated ${bundleId} on ${target.name}`);
				} finally {
					dm.stop();
				}
			});

		app
			.command("info <device> <bundle-id>")
			.description("Show detailed info about an app")
			.action(async (deviceId: string, bundleId: string) => {
				const { createAvailableAdapters, createDeviceManager } = await import("@simvyn/core");
				const adapters = await createAvailableAdapters();
				const dm = createDeviceManager(adapters);
				try {
					const devices = await dm.refresh();
					const target = devices.find((d) => d.id === deviceId || d.id.startsWith(deviceId));
					if (!target) {
						console.error(`Device not found: ${deviceId}`);
						process.exit(1);
					}
					if (target.state !== "booted") {
						console.error("Device must be booted");
						process.exit(1);
					}

					const adapter = dm.getAdapter(target.platform);
					if (!adapter?.getAppInfo) {
						console.error(`Not supported for ${target.platform}`);
						process.exit(1);
					}

					const info = await adapter.getAppInfo(target.id, bundleId);
					if (!info) {
						console.error("App not found");
						process.exit(1);
					}

					console.log(`Bundle ID:      ${info.bundleId}`);
					console.log(`Name:           ${info.name}`);
					console.log(`Version:        ${info.version}`);
					console.log(`Type:           ${info.type}`);
					if (info.dataContainer) console.log(`Data Container: ${info.dataContainer}`);
					if (info.appPath) console.log(`App Path:       ${info.appPath}`);
				} finally {
					dm.stop();
				}
			});

		app
			.command("clear-data <device> <bundle-id>")
			.description("Clear app data")
			.action(async (deviceId: string, bundleId: string) => {
				const { createAvailableAdapters, createDeviceManager } = await import("@simvyn/core");
				const adapters = await createAvailableAdapters();
				const dm = createDeviceManager(adapters);
				try {
					const devices = await dm.refresh();
					const target = devices.find((d) => d.id === deviceId || d.id.startsWith(deviceId));
					if (!target) {
						console.error(`Device not found: ${deviceId}`);
						process.exit(1);
					}
					if (target.state !== "booted") {
						console.error("Device must be booted");
						process.exit(1);
					}

					const adapter = dm.getAdapter(target.platform);
					if (!adapter?.clearAppData) {
						console.error(`Clear data not supported for ${target.platform}`);
						process.exit(1);
					}

					await adapter.clearAppData(target.id, bundleId);
					console.log(`Cleared data for ${bundleId} on ${target.name}`);
				} finally {
					dm.stop();
				}
			});
	},

	capabilities: ["appManagement"],
};

export default appManagementModule;
