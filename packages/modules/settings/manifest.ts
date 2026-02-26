import type { SimvynModule } from "@simvyn/types";
import { registerA11yCli, registerSettingsCli } from "./cli.js";
import { settingsRoutes } from "./routes.js";

const settingsModule: SimvynModule = {
	name: "settings",
	version: "0.1.0",
	description: "Device settings, permissions, and accessibility controls",
	icon: "settings",

	async register(fastify, _opts) {
		await fastify.register(settingsRoutes);
	},

	cli(program) {
		registerSettingsCli(program);
		registerA11yCli(program);
	},

	capabilities: ["settings", "accessibility"],
};

export default settingsModule;
