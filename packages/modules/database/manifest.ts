import type { SimvynModule } from "@simvyn/types";
import { dbRoutes } from "./routes.js";

const databaseModule: SimvynModule = {
	name: "database",
	version: "0.1.0",
	description: "SQLite database inspector and key-value store reader",
	icon: "database",

	async register(fastify, _opts) {
		await fastify.register(dbRoutes);
	},

	cli(program) {
		const db = program.command("db").description("Database inspection commands");

		db.command("list <device> <bundle-id>")
			.description("List SQLite databases in an app container")
			.action(async (deviceId: string, bundleId: string) => {
				const { createAvailableAdapters, createDeviceManager } = await import("@simvyn/core");
				const adapters = await createAvailableAdapters();
				const dm = createDeviceManager(adapters);
				try {
					const devices = await dm.refresh();
					const target = devices.find((d) => d.id === deviceId || d.id.startsWith(deviceId));
					if (!target) {
						console.error(`Device not found: ${deviceId}`);
						process.exit(1);
					}
					if (target.state !== "booted") {
						console.error("Device must be booted");
						process.exit(1);
					}

					if (target.platform === "ios") {
						const adapter = dm.getAdapter("ios");
						if (!adapter?.getAppInfo) {
							console.error("Not supported");
							process.exit(1);
						}
						const info = await adapter.getAppInfo(target.id, bundleId);
						if (!info?.dataContainer) {
							console.error("App not found or no data container");
							process.exit(1);
						}

						const { findDatabases } = await import("./sqlite-inspector.js");
						const databases = await findDatabases(info.dataContainer);
						if (databases.length === 0) {
							console.log("No databases found");
							return;
						}

						const header = ["Name", "Path", "Size"];
						const rows = databases.map((d) => [d.name, d.path, formatSize(d.size)]);
						printTable(header, rows);
					} else {
						if (target.id.startsWith("avd:")) {
							console.error("Device must be booted");
							process.exit(1);
						}
						const { execFile } = await import("node:child_process");
						const { promisify } = await import("node:util");
						const execFileAsync = promisify(execFile);
						const { stdout } = await execFileAsync("adb", [
							"-s",
							target.id,
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
						const files = stdout.trim().split("\n").filter(Boolean);
						if (files.length === 0) {
							console.log("No databases found");
							return;
						}

						const header = ["Name", "Path"];
						const rows = files.map((p) => [p.split("/").pop()!, p.trim()]);
						printTable(header, rows);
					}
				} finally {
					dm.stop();
				}
			});

		db.command("query <device> <bundle-id> <db-path> <sql>")
			.description("Run a SQL query against an app database")
			.action(async (deviceId: string, bundleId: string, dbPath: string, sql: string) => {
				const { createAvailableAdapters, createDeviceManager } = await import("@simvyn/core");
				const adapters = await createAvailableAdapters();
				const dm = createDeviceManager(adapters);
				try {
					const devices = await dm.refresh();
					const target = devices.find((d) => d.id === deviceId || d.id.startsWith(deviceId));
					if (!target) {
						console.error(`Device not found: ${deviceId}`);
						process.exit(1);
					}
					if (target.state !== "booted") {
						console.error("Device must be booted");
						process.exit(1);
					}

					const { openReadonly, runQuery } = await import("./sqlite-inspector.js");

					if (target.platform === "ios") {
						const adapter = dm.getAdapter("ios");
						if (!adapter?.getAppInfo) {
							console.error("Not supported");
							process.exit(1);
						}
						const info = await adapter.getAppInfo(target.id, bundleId);
						if (!info?.dataContainer) {
							console.error("App not found or no data container");
							process.exit(1);
						}

						const { join } = await import("node:path");
						const fullPath = dbPath.startsWith("/") ? dbPath : join(info.dataContainer, dbPath);
						const handle = openReadonly(fullPath);
						try {
							const result = runQuery(handle, sql);
							printQueryResult(result);
						} finally {
							handle.close();
						}
					} else {
						if (target.id.startsWith("avd:")) {
							console.error("Device must be booted");
							process.exit(1);
						}
						const { execFile } = await import("node:child_process");
						const { promisify } = await import("node:util");
						const { mkdtemp, writeFile, rm } = await import("node:fs/promises");
						const { tmpdir } = await import("node:os");
						const { join } = await import("node:path");
						const execFileAsync = promisify(execFile);

						const tmpDir = await mkdtemp(join(tmpdir(), "simvyn-adb-db-"));
						const localPath = join(tmpDir, "db.sqlite");
						try {
							const { stdout } = await execFileAsync(
								"adb",
								["-s", target.id, "shell", "run-as", bundleId, "cat", dbPath],
								{ encoding: "buffer" as any, maxBuffer: 100 * 1024 * 1024 },
							);
							await writeFile(localPath, stdout as unknown as Buffer);

							const handle = openReadonly(localPath);
							try {
								const result = runQuery(handle, sql);
								printQueryResult(result);
							} finally {
								handle.close();
							}
						} finally {
							await rm(tmpDir, { recursive: true, force: true }).catch(() => {});
						}
					}
				} finally {
					dm.stop();
				}
			});

		db.command("prefs <device> <bundle-id>")
			.description("Show app preferences (SharedPreferences / NSUserDefaults)")
			.action(async (deviceId: string, bundleId: string) => {
				const { createAvailableAdapters, createDeviceManager } = await import("@simvyn/core");
				const adapters = await createAvailableAdapters();
				const dm = createDeviceManager(adapters);
				try {
					const devices = await dm.refresh();
					const target = devices.find((d) => d.id === deviceId || d.id.startsWith(deviceId));
					if (!target) {
						console.error(`Device not found: ${deviceId}`);
						process.exit(1);
					}
					if (target.state !== "booted") {
						console.error("Device must be booted");
						process.exit(1);
					}

					if (target.platform === "ios") {
						const adapter = dm.getAdapter("ios");
						if (!adapter?.getAppInfo) {
							console.error("Not supported");
							process.exit(1);
						}
						const info = await adapter.getAppInfo(target.id, bundleId);
						if (!info?.dataContainer) {
							console.error("App not found or no data container");
							process.exit(1);
						}

						const { readNSUserDefaults } = await import("./prefs-reader.js");
						const prefs = await readNSUserDefaults(info.dataContainer, bundleId);
						const entries = Object.entries(prefs);
						if (entries.length === 0) {
							console.log("No preferences found");
							return;
						}

						const header = ["Key", "Value", "Type"];
						const rows = entries.map(([k, v]) => [k, String(v), typeof v]);
						printTable(header, rows);
					} else {
						if (target.id.startsWith("avd:")) {
							console.error("Device must be booted");
							process.exit(1);
						}
						const { readSharedPreferences } = await import("./prefs-reader.js");
						const prefs = await readSharedPreferences(target.id, bundleId);
						const files = Object.entries(prefs);
						if (files.length === 0) {
							console.log("No preferences found");
							return;
						}

						for (const [file, entries] of files) {
							console.log(`\n${file}:`);
							if (entries.length === 0) {
								console.log("  (empty)");
								continue;
							}
							const header = ["Key", "Value", "Type"];
							const rows = entries.map((e) => [e.key, String(e.value), e.type]);
							printTable(header, rows);
						}
					}
				} finally {
					dm.stop();
				}
			});
	},

	capabilities: ["database"],
};

function formatSize(bytes: number): string {
	if (bytes < 1024) return `${bytes} B`;
	if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
	return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function printTable(header: string[], rows: string[][]) {
	const widths = header.map((h, i) => Math.max(h.length, ...rows.map((r) => (r[i] ?? "").length)));
	const pad = (s: string, w: number) => s + " ".repeat(Math.max(0, w - s.length));

	console.log(header.map((h, i) => pad(h, widths[i])).join("  "));
	console.log(widths.map((w) => "-".repeat(w)).join("  "));
	for (const row of rows) {
		console.log(row.map((c, i) => pad(c ?? "", widths[i])).join("  "));
	}
}

function printQueryResult(
	result:
		| { type: "rows"; rows: unknown[]; columns: Array<{ name: string }> }
		| { type: "run"; changes: number },
) {
	if (result.type === "run") {
		console.log(`${result.changes} row(s) affected`);
		return;
	}

	if (result.rows.length === 0) {
		console.log("No rows returned");
		return;
	}

	const header = result.columns.map((c) => c.name);
	const rows = result.rows.map((r) =>
		header.map((h) => String((r as Record<string, unknown>)[h] ?? "NULL")),
	);
	printTable(header, rows);
}

export default databaseModule;
