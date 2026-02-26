import type { ChildProcess } from "node:child_process";
import { createInterface } from "node:readline";
import type { LogEntry, LogLevel } from "@simvyn/types";

interface SpawnCapable {
	spawn(command: string, args: string[], opts?: object): ChildProcess;
}

export interface LogStreamerOptions {
	deviceId: string;
	platform: "ios" | "android";
	processManager: SpawnCapable;
	onFlush: (entries: LogEntry[]) => void;
	flushIntervalMs?: number;
	maxBufferSize?: number;
}

export interface LogStreamer {
	start(): void;
	stop(): void;
	clearHistory(): void;
	readonly deviceId: string;
	readonly isRunning: boolean;
	readonly history: readonly LogEntry[];
}

export function parseIosLogLine(line: string): LogEntry | null {
	try {
		const obj = JSON.parse(line);
		if (obj.eventType !== "logEvent") return null;
		return {
			timestamp: obj.timestamp ?? new Date().toISOString(),
			level: mapIosLevel(obj.messageType),
			message: obj.eventMessage ?? "",
			processName: extractBasename(obj.processImagePath ?? ""),
			pid: obj.processID ?? 0,
			subsystem: obj.subsystem || undefined,
			category: obj.category || undefined,
		};
	} catch {
		return null;
	}
}

// threadtime format: "MM-DD HH:MM:SS.mmm  PID  TID PRIORITY TAG: MESSAGE"
const THREADTIME_RE =
	/^(\d{2}-\d{2}\s+\d{2}:\d{2}:\d{2}\.\d{3})\s+(\d+)\s+\d+\s+([VDIWEFA])\s+(.+?)\s*:\s(.*)$/;

export function parseAndroidLogLine(line: string): LogEntry | null {
	// try JSON first (newer logcat)
	if (line.startsWith("{")) {
		try {
			const obj = JSON.parse(line);
			return {
				timestamp:
					obj.sec != null
						? new Date(obj.sec * 1000 + (obj.nsec ?? 0) / 1e6).toISOString()
						: new Date().toISOString(),
				level: mapAndroidPriority(obj.priority),
				message: obj.message ?? "",
				processName: obj.tag ?? "",
				pid: obj.pid ?? 0,
			};
		} catch {
			/* fall through to threadtime */
		}
	}

	const m = THREADTIME_RE.exec(line);
	if (!m) return null;

	const [, ts, pid, pri, tag, msg] = m;
	const year = new Date().getFullYear();
	return {
		timestamp: new Date(`${year}-${ts}`).toISOString(),
		level: mapAndroidPriorityChar(pri),
		message: msg,
		processName: tag,
		pid: Number(pid),
	};
}

export function mapIosLevel(messageType: string): LogLevel {
	switch (messageType) {
		case "Debug":
			return "debug";
		case "Info":
			return "info";
		case "Default":
			return "info";
		case "Error":
			return "error";
		case "Fault":
			return "fatal";
		default:
			return "verbose";
	}
}

export function mapAndroidPriority(priority: number): LogLevel {
	switch (priority) {
		case 2:
			return "verbose";
		case 3:
			return "debug";
		case 4:
			return "info";
		case 5:
			return "warning";
		case 6:
			return "error";
		case 7:
			return "fatal";
		default:
			return "info";
	}
}

function mapAndroidPriorityChar(ch: string): LogLevel {
	switch (ch) {
		case "V":
			return "verbose";
		case "D":
			return "debug";
		case "I":
			return "info";
		case "W":
			return "warning";
		case "E":
			return "error";
		case "F":
		case "A":
			return "fatal";
		default:
			return "info";
	}
}

function extractBasename(path: string): string {
	const idx = path.lastIndexOf("/");
	return idx >= 0 ? path.slice(idx + 1) : path;
}

export function createLogStreamer(opts: LogStreamerOptions): LogStreamer {
	const {
		deviceId,
		platform,
		processManager,
		onFlush,
		flushIntervalMs = 150,
		maxBufferSize = 10_000,
	} = opts;

	let child: ChildProcess | null = null;
	let timer: ReturnType<typeof setInterval> | null = null;
	let running = false;
	const pending: LogEntry[] = [];
	const historyBuffer: LogEntry[] = [];

	function flush() {
		if (pending.length > 0) {
			onFlush([...pending]);
			pending.length = 0;
		}
	}

	function pushEntry(entry: LogEntry) {
		pending.push(entry);
		historyBuffer.push(entry);
		if (historyBuffer.length > maxBufferSize) {
			historyBuffer.splice(0, historyBuffer.length - maxBufferSize);
		}
	}

	return {
		get deviceId() {
			return deviceId;
		},
		get isRunning() {
			return running;
		},
		get history() {
			return historyBuffer;
		},

		clearHistory() {
			historyBuffer.length = 0;
		},

		start() {
			if (running) return;

			if (platform === "android" && deviceId.startsWith("avd:")) {
				throw new Error("Device must be booted");
			}

			running = true;

			if (platform === "ios") {
				child = processManager.spawn("xcrun", [
					"simctl",
					"spawn",
					deviceId,
					"log",
					"stream",
					"--style",
					"ndjson",
					"--level",
					"debug",
				]);
			} else {
				child = processManager.spawn("adb", ["-s", deviceId, "logcat", "-v", "threadtime"]);
			}

			const rl = createInterface({ input: child.stdout! });

			rl.on("line", (line) => {
				const entry = platform === "ios" ? parseIosLogLine(line) : parseAndroidLogLine(line);
				if (entry) pushEntry(entry);
			});

			rl.on("close", () => {
				running = false;
			});

			child.on("error", () => {
				running = false;
			});

			timer = setInterval(flush, flushIntervalMs);
		},

		stop() {
			if (timer) {
				clearInterval(timer);
				timer = null;
			}
			flush();
			if (child) {
				try {
					child.kill("SIGTERM");
				} catch {
					/* already dead */
				}
				child = null;
			}
			running = false;
		},
	};
}
