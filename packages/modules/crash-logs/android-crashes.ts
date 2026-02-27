import { execFile } from "node:child_process";
import { createHash } from "node:crypto";
import { promisify } from "node:util";
import type { CrashLogEntry } from "@simvyn/types";

const execFileAsync = promisify(execFile);

interface LogcatGroup {
	tag: string;
	pid: string;
	timestamp: string;
	lines: string[];
}

function parseLogcatTimestamp(mmdd: string, hhmmss: string): string {
	const year = new Date().getFullYear();
	const [month, day] = mmdd.split("-");
	return `${year}-${month}-${day}T${hhmmss}`;
}

function hashId(input: string): string {
	return createHash("md5").update(input).digest("hex").slice(0, 12);
}

function parseLogcatOutput(output: string): LogcatGroup[] {
	const groups: LogcatGroup[] = [];
	let current: LogcatGroup | null = null;

	for (const line of output.split("\n")) {
		if (!line.trim()) continue;

		// Android logcat default format: MM-DD HH:MM:SS.mmm PID TID LEVEL TAG: message
		const match = line.match(
			/^(\d{2}-\d{2})\s+(\d{2}:\d{2}:\d{2}\.\d{3})\s+(\d+)\s+\d+\s+[EFDIWV]\s+(.+?):\s*(.*)/,
		);

		if (match) {
			const [, date, time, pid, tag, message] = match;

			if (current && (current.pid !== pid || current.tag !== tag)) {
				groups.push(current);
				current = null;
			}

			if (!current) {
				current = {
					tag: tag.trim(),
					pid,
					timestamp: parseLogcatTimestamp(date, time),
					lines: [],
				};
			}
			current.lines.push(message);
		} else if (current) {
			current.lines.push(line.trim());
		}
	}

	if (current) groups.push(current);
	return groups;
}

async function parseTombstones(deviceId: string): Promise<CrashLogEntry[]> {
	try {
		const { stdout } = await execFileAsync(
			"adb",
			["-s", deviceId, "shell", "dumpsys", "dropbox", "--print"],
			{ maxBuffer: 10 * 1024 * 1024 },
		);

		const entries: CrashLogEntry[] = [];
		const blocks = stdout.split(/^={10,}/m);

		for (const block of blocks) {
			if (!block.includes("SYSTEM_TOMBSTONE")) continue;

			const tsMatch = block.match(/(\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}:\d{2})/);
			const timestamp = tsMatch ? new Date(tsMatch[1]).toISOString() : new Date().toISOString();
			const preview = block.slice(0, 200).trim();
			const id = `tombstone-${hashId(block.slice(0, 100))}`;

			entries.push({
				id,
				process: "SYSTEM_TOMBSTONE",
				timestamp,
				preview,
			});
		}
		return entries;
	} catch {
		return [];
	}
}

export async function listAndroidCrashLogs(
	deviceId: string,
	opts?: { app?: string; since?: string },
): Promise<CrashLogEntry[]> {
	// Guard against avd: prefix device IDs (synthetic, can't run adb)
	if (deviceId.startsWith("avd:")) return [];

	let logcatEntries: CrashLogEntry[] = [];
	try {
		const { stdout } = await execFileAsync("adb", ["-s", deviceId, "logcat", "-d", "*:E"], {
			maxBuffer: 10 * 1024 * 1024,
		});

		const groups = parseLogcatOutput(stdout);
		logcatEntries = groups.map((g) => ({
			id: `logcat-${hashId(`${g.pid}:${g.tag}:${g.timestamp}`)}`,
			process: g.tag,
			timestamp: g.timestamp,
			preview: g.lines.join("\n").slice(0, 200),
		}));
	} catch {
		// adb may not be available or device disconnected
	}

	const tombstoneEntries = await parseTombstones(deviceId);

	let entries = [...logcatEntries, ...tombstoneEntries];

	// Deduplicate by id
	const seen = new Set<string>();
	entries = entries.filter((e) => {
		if (seen.has(e.id)) return false;
		seen.add(e.id);
		return true;
	});

	if (opts?.app) {
		const app = opts.app.toLowerCase();
		entries = entries.filter((e) => e.process.toLowerCase().includes(app));
	}

	if (opts?.since) {
		const sinceDate = new Date(opts.since).getTime();
		entries = entries.filter((e) => new Date(e.timestamp).getTime() >= sinceDate);
	}

	entries.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
	return entries;
}
