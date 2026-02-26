import { execFile } from "node:child_process";
import { readFile, rm, writeFile } from "node:fs/promises";
import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";
import type { FileEntry } from "./ios-fs.js";

const execFileAsync = promisify(execFile);
const STAGING_PATH = "/data/local/tmp/simvyn_transfer";

function guardDeviceId(deviceId: string): void {
	if (deviceId.startsWith("avd:")) {
		throw new Error("Device must be booted");
	}
}

function handleRunAsError(err: unknown, packageName: string): never {
	const msg = (err as Error).message ?? "";
	if (msg.includes("not debuggable")) {
		throw new Error(
			`Package ${packageName} is not debuggable. Only debug builds can be inspected.`,
		);
	}
	throw err;
}

export async function androidGetContainerPath(
	deviceId: string,
	packageName: string,
): Promise<string> {
	guardDeviceId(deviceId);
	try {
		await execFileAsync("adb", [
			"-s",
			deviceId,
			"shell",
			"run-as",
			packageName,
			"pwd",
		]);
	} catch (err) {
		handleRunAsError(err, packageName);
	}
	return `/data/data/${packageName}`;
}

export async function androidListDir(
	deviceId: string,
	packageName: string,
	remotePath: string,
): Promise<FileEntry[]> {
	guardDeviceId(deviceId);
	try {
		const { stdout } = await execFileAsync("adb", [
			"-s",
			deviceId,
			"shell",
			"run-as",
			packageName,
			"ls",
			"-la",
			remotePath,
		]);
		return parseAndroidLsOutput(stdout, remotePath);
	} catch (err) {
		return handleRunAsError(err, packageName);
	}
}

function parseAndroidLsOutput(stdout: string, basePath: string): FileEntry[] {
	const entries: FileEntry[] = [];
	const lines = stdout.trim().split("\n");

	for (const line of lines) {
		if (line.startsWith("total ") || !line.trim()) continue;

		// Format: permissions links owner group size date time name
		// e.g.: drwxrwx--x 2 u0_a123 u0_a123 4096 2024-01-15 10:30 files
		const parts = line.trim().split(/\s+/);
		if (parts.length < 8) continue;

		const permissions = parts[0];
		const size = Number.parseInt(parts[4], 10) || 0;
		const dateStr = parts[5];
		const timeStr = parts[6];
		const name = parts.slice(7).join(" ");

		if (name === "." || name === "..") continue;

		entries.push({
			name,
			path: basePath === "." ? name : `${basePath}/${name}`,
			isDirectory: permissions.startsWith("d"),
			size,
			modified: `${dateStr}T${timeStr}`,
		});
	}

	return entries;
}

export async function androidPullFile(
	deviceId: string,
	packageName: string,
	remotePath: string,
): Promise<Buffer> {
	guardDeviceId(deviceId);
	const tmpDir = await mkdtemp(join(tmpdir(), "simvyn-pull-"));
	const localPath = join(tmpDir, "file");
	try {
		await execFileAsync("adb", [
			"-s",
			deviceId,
			"shell",
			"run-as",
			packageName,
			"cp",
			remotePath,
			STAGING_PATH,
		]);
		await execFileAsync("adb", ["-s", deviceId, "pull", STAGING_PATH, localPath]);
		await execFileAsync("adb", ["-s", deviceId, "shell", "rm", STAGING_PATH]);
		return readFile(localPath);
	} catch (err) {
		return handleRunAsError(err, packageName);
	} finally {
		await rm(tmpDir, { recursive: true, force: true }).catch(() => {});
	}
}

export async function androidPushFile(
	deviceId: string,
	packageName: string,
	localPath: string,
	remotePath: string,
): Promise<void> {
	guardDeviceId(deviceId);
	try {
		await execFileAsync("adb", ["-s", deviceId, "push", localPath, STAGING_PATH]);
		await execFileAsync("adb", [
			"-s",
			deviceId,
			"shell",
			"run-as",
			packageName,
			"cp",
			STAGING_PATH,
			remotePath,
		]);
		await execFileAsync("adb", ["-s", deviceId, "shell", "rm", STAGING_PATH]);
	} catch (err) {
		handleRunAsError(err, packageName);
	}
}
