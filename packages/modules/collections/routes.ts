import type {} from "@simvyn/server";
import type { Collection, CollectionStep, ExecutionRun } from "@simvyn/types";
import type { FastifyInstance } from "fastify";
import { createModuleStorage } from "@simvyn/core";
import { getActionDescriptors } from "./action-registry.js";
import { runCollection } from "./execution-engine.js";
import { getStarterCollections } from "./starter-collections.js";

const activeRuns = new Map<string, ExecutionRun>();

export async function collectionsRoutes(fastify: FastifyInstance) {
	const storage = createModuleStorage("collections");

	async function readCollections(): Promise<Collection[]> {
		const stored = await storage.read<Collection[]>("collections");
		if (stored && stored.length > 0) return stored;

		const starters = getStarterCollections();
		await writeCollections(starters);
		return starters;
	}

	async function writeCollections(collections: Collection[]): Promise<void> {
		await storage.write("collections", collections);
	}

	fastify.get("/actions", async () => {
		const descriptors = getActionDescriptors();
		return descriptors.map((d) => ({
			id: d.id,
			label: d.label,
			description: d.description,
			module: d.module,
			params: d.params,
		}));
	});

	fastify.get("/", async () => {
		const collections = await readCollections();
		return collections.sort(
			(a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
		);
	});

	fastify.get<{ Params: { id: string } }>("/:id", async (req, reply) => {
		const collections = await readCollections();
		const collection = collections.find((c) => c.id === req.params.id);
		if (!collection) return reply.status(404).send({ error: "Collection not found" });
		return collection;
	});

	fastify.post<{ Body: { name: string; description?: string; steps?: CollectionStep[] } }>(
		"/",
		async (req, reply) => {
			const { name, description, steps } = req.body;
			if (!name || typeof name !== "string" || name.trim().length === 0) {
				return reply.status(400).send({ error: "Name is required" });
			}

			const collection: Collection = {
				id: crypto.randomUUID(),
				name: name.trim(),
				description,
				steps: steps ?? [],
				schemaVersion: 1,
				createdAt: new Date().toISOString(),
				updatedAt: new Date().toISOString(),
			};

			const collections = await readCollections();
			collections.push(collection);
			await writeCollections(collections);

			return reply.status(201).send(collection);
		},
	);

	fastify.put<{
		Params: { id: string };
		Body: { name?: string; description?: string; steps?: CollectionStep[] };
	}>("/:id", async (req, reply) => {
		const collections = await readCollections();
		const idx = collections.findIndex((c) => c.id === req.params.id);
		if (idx === -1) return reply.status(404).send({ error: "Collection not found" });

		const existing = collections[idx];
		const { name, description, steps } = req.body;

		if (name !== undefined) existing.name = name;
		if (description !== undefined) existing.description = description;
		if (steps !== undefined) existing.steps = steps;
		existing.updatedAt = new Date().toISOString();

		collections[idx] = existing;
		await writeCollections(collections);

		return existing;
	});

	fastify.post<{ Params: { id: string } }>("/:id/duplicate", async (req, reply) => {
		const collections = await readCollections();
		const original = collections.find((c) => c.id === req.params.id);
		if (!original) return reply.status(404).send({ error: "Collection not found" });

		const duplicate: Collection = {
			id: crypto.randomUUID(),
			name: `${original.name} (Copy)`,
			description: original.description,
			steps: original.steps.map((step) => Object.assign({}, step, { id: crypto.randomUUID() })),
			schemaVersion: 1,
			createdAt: new Date().toISOString(),
			updatedAt: new Date().toISOString(),
		};

		collections.push(duplicate);
		await writeCollections(collections);

		return reply.status(201).send(duplicate);
	});

	fastify.delete<{ Params: { id: string } }>("/:id", async (req, reply) => {
		const collections = await readCollections();
		const idx = collections.findIndex((c) => c.id === req.params.id);
		if (idx === -1) return reply.status(404).send({ error: "Collection not found" });

		collections.splice(idx, 1);
		await writeCollections(collections);

		return { success: true };
	});

	fastify.post<{ Params: { id: string }; Body: { deviceIds: string[] } }>(
		"/:id/execute",
		async (req, reply) => {
			const collections = await readCollections();
			const collection = collections.find((c) => c.id === req.params.id);
			if (!collection) return reply.status(404).send({ error: "Collection not found" });

			const { deviceIds } = req.body;
			if (!Array.isArray(deviceIds) || deviceIds.length === 0) {
				return reply.status(400).send({ error: "deviceIds must be a non-empty array" });
			}

			const resolvedDevices: Array<{ id: string; name: string; platform: string }> = [];
			for (const did of deviceIds) {
				const device = fastify.deviceManager.devices.find(
					(d) => d.id === did || d.id.startsWith(did),
				);
				if (!device) {
					return reply.status(404).send({ error: `Device not found: ${did}` });
				}
				if (device.state !== "booted") {
					return reply.status(400).send({ error: `Device ${device.name} is not booted` });
				}
				resolvedDevices.push({ id: device.id, name: device.name, platform: device.platform });
			}

			const run = runCollection({
				collection,
				devices: resolvedDevices,
				getAdapter: (platform) => fastify.deviceManager.getAdapter(platform),
				onStepProgress: (r) => fastify.wsBroker.broadcast("collections", "step-progress", r),
				onComplete: (r) => {
					activeRuns.delete(r.runId);
					fastify.wsBroker.broadcast("collections", "run-completed", r);
				},
				onError: (r, err) => {
					activeRuns.delete(r.runId);
					fastify.wsBroker.broadcast("collections", "run-failed", { ...r, error: err.message });
				},
			});

			activeRuns.set(run.runId, run);
			return reply.status(202).send({ runId: run.runId });
		},
	);

	fastify.get<{ Params: { runId: string } }>("/runs/:runId", async (req, reply) => {
		const run = activeRuns.get(req.params.runId);
		if (!run) return reply.status(404).send({ error: "Run not found" });
		return run;
	});
}
