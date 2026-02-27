import { copyFile, mkdtemp, readdir, readFile, rm, stat } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import Database, { type ColumnDefinition } from "better-sqlite3";

const SQLITE_MAGIC = Buffer.from("SQLite format 3\0");
const SKIP_DIRS = new Set(["Caches", "tmp"]);
const DB_EXTENSIONS = new Set([".db", ".sqlite", ".sqlite3"]);

export function openReadonly(dbPath: string): Database.Database {
	return new Database(dbPath, { readonly: true, timeout: 10000 });
}

export interface TableInfo {
	name: string;
	columns: Array<{
		cid: number;
		name: string;
		type: string;
		notnull: number;
		dflt_value: unknown;
		pk: number;
	}>;
	rowCount: number;
}

export function getTables(db: Database.Database): TableInfo[] {
	const tables = db
		.prepare(
			"SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name",
		)
		.all() as Array<{ name: string }>;

	return tables.map((t) => {
		const columns = db.prepare(`PRAGMA table_info("${t.name}")`).all() as TableInfo["columns"];
		const row = db.prepare(`SELECT count(*) as cnt FROM "${t.name}"`).get() as { cnt: number };
		return { name: t.name, columns, rowCount: row.cnt };
	});
}

export function queryTable(
	db: Database.Database,
	table: string,
	opts: { limit: number; offset: number; orderBy?: string; orderDir?: string },
): { rows: unknown[]; columns: ColumnDefinition[] } {
	const orderClause = opts.orderBy
		? `ORDER BY "${opts.orderBy}" ${opts.orderDir === "DESC" ? "DESC" : "ASC"}`
		: "";
	const stmt = db.prepare(`SELECT * FROM "${table}" ${orderClause} LIMIT ? OFFSET ?`);
	const rows = stmt.all(opts.limit, opts.offset);
	const columns = stmt.columns();
	return { rows, columns };
}

export function runQuery(
	db: Database.Database,
	sql: string,
):
	| { type: "rows"; rows: unknown[]; columns: ColumnDefinition[] }
	| { type: "run"; changes: number } {
	const stmt = db.prepare(sql);
	if (stmt.reader) {
		return { type: "rows" as const, rows: stmt.all(), columns: stmt.columns() };
	}
	return { type: "run" as const, changes: stmt.run().changes };
}

export async function findDatabases(
	dirPath: string,
): Promise<Array<{ name: string; path: string; size: number }>> {
	const results: Array<{ name: string; path: string; size: number }> = [];

	async function walk(dir: string) {
		let entries;
		try {
			entries = await readdir(dir, { withFileTypes: true });
		} catch {
			return;
		}

		for (const entry of entries) {
			const fullPath = join(dir, entry.name);
			if (entry.isDirectory()) {
				if (!SKIP_DIRS.has(entry.name)) {
					await walk(fullPath);
				}
				continue;
			}

			if (!entry.isFile()) continue;

			const ext = entry.name.includes(".") ? "." + entry.name.split(".").pop() : "";
			if (DB_EXTENSIONS.has(ext)) {
				const info = await stat(fullPath);
				results.push({ name: entry.name, path: fullPath, size: info.size });
				continue;
			}

			if (!ext) {
				try {
					const buf = Buffer.alloc(16);
					const fd = await readFile(fullPath, { flag: "r" });
					fd.copy(buf, 0, 0, 16);
					if (buf.compare(SQLITE_MAGIC, 0, 16, 0, 16) === 0) {
						const info = await stat(fullPath);
						results.push({ name: entry.name, path: fullPath, size: info.size });
					}
				} catch {
					// skip unreadable files
				}
			}
		}
	}

	await walk(dirPath);
	return results;
}

export async function updateCell(
	dbPath: string,
	table: string,
	rowid: number,
	column: string,
	value: unknown,
): Promise<void> {
	const tmpDir = await mkdtemp(join(tmpdir(), "simvyn-db-"));
	const tmpDbPath = join(tmpDir, "db.sqlite");

	try {
		await copyFile(dbPath, tmpDbPath);
		// copy WAL and SHM siblings if they exist
		for (const suffix of ["-wal", "-shm"]) {
			try {
				await copyFile(dbPath + suffix, tmpDbPath + suffix);
			} catch {
				// not present
			}
		}

		const db = new Database(tmpDbPath, { readonly: false, timeout: 10000 });
		try {
			db.prepare(`UPDATE "${table}" SET "${column}" = ? WHERE rowid = ?`).run(value, rowid);
		} finally {
			db.close();
		}

		await copyFile(tmpDbPath, dbPath);
	} finally {
		await rm(tmpDir, { recursive: true, force: true }).catch(() => {});
	}
}
