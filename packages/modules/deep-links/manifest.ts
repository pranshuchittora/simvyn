import type { SimvynModule } from "@simvyn/types";
import { deepLinkRoutes } from "./routes.js";

const deepLinksModule: SimvynModule = {
	name: "deep-links",
	version: "0.1.0",
	description: "Open URLs and custom schemes on devices, save favorite deep links",
	icon: "external-link",

	async register(fastify, _opts) {
		await fastify.register(deepLinkRoutes);
	},

	cli(program) {
		program
			.command("link <device> <url>")
			.description("Open a URL or deep link on a device")
			.action(async (deviceId: string, url: string) => {
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
					if (!adapter?.openUrl) {
						console.error(`Deep links not supported for ${target.platform}`);
						process.exit(1);
					}

					await adapter.openUrl(target.id, url);
					console.log(`Opened ${url} on ${target.name}`);
				} finally {
					dm.stop();
				}
			});
	},

	capabilities: ["deepLinks"],
};

export default deepLinksModule;
