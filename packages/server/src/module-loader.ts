import fp from "fastify-plugin";
import type { FastifyInstance } from "fastify";

export interface ModuleMetadata {
	name: string;
	version: string;
	description: string;
	icon?: string;
	capabilities?: string[];
}

declare module "fastify" {
	interface FastifyInstance {
		moduleRegistry: Map<string, ModuleMetadata>;
	}
}

export const moduleLoaderPlugin = fp(async function moduleLoader(fastify: FastifyInstance, opts: { modulesDir: string }) {
	// Placeholder — implemented in Task 3
}, { name: "module-loader" });

export async function getModuleCLIRegistrars(_modulesDir: string): Promise<Array<{ name: string; register: (program: any) => void }>> {
	return [];
}
