import { execFile } from "node:child_process";
import { readFile, readdir, stat, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

export interface FileEntry {
	name: string;
	path: string;
	isDirectory: boolean;
	size: number;
	modified: string;
}

export async function iosGetContainerPath(deviceId: string, bundleId: string): Promise<string> {
	const { stdout } = await execFileAsync("xcrun", [
		"simctl",
		"get_app_container",
		deviceId,
		bundleId,
		"data",
	]);
	return stdout.trim();
}

export async function iosListDir(
	containerPath: string,
	relativePath: string,
): Promise<FileEntry[]> {
	const fullPath = join(containerPath, relativePath);
	const entries = await readdir(fullPath, { withFileTypes: true });
	return Promise.all(
		entries.map(async (entry) => {
			const entryPath = join(fullPath, entry.name);
			const stats = await stat(entryPath);
			return {
				name: entry.name,
				path: join(relativePath, entry.name),
				isDirectory: entry.isDirectory(),
				size: stats.size,
				modified: stats.mtime.toISOString(),
			};
		}),
	);
}

export async function iosReadFile(containerPath: string, relativePath: string): Promise<Buffer> {
	return readFile(join(containerPath, relativePath));
}

export async function iosWriteFile(
	containerPath: string,
	relativePath: string,
	data: Buffer,
): Promise<void> {
	await writeFile(join(containerPath, relativePath), data);
}
