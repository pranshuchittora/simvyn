import type { SimvynModule } from "@simvyn/types";
import { registerDevUtilsCli } from "./cli.js";
import { devUtilsRoutes } from "./routes.js";

const devUtilsModule: SimvynModule = {
	name: "dev-utils",
	version: "0.1.0",
	description:
		"Developer utilities: port forwarding, display overrides, battery simulation, input injection, bug reports",
	icon: "wrench",

	async register(fastify, _opts) {
		await fastify.register(devUtilsRoutes);
	},

	cli(program) {
		registerDevUtilsCli(program);
	},

	capabilities: [
		"portForward",
		"displayOverride",
		"batterySimulation",
		"inputInjection",
		"bugReport",
	],
};

export default devUtilsModule;
