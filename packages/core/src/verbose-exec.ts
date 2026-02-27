import { type ChildProcess, execFile, type SpawnOptions, spawn } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

let verbose = false;

const GREEN = "\x1b[32m";
const BLUE = "\x1b[34m";
const RED = "\x1b[31m";
const DIM = "\x1b[2m";
const RESET = "\x1b[0m";

export function setVerbose(v: boolean): void {
	verbose = v;
}

function getPrefix(command: string): { color: string; label: string } | null {
	if (command === "adb" || command === "emulator") return { color: GREEN, label: "adb" };
	if (command === "xcrun") return { color: BLUE, label: "simctl" };
	return null;
}

function logCommand(command: string, args: string[]): void {
	if (!verbose) return;
	const prefix = getPrefix(command);
	const cmdStr = `${command} ${args.join(" ")}`;
	if (prefix) {
		process.stderr.write(`${prefix.color}[${prefix.label}]${RESET} ${DIM}${cmdStr}${RESET}\n`);
	} else {
		process.stderr.write(`${DIM}${cmdStr}${RESET}\n`);
	}
}

function logError(command: string, args: string[], error: unknown): void {
	if (!verbose) return;
	const cmdStr = `${command} ${args.join(" ")}`;
	const msg = error instanceof Error ? error.message : String(error);
	process.stderr.write(`${RED}[error]${RESET} ${DIM}${cmdStr}${RESET} — ${msg}\n`);
}

export async function verboseExec(
	command: string,
	args: string[],
	options?: Parameters<typeof execFileAsync>[2],
): Promise<{ stdout: string; stderr: string }> {
	logCommand(command, args);
	try {
		const result = await execFileAsync(command, args, options);
		return { stdout: result.stdout as string, stderr: result.stderr as string };
	} catch (err) {
		logError(command, args, err);
		throw err;
	}
}

export function verboseSpawn(command: string, args: string[], opts?: SpawnOptions): ChildProcess {
	logCommand(command, args);
	if (opts) return spawn(command, args, opts);
	return spawn(command, args);
}
