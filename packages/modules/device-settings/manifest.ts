import type { SimvynModule } from "@simvyn/types";
import { registerA11yCli, registerSettingsCli } from "./cli.js";
import { registerDevUtilsCli } from "./dev-cli.js";
import { devUtilsRoutes } from "./dev-routes.js";
import { settingsRoutes } from "./routes.js";

const deviceSettingsModule: SimvynModule = {
	name: "device-settings",
	version: "0.1.0",
	description:
		"Device settings, permissions, accessibility, port forwarding, display, battery, input, and bug reports",
	icon: "settings",

	async register(fastify, _opts) {
		await fastify.register(settingsRoutes);
		await fastify.register(devUtilsRoutes);
	},

	cli(program) {
		registerSettingsCli(program);
		registerA11yCli(program);
		registerDevUtilsCli(program);
	},

	capabilities: [
		"settings",
		"accessibility",
		"portForward",
		"displayOverride",
		"batterySimulation",
		"inputInjection",
		"bugReport",
		"orientation",
	],
};

export default deviceSettingsModule;
