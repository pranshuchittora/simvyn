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
					steps: original.steps.map((s) => Object.assign({}, s, { id: crypto.randomUUID() })),
					schemaVersion: 1 as const,
					createdAt: new Date().toISOString(),
					updatedAt: new Date().toISOString(),
				};

				collections.push(duplicate);
				await storage.write("collections", collections);
				console.log(`Duplicated collection: ${duplicate.id}`);
			});

		cmd
			.command("apply <name-or-id>")
			.description("Execute a collection on one or more devices")
			.argument("<devices...>", "Device IDs to execute on")
			.action(async (nameOrId: string, devices: string[]) => {
				const { createAvailableAdapters, createDeviceManager } = await import("@simvyn/core");
				const { createModuleStorage } = await import("@simvyn/core");
				const { runCollection } = await import("./execution-engine.js");
				const storage = createModuleStorage("collections");

				const adapters = await createAvailableAdapters();
				const dm = createDeviceManager(adapters);

				try {
					await dm.refresh();

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
								createdAt: string;
								updatedAt: string;
							}[]
						>("collections")) ?? [];

					const collection = collections.find(
						(c) => c.id.startsWith(nameOrId) || c.name.toLowerCase() === nameOrId.toLowerCase(),
					);
					if (!collection) {
						console.error(`Collection not found: ${nameOrId}`);
						process.exit(1);
					}

					const resolvedDevices: Array<{ id: string; name: string; platform: string }> = [];
					for (const did of devices) {
						const device = dm.devices.find((d) => d.id === did || d.id.startsWith(did));
						if (!device) {
							console.error(`Device not found: ${did}`);
							process.exit(1);
						}
						if (device.state !== "booted") {
							console.error(`Device ${device.name} is not booted`);
							process.exit(1);
						}
						resolvedDevices.push({ id: device.id, name: device.name, platform: device.platform });
					}

					const GREEN = "\x1b[32m";
					const RED = "\x1b[31m";
					const YELLOW = "\x1b[33m";
					const RESET = "\x1b[0m";

					await new Promise<void>((resolve, reject) => {
						runCollection({
							collection,
							devices: resolvedDevices,
							getAdapter: (platform) => dm.getAdapter(platform as "ios" | "android"),
							onStepProgress: (run) => {
								const step = run.steps[run.currentStepIndex];
								console.log(`Step ${run.currentStepIndex + 1}/${run.steps.length}: ${step.label}`);
								for (const dr of step.devices) {
									const color =
										dr.status === "success" ? GREEN : dr.status === "failed" ? RED : YELLOW;
									console.log(
										`  ${dr.deviceName}: ${color}${dr.status}${RESET}${dr.error ? ` (${dr.error})` : ""}`,
									);
								}
							},
							onComplete: (run) => {
								const counts = { success: 0, skipped: 0, failed: 0 };
								for (const step of run.steps) {
									for (const dr of step.devices) {
										if (dr.status === "success") counts.success++;
										else if (dr.status === "skipped") counts.skipped++;
										else if (dr.status === "failed") counts.failed++;
									}
								}
								console.log(
									`\nCollection "${run.collectionName}" completed: ${GREEN}${counts.success} success${RESET}, ${YELLOW}${counts.skipped} skipped${RESET}, ${RED}${counts.failed} failed${RESET}`,
								);
								dm.stop();
								resolve();
							},
							onError: (_run, err) => {
								console.error(`\n${RED}Error: ${err.message}${RESET}`);
								dm.stop();
								reject(err);
							},
						});
					});
				} catch {
					dm.stop();
					process.exit(1);
				}
			});
	},

	capabilities: [],
};

export default collectionsModule;
