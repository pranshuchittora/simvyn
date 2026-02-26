import type { SimvynModule } from "@simvyn/types";
import { registerCrashLogsCli } from "./cli.js";
import { crashLogRoutes } from "./routes.js";

const crashLogsModule: SimvynModule = {
	name: "crash-logs",
	version: "0.1.0",
	description: "List and view crash logs from iOS and Android devices",
	icon: "bug",

	async register(fastify, _opts) {
		await fastify.register(crashLogRoutes);
	},

	cli(program) {
		registerCrashLogsCli(program);
	},

	capabilities: ["crashLogs"],
};

export default crashLogsModule;
