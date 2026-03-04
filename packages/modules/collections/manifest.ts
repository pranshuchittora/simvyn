import type { SimvynModule } from "@simvyn/types";
import { collectionsRoutes } from "./routes.js";
import { registerCollectionsWsHandler } from "./ws-handler.js";

const collectionsModule: SimvynModule = {
	name: "collections",
	version: "0.1.0",
	description: "Create and manage reusable collections of device actions",
	icon: "collections",

	async register(fastify, _opts) {
		await fastify.register(collectionsRoutes);
		registerCollectionsWsHandler(fastify);
	},

	cli(program) {
		const cmd = program.command("collections").description("Manage device action collections");

		cmd
			.command("list")
			.description("List all saved collections")
			.action(async () => {
				const { createModuleStorage } = await import("@simvyn/core");
				const storage = createModuleStorage("collections");
				const collections =
					(await storage.read<{ id: string; name: string; steps: unknown[]; updatedAt: string }[]>(
						"collections",
					)) ?? [];

				if (collections.length === 0) {
					console.log("No collections saved.");
					return;
				}

				console.log("ID".padEnd(10) + "Name".padEnd(30) + "Steps".padEnd(8) + "Updated");
				console.log("-".repeat(70));
				for (const c of collections) {
					console.log(
						c.id.slice(0, 8).padEnd(10) +
							c.name.slice(0, 28).padEnd(30) +
							String(c.steps.length).padEnd(8) +
							c.updatedAt,
					);
				}
			});

		cmd
			.command("show <id>")
			.description("Show a collection's details")
			.action(async (id: string) => {
				const { createModuleStorage } = await import("@simvyn/core");
				const storage = createModuleStorage("collections");
				const collections =
					(await storage.read<
						{
							id: string;
							name: string;
							description?: string;
							steps: {
								id: string;
								actionId: string;
								params: Record<string, unknown>;
								label?: string;
							}[];
						}[]
					>("collections")) ?? [];

				const collection = collections.find((c) => c.id.startsWith(id));
				if (!collection) {
					console.error(`Collection not found: ${id}`);
					process.exit(1);
				}

				console.log(`Name: ${collection.name}`);
				if (collection.description) console.log(`Description: ${collection.description}`);
				console.log(`Steps (${collection.steps.length}):`);
				for (const [i, step] of collection.steps.entries()) {
					console.log(`  ${i + 1}. ${step.label ?? step.actionId} (${step.actionId})`);
					for (const [k, v] of Object.entries(step.params)) {
						console.log(`     ${k}: ${v}`);
					}
				}
			});

		cmd
			.command("create <name>")
			.description("Create a new empty collection")
			.option("-d, --description <desc>", "Collection description")
			.action(async (name: string, opts: { description?: string }) => {
				const { createModuleStorage } = await import("@simvyn/core");
				const storage = createModuleStorage("collections");
				const collections = (await storage.read<unknown[]>("collections")) ?? [];

				const collection = {
					id: crypto.randomUUID(),
					name,
					description: opts.description,
					steps: [],
					schemaVersion: 1 as const,
					createdAt: new Date().toISOString(),
					updatedAt: new Date().toISOString(),
				};

				collections.push(collection);
				await storage.write("collections", collections);
				console.log(`Created collection: ${collection.id}`);
			});

		cmd
			.command("delete <id>")
			.description("Delete a collection")
			.action(async (id: string) => {
				const { createModuleStorage } = await import("@simvyn/core");
				const storage = createModuleStorage("collections");
				const collections =
					(await storage.read<{ id: string; name: string }[]>("collections")) ?? [];

				const idx = collections.findIndex((c) => c.id.startsWith(id));
				if (idx === -1) {
					console.error(`Collection not found: ${id}`);
					process.exit(1);
				}

				const removed = collections[idx];
				collections.splice(idx, 1);
				await storage.write("collections", collections);
				console.log(`Deleted collection: ${removed.name}`);
			});

		cmd
			.command("duplicate <id>")
			.description("Duplicate a collection")
			.option("-n, --name <newName>", "Name for the duplicate")
			.action(async (id: string, opts: { name?: string }) => {
				const { createModuleStorage } = await import("@simvyn/core");
				const storage = createModuleStorage("collections");
				const collections =
					(await storage.read<
						{
							id: string;
							name: string;
							description?: string;
							steps: {
								id: string;
								actionId: string;
								params: Record<string, unknown>;
								label?: string;
							}[];
							schemaVersion: 1;
						}[]
					>("collections")) ?? [];

				const original = collections.find((c) => c.id.startsWith(id));
				if (!original) {
					console.error(`Collection not found: ${id}`);
					process.exit(1);
				}

				const duplicate = {
					id: crypto.randomUUID(),
					name: opts.name ?? `${original.name} (Copy)`,
					description: original.description,
					steps: original.steps.map((s) => ({
						...s,
						id: crypto.randomUUID(),
					})),
					schemaVersion: 1 as const,
					createdAt: new Date().toISOString(),
					updatedAt: new Date().toISOString(),
				};

				collections.push(duplicate);
				await storage.write("collections", collections);
				console.log(`Duplicated collection: ${duplicate.id}`);
			});
	},

	capabilities: [],
};

export default collectionsModule;
