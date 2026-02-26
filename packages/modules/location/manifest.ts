import type { SimvynModule } from "@simvyn/types";

const locationModule: SimvynModule = {
	name: "location",
	version: "0.1.0",
	description: "GPS location simulation with interactive map",
	icon: "map-pin",

	async register(fastify, _opts) {
		// Routes, WS handler, and playback engine registered in Plan 02
	},

	capabilities: ["setLocation"],
};

export default locationModule;
