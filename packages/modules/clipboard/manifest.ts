import type { SimvynModule } from "@simvyn/types";
import { registerClipboardCli } from "./cli.js";
import { clipboardRoutes } from "./routes.js";

const clipboardModule: SimvynModule = {
	name: "clipboard",
	version: "0.1.0",
	description: "Read and write device clipboard contents",
	icon: "clipboard",

	async register(fastify, _opts) {
		await fastify.register(clipboardRoutes);
	},

	cli(program) {
		registerClipboardCli(program);
	},

	capabilities: ["clipboard"],
};

export default clipboardModule;
