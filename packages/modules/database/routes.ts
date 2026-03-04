import { execFile } from "node:child_process";
import { copyFile, mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";
import { isPhysicalDevice } from "@simvyn/core";
import type {} from "@simvyn/server";
import type { Device } from "@simvyn/types";
import Database from "better-sqlite3";
import type { FastifyInstance } from "fastify";
import { readNSUserDefaults, readSharedPreferences } from "./prefs-reader.js";
import {
	findDatabases,
	getTables,
	openReadonly,
	queryTable,
	runQuery,
	updateCell,
} from "./sqlite-inspector.js";

const execFileAsync = promisify(execFile);

function resolveDevice(fastify: FastifyInstance, deviceId: string) {
	const device = fastify.deviceManager.devices.find((d: Device) => d.id === deviceId);
	if (!device) return null;
	return device;
}

async function getContainerPath(fastify: FastifyInstance, deviceId: string, bundleId: string) {
	if (isPhysicalDevice(deviceId))
		return {
			error:
				"Database browsing is not available on physical iOS devices (no filesystem access without jailbreak)" as const,
			device: null,
			platform: null,
		};

	const device = resolveDevice(fastify, deviceId);
	if (!device) return { error: "Device not found" as const, device: null, platform: null };
	if (device.state !== "booted")
		return { error: "Device must be booted" as const, device: null, platform: null };

	if (device.platform === "ios") {
		const adapter = fastify.deviceManager.getAdapter("ios");
		if (!adapter?.getAppInfo)
			return { error: "Not supported" as const, device: null, platform: null };
		const info = await adapter.getAppInfo(device.id, bundleId);
		if (!info?.dataContainer)
			return { error: "App not found or no data container" as const, device: null, platform: null };
		return { error: null, device, platform: "ios" as const, containerPath: info.dataContainer };
	}

	return { error: null, device, platform: "android" as const, containerPath: null };
}

async function withLocalDb<T>(
	deviceId: string,
	packageName: string,
	dbPath: string,
	readonly: boolean,
	fn: (localDbPath: string) => T | Promise<T>,
): Promise<T> {
	const tmpDir = await mkdtemp(join(tmpdir(), "simvyn-adb-db-"));
	const localPath = join(tmpDir, "db.sqlite");
	const remotePath = dbPath.startsWith("/") ? dbPath : `/data/data/${packageName}/${dbPath}`;

	try {
		// Pull db from device using exec-out (binary-safe, no line-ending conversion)
		const { stdout } = await execFileAsync(
			"adb",
			["-s", deviceId, "exec-out", "run-as", packageName, "cat", remotePath],
			{
				encoding: "buffer" as any,
				maxBuffer: 100 * 1024 * 1024,
			},
		);
		const { writeFile } = await import("node:fs/promises");
		await writeFile(localPath, stdout as unknown as Buffer);

		// Also pull WAL and SHM if they exist
		for (const suffix of ["-wal", "-shm"]) {
			try {
				const { stdout: walData } = await execFileAsync(
					"adb",
					["-s", deviceId, "exec-out", "run-as", packageName, "cat", `${remotePath}${suffix}`],
					{ encoding: "buffer" as any, maxBuffer: 100 * 1024 * 1024 },
				);
				await writeFile(localPath + suffix, walData as unknown as Buffer);
			} catch {
				// not present
			}
		}

		const result = await fn(localPath);

		if (!readonly) {
			// Push modified db back
			const { readFile } = await import("node:fs/promises");
			const data = await readFile(localPath);
			const b64 = data.toString("base64");
			await execFileAsync("adb", [
				"-s",
				deviceId,
				"shell",
				`echo '${b64}' | run-as ${packageName} sh -c 'base64 -d > ${remotePath}'`,
			]);
		}

		return result;
	} finally {
		await rm(tmpDir, { recursive: true, force: true }).catch(() => {});
	}
}

export async function dbRoutes(fastify: FastifyInstance) {
	// GET /databases/:deviceId/:bundleId — list all SQLite databases
	fastify.get<{ Params: { deviceId: string; bundleId: string } }>(
		"/databases/:deviceId/:bundleId",
		async (req, reply) => {
			const { deviceId, bundleId } = req.params;
			const ctx = await getContainerPath(fastify, deviceId, bundleId);
			if (ctx.error) return reply.status(400).send({ error: ctx.error });

			try {
				if (ctx.platform === "ios") {
					const databases = await findDatabases(ctx.containerPath!);
					return { databases };
				}

				// Android: use adb find
				const { stdout } = await execFileAsync("adb", [
					"-s",
					deviceId,
					"shell",
					"run-as",
					bundleId,
					"find",
					`/data/data/${bundleId}`,
					"-name",
					"*.db",
					"-o",
					"-name",
					"*.sqlite",
					"-o",
					"-name",
					"*.sqlite3",
				]);
				const databases = stdout
					.trim()
					.split("\n")
					.filter(Boolean)
					.map((p) => ({
						name: p.split("/").pop()!,
						path: p.trim(),
						size: 0,
					}));
				return { databases };
			} catch (err) {
				return reply.status(500).send({ error: (err as Error).message });
			}
		},
	);

	// GET /tables/:deviceId/:bundleId?db=<path> — list tables with schema
	fastify.get<{ Params: { deviceId: string; bundleId: string }; Querystring: { db: string } }>(
		"/tables/:deviceId/:bundleId",
		async (req, reply) => {
			const { deviceId, bundleId } = req.params;
			const dbParam = req.query.db;
			if (!dbParam) return reply.status(400).send({ error: "db query param required" });

			const ctx = await getContainerPath(fastify, deviceId, bundleId);
			if (ctx.error) return reply.status(400).send({ error: ctx.error });

			try {
				if (ctx.platform === "ios") {
					const dbPath = dbParam.startsWith("/") ? dbParam : join(ctx.containerPath!, dbParam);
					const db = openReadonly(dbPath);
					try {
						return { tables: getTables(db) };
					} finally {
						db.close();
					}
				}

				// Android: pull and inspect
				return await withLocalDb(deviceId, bundleId, dbParam, true, (localPath) => {
					const db = openReadonly(localPath);
					try {
						return { tables: getTables(db) };
					} finally {
						db.close();
					}
				});
			} catch (err) {
				return reply.status(500).send({ error: (err as Error).message });
			}
		},
	);

	// GET /table-data/:deviceId/:bundleId?db=&table=&limit=&offset=&orderBy=&orderDir=
	fastify.get<{
		Params: { deviceId: string; bundleId: string };
		Querystring: {
			db: string;
			table: string;
			limit?: string;
			offset?: string;
			orderBy?: string;
			orderDir?: string;
		};
	}>("/table-data/:deviceId/:bundleId", async (req, reply) => {
		const { deviceId, bundleId } = req.params;
		const { db: dbParam, table, limit: limitStr, offset: offsetStr, orderBy, orderDir } = req.query;
		if (!dbParam || !table)
			return reply.status(400).send({ error: "db and table query params required" });

		const limit = parseInt(limitStr ?? "50", 10);
		const offset = parseInt(offsetStr ?? "0", 10);
		const ctx = await getContainerPath(fastify, deviceId, bundleId);
		if (ctx.error) return reply.status(400).send({ error: ctx.error });

		try {
			const operate = (localPath: string) => {
				const db = openReadonly(localPath);
				try {
					const { rows, columns } = queryTable(db, table, { limit, offset, orderBy, orderDir });
					const { cnt } = db.prepare(`SELECT count(*) as cnt FROM "${table}"`).get() as {
						cnt: number;
					};
					return { rows, columns, total: cnt };
				} finally {
					db.close();
				}
			};

			if (ctx.platform === "ios") {
				const dbPath = dbParam.startsWith("/") ? dbParam : join(ctx.containerPath!, dbParam);
				return operate(dbPath);
			}

			return await withLocalDb(deviceId, bundleId, dbParam, true, operate);
		} catch (err) {
			return reply.status(500).send({ error: (err as Error).message });
		}
	});

	// POST /query/:deviceId/:bundleId — run arbitrary SQL
	fastify.post<{
		Params: { deviceId: string; bundleId: string };
		Body: { db: string; sql: string };
	}>("/query/:deviceId/:bundleId", async (req, reply) => {
		const { deviceId, bundleId } = req.params;
		const { db: dbParam, sql } = req.body;
		if (!dbParam || !sql) return reply.status(400).send({ error: "db and sql required" });

		const ctx = await getContainerPath(fastify, deviceId, bundleId);
		if (ctx.error) return reply.status(400).send({ error: ctx.error });

		try {
			// Detect if it's a read or write query
			const isRead = /^\s*(SELECT|PRAGMA|EXPLAIN|WITH)\b/i.test(sql);

			if (ctx.platform === "ios") {
				const dbPath = dbParam.startsWith("/") ? dbParam : join(ctx.containerPath!, dbParam);
				if (isRead) {
					const db = openReadonly(dbPath);
					try {
						return runQuery(db, sql);
					} finally {
						db.close();
					}
				}
				// Write query: copy-on-write
				const tmpDir = await mkdtemp(join(tmpdir(), "simvyn-sql-"));
				const tmpPath = join(tmpDir, "db.sqlite");
				try {
					await copyFile(dbPath, tmpPath);
					for (const suffix of ["-wal", "-shm"]) {
						try {
							await copyFile(dbPath + suffix, tmpPath + suffix);
						} catch {
							/* noop */
						}
					}
					const db = new Database(tmpPath, { readonly: false, timeout: 10000 });
					try {
						const result = runQuery(db, sql);
						await copyFile(tmpPath, dbPath);
						return result;
					} finally {
						db.close();
					}
				} finally {
					await rm(tmpDir, { recursive: true, force: true }).catch(() => {});
				}
			}

			// Android
			if (isRead) {
				return await withLocalDb(deviceId, bundleId, dbParam, true, (localPath) => {
					const db = openReadonly(localPath);
					try {
						return runQuery(db, sql);
					} finally {
						db.close();
					}
				});
			}

			return await withLocalDb(deviceId, bundleId, dbParam, false, (localPath) => {
				const db = new Database(localPath, { readonly: false, timeout: 10000 });
				try {
					return runQuery(db, sql);
				} finally {
					db.close();
				}
			});
		} catch (err) {
			const msg = (err as Error).message;
			return reply.status(400).send({ error: msg });
		}
	});

	// POST /update-cell/:deviceId/:bundleId — update a single cell
	fastify.post<{
		Params: { deviceId: string; bundleId: string };
		Body: { db: string; table: string; rowid: number; column: string; value: unknown };
	}>("/update-cell/:deviceId/:bundleId", async (req, reply) => {
		const { deviceId, bundleId } = req.params;
		const { db: dbParam, table, rowid, column, value } = req.body;
		if (!dbParam || !table || rowid == null || !column) {
			return reply.status(400).send({ error: "db, table, rowid, and column required" });
		}

		const ctx = await getContainerPath(fastify, deviceId, bundleId);
		if (ctx.error) return reply.status(400).send({ error: ctx.error });

		try {
			if (ctx.platform === "ios") {
				const dbPath = dbParam.startsWith("/") ? dbParam : join(ctx.containerPath!, dbParam);
				await updateCell(dbPath, table, rowid, column, value);
				return { success: true };
			}

			await withLocalDb(deviceId, bundleId, dbParam, false, (localPath) => {
				const db = new Database(localPath, { readonly: false, timeout: 10000 });
				try {
					db.prepare(`UPDATE "${table}" SET "${column}" = ? WHERE rowid = ?`).run(value, rowid);
				} finally {
					db.close();
				}
			});
			return { success: true };
		} catch (err) {
			return reply.status(500).send({ error: (err as Error).message });
		}
	});

	// GET /prefs/:deviceId/:bundleId — get key-value preferences
	fastify.get<{ Params: { deviceId: string; bundleId: string } }>(
		"/prefs/:deviceId/:bundleId",
		async (req, reply) => {
			const { deviceId, bundleId } = req.params;
			const ctx = await getContainerPath(fastify, deviceId, bundleId);
			if (ctx.error) return reply.status(400).send({ error: ctx.error });

			try {
				if (ctx.platform === "ios") {
					const prefs = await readNSUserDefaults(ctx.containerPath!, bundleId);
					return { platform: "ios", prefs };
				}

				const prefsMap = await readSharedPreferences(deviceId, bundleId);
				const prefs = Object.entries(prefsMap).map(([file, entries]) => ({ file, entries }));
				return { platform: "android", prefs };
			} catch (err) {
				return reply.status(500).send({ error: (err as Error).message });
			}
		},
	);
}
