import { execFile } from "node:child_process";
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
		await execFileAsync("adb", ["-s", deviceId, "shell", "run-as", packageName, "pwd"]);
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
	try {
		// Use exec-out + run-as cat to pipe file content directly (avoids SELinux cp block)
		const { stdout } = await execFileAsync(
			"adb",
			["-s", deviceId, "exec-out", "run-as", packageName, "cat", remotePath],
			{ encoding: "buffer" as BufferEncoding, maxBuffer: 100 * 1024 * 1024 },
		);
		return Buffer.from(stdout);
	} catch (err) {
		return handleRunAsError(err, packageName);
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
		// Push to world-readable staging area first
		await execFileAsync("adb", ["-s", deviceId, "push", localPath, STAGING_PATH]);
		// Use sh -c with cat redirect inside run-as to avoid SELinux cp block
		await execFileAsync("adb", [
			"-s",
			deviceId,
			"shell",
			"run-as",
			packageName,
			"sh",
			"-c",
			`cat ${STAGING_PATH} > ${remotePath}`,
		]);
		await execFileAsync("adb", ["-s", deviceId, "shell", "rm", STAGING_PATH]);
	} catch (err) {
		handleRunAsError(err, packageName);
	}
}
