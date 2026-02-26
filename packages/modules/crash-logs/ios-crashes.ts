import { readdir, readFile, stat } from "node:fs/promises";
import { homedir } from "node:os";
import { basename, join } from "node:path";
import type { CrashLogEntry } from "@simvyn/types";

const DIAGNOSTIC_DIR = join(homedir(), "Library", "Logs", "DiagnosticReports");
const RETIRED_DIR = join(DIAGNOSTIC_DIR, "Retired");
const CRASH_EXTENSIONS = [".ips", ".crash"];

async function dirExists(path: string): Promise<boolean> {
	try {
		const s = await stat(path);
		return s.isDirectory();
	} catch {
		return false;
	}
}

async function scanDir(dir: string): Promise<string[]> {
	if (!(await dirExists(dir))) return [];
	const entries = await readdir(dir);
	return entries
		.filter((f) => CRASH_EXTENSIONS.some((ext) => f.endsWith(ext)) || f.includes(".ips."))
		.map((f) => join(dir, f));
}

function parseProcessFromFilename(filename: string): string {
	// Format: ProcessName-YYYY-MM-DD-HHMMSS.ips (or .crash)
	const base = basename(filename);
	const match = base.match(/^(.+?)-\d{4}-\d{2}-\d{2}/);
	return match ? match[1] : base.replace(/\.(ips|crash)(\.ca)?$/, "");
}

export async function listIosCrashLogs(opts?: {
	app?: string;
	since?: string;
}): Promise<CrashLogEntry[]> {
	const files = [...(await scanDir(DIAGNOSTIC_DIR)), ...(await scanDir(RETIRED_DIR))];
	const entries: CrashLogEntry[] = [];

	for (const filePath of files) {
		try {
			const fileStat = await stat(filePath);
			const timestamp = fileStat.mtime.toISOString();
			const process = parseProcessFromFilename(filePath);
			const id = basename(filePath).replace(/\.(ips|crash)(\.ca)?$/, "");

			const fd = await readFile(filePath, "utf-8");
			const preview = fd.slice(0, 500);

			entries.push({ id, process, timestamp, path: filePath, preview });
		} catch {
			// skip unreadable files
		}
	}

	let filtered = entries;

	if (opts?.app) {
		const app = opts.app.toLowerCase();
		filtered = filtered.filter((e) => e.process.toLowerCase().includes(app));
	}

	if (opts?.since) {
		const sinceDate = new Date(opts.since).getTime();
		filtered = filtered.filter((e) => new Date(e.timestamp).getTime() >= sinceDate);
	}

	filtered.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
	return filtered;
}

export async function readIosCrashLog(logId: string): Promise<string> {
	const dirs = [DIAGNOSTIC_DIR, RETIRED_DIR];
	for (const dir of dirs) {
		if (!(await dirExists(dir))) continue;
		const entries = await readdir(dir);
		const match = entries.find((f) => {
			const base = f.replace(/\.(ips|crash)(\.ca)?$/, "");
			return base === logId;
		});
		if (match) {
			return readFile(join(dir, match), "utf-8");
		}
	}
	throw new Error(`Crash log not found: ${logId}`);
}
