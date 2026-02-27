import { readdir } from "node:fs/promises";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import type { PlatformCapability, SimvynModule } from "@simvyn/types";
import type { FastifyInstance } from "fastify";
import fp from "fastify-plugin";

export interface ModuleMetadata {
	name: string;
	version: string;
	description: string;
	icon?: string;
	capabilities?: PlatformCapability[];
}

declare module "fastify" {
	interface FastifyInstance {
		moduleRegistry: Map<string, ModuleMetadata>;
	}
}

function validateManifest(mod: unknown): mod is SimvynModule {
	if (!mod || typeof mod !== "object") return false;
	const m = mod as Record<string, unknown>;
	return (
		typeof m.name === "string" && typeof m.version === "string" && typeof m.register === "function"
	);
}

export const moduleLoaderPlugin = fp(
	async function moduleLoader(fastify: FastifyInstance, opts: { modulesDir: string }) {
		const registry = new Map<string, ModuleMetadata>();
		fastify.decorate("moduleRegistry", registry);

		const { modulesDir } = opts;

		let entries;
		try {
			entries = await readdir(modulesDir, { withFileTypes: true });
		} catch {
			fastify.log.info({ modulesDir }, "Modules directory not found, skipping module loading");
			registerModulesRoute(fastify, registry);
			return;
		}

		for (const entry of entries) {
			if (!entry.isDirectory()) continue;

			const manifestPath = join(modulesDir, entry.name, "manifest");

			let mod: SimvynModule;
			try {
				// Try .js first (compiled), then .ts via import
				let imported;
				try {
					const jsPath = manifestPath + ".js";
					imported = await import(pathToFileURL(jsPath).href);
				} catch {
					const tsPath = manifestPath + ".ts";
					imported = await import(pathToFileURL(tsPath).href);
				}
				mod = imported.default ?? imported;
			} catch (err) {
				fastify.log.warn(
					{ module: entry.name, error: (err as Error).message },
					"Failed to import module manifest, skipping",
				);
				continue;
			}

			if (!validateManifest(mod)) {
				fastify.log.warn(
					{ module: entry.name },
					"Invalid module manifest (missing name, version, or register), skipping",
				);
				continue;
			}

			try {
				await fastify.register(mod.register, { prefix: `/api/modules/${mod.name}` });
			} catch (err) {
				fastify.log.warn(
					{ module: mod.name, error: (err as Error).message },
					"Failed to register module, skipping",
				);
				continue;
			}

			registry.set(mod.name, {
				name: mod.name,
				version: mod.version,
				description: mod.description,
				icon: mod.icon,
				capabilities: mod.capabilities,
			});

			fastify.log.info({ module: mod.name, version: mod.version }, "Module loaded");
		}

		registerModulesRoute(fastify, registry);
	},
	{ name: "module-loader" },
);

export const moduleLoaderFromArrayPlugin = fp(
	async function moduleLoaderFromArray(
		fastify: FastifyInstance,
		opts: { modules: SimvynModule[] },
	) {
		const registry = new Map<string, ModuleMetadata>();
		fastify.decorate("moduleRegistry", registry);

		for (const mod of opts.modules) {
			if (!validateManifest(mod)) {
				fastify.log.warn({ module: (mod as any)?.name }, "Invalid module manifest, skipping");
				continue;
			}

			try {
				await fastify.register(mod.register, { prefix: `/api/modules/${mod.name}` });
			} catch (err) {
				fastify.log.warn(
					{ module: mod.name, error: (err as Error).message },
					"Failed to register module, skipping",
				);
				continue;
			}

			registry.set(mod.name, {
				name: mod.name,
				version: mod.version,
				description: mod.description,
				icon: mod.icon,
				capabilities: mod.capabilities,
			});

			fastify.log.info({ module: mod.name, version: mod.version }, "Module loaded");
		}

		registerModulesRoute(fastify, registry);
	},
	{ name: "module-loader" },
);

function registerModulesRoute(fastify: FastifyInstance, registry: Map<string, ModuleMetadata>) {
	fastify.get("/api/modules", async () => {
		return Array.from(registry.values());
	});
}

export async function getModuleCLIRegistrars(
	modulesDir: string,
): Promise<Array<{ name: string; register: (program: any) => void }>> {
	const registrars: Array<{ name: string; register: (program: any) => void }> = [];

	let entries;
	try {
		entries = await readdir(modulesDir, { withFileTypes: true });
	} catch {
		return registrars;
	}

	for (const entry of entries) {
		if (!entry.isDirectory()) continue;

		const manifestPath = join(modulesDir, entry.name, "manifest");
		try {
			let imported;
			try {
				imported = await import(pathToFileURL(manifestPath + ".js").href);
			} catch {
				imported = await import(pathToFileURL(manifestPath + ".ts").href);
			}
			const mod = imported.default ?? imported;
			if (mod?.cli && typeof mod.cli === "function") {
				registrars.push({ name: mod.name, register: mod.cli });
			}
		} catch {
			// Skip modules that can't be imported
		}
	}

	return registrars;
}
