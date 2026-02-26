import { mkdir, readFile, rename, unlink, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import { join } from "node:path";
import type { ModuleStorage } from "@simvyn/types";

const SIMVYN_DIR = join(homedir(), ".simvyn");

export function getSimvynDir(): string {
	return SIMVYN_DIR;
}

export function createModuleStorage(moduleName: string): ModuleStorage {
	const moduleDir = join(SIMVYN_DIR, moduleName);

	function filePath(key: string): string {
		return join(moduleDir, `${key}.json`);
	}

	return {
		async read<T>(key: string): Promise<T | null> {
			try {
				const content = await readFile(filePath(key), "utf-8");
				return JSON.parse(content) as T;
			} catch {
				return null;
			}
		},

		async write<T>(key: string, data: T): Promise<void> {
			await mkdir(moduleDir, { recursive: true });
			const target = filePath(key);
			const tmp = `${target}.tmp`;
			await writeFile(tmp, JSON.stringify(data, null, 2), "utf-8");
			await rename(tmp, target);
		},

		async delete(key: string): Promise<void> {
			try {
				await unlink(filePath(key));
			} catch (err) {
				if ((err as NodeJS.ErrnoException).code !== "ENOENT") throw err;
			}
		},
	};
}
