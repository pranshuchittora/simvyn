import type { SimvynModule } from "@simvyn/types";

const collectionsModule: SimvynModule = {
	name: "collections",
	version: "0.1.0",
	description: "Create and manage reusable collections of device actions",
	icon: "collections",

	async register(_fastify, _opts) {
		// Routes added in Plan 02
	},

	capabilities: [],
};

export default collectionsModule;
