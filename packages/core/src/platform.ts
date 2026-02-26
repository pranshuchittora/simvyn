import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

export function isMacOS(): boolean {
	return process.platform === "darwin";
}

export function isLinux(): boolean {
	return process.platform === "linux";
}

export async function hasBinary(name: string): Promise<boolean> {
	try {
		await execFileAsync("which", [name]);
		return true;
	} catch {
		return false;
	}
}
