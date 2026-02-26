import type { SimvynModule } from "@simvyn/types";
import { registerMediaCli } from "./cli.js";
import { mediaRoutes } from "./routes.js";

const mediaModule: SimvynModule = {
	name: "media",
	version: "0.1.0",
	description: "Push photos and videos to device camera rolls and galleries",
	icon: "image",

	async register(fastify, _opts) {
		await fastify.register(mediaRoutes);
	},

	cli(program) {
		registerMediaCli(program);
	},

	capabilities: ["addMedia"],
};

export default mediaModule;
