import { type ChildProcess, spawn } from "node:child_process";
import { createWriteStream } from "node:fs";
import { open } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { stripVTControlCharacters } from "node:util";

const launcherPath = fileURLToPath(
	new URL("../../skills/simvyn/scripts/simvyn.mjs", import.meta.url),
);
const nodeExecutable = process.versions.bun ? "node" : process.execPath;
const maxCapturedBytes = 16 * 1024 * 1024;

const blockedCommands = new Map([
	["start", "The dashboard server runs until stopped. Ask the user to run /simvyn instead."],
	["logs", "Log streaming runs until stopped. Use the simvyn_logs tool instead."],
	["record", "Screen recording runs until stopped. Use the simvyn_record tool instead."],
	["upgrade", "Upgrading replaces the installed simvyn package. Ask the user to update it."],
]);

export interface CaptureWindow {
	ms: number;
	startMarker: RegExp;
	startTimeoutMs: number;
	graceMs: number;
}

export interface RunOptions {
	cwd: string;
	signal?: AbortSignal;
	timeoutMs?: number;
	window?: CaptureWindow;
	stdoutFile?: string;
}

export interface RunResult {
	code: number | null;
	signal: NodeJS.Signals | null;
	output: string;
	overflowed: boolean;
	stdoutLines: number;
	started: boolean;
	stopped: boolean;
	timedOut: boolean;
	aborted: boolean;
}

export interface Dashboard {
	child: ChildProcess;
	url: string;
}

export function rejectionReason(args: string[]) {
	const command = args.find((arg) => !arg.startsWith("-"));
	if (command) return blockedCommands.get(command);
	if (args.some((arg) => ["-h", "--help", "-V", "--version"].includes(arg))) return undefined;
	return "Provide a simvyn subcommand such as device, app, or screenshot. Without one, simvyn starts its dashboard server.";
}

function spawnProcess(command: string, args: string[], cwd: string) {
	return spawn(command, args, {
		cwd,
		env: { ...process.env, NO_COLOR: "1" },
		stdio: ["ignore", "pipe", "pipe"],
	});
}

export function stopProcess(child: ChildProcess, graceMs = 5000): Promise<void> {
	if (child.exitCode !== null || child.signalCode !== null) return Promise.resolve();
	return new Promise((resolve) => {
		const terminate = setTimeout(() => child.kill("SIGTERM"), graceMs);
		const kill = setTimeout(() => child.kill("SIGKILL"), graceMs + 5000);
		child.once("exit", () => {
			clearTimeout(terminate);
			clearTimeout(kill);
			resolve();
		});
		child.kill("SIGINT");
	});
}

export function runProcess(command: string, args: string[], options: RunOptions) {
	const result: RunResult = {
		code: null,
		signal: null,
		output: "",
		overflowed: false,
		stdoutLines: 0,
		started: !options.window,
		stopped: false,
		timedOut: false,
		aborted: false,
	};
	if (options.signal?.aborted) return Promise.resolve({ ...result, aborted: true });

	return new Promise<RunResult>((resolve, reject) => {
		const child = spawnProcess(command, args, options.cwd);
		const file = options.stdoutFile ? createWriteStream(options.stdoutFile) : undefined;
		const { window } = options;
		const chunks: Buffer[] = [];
		const timers: NodeJS.Timeout[] = [];
		let capturedBytes = 0;
		let announcement = "";
		let settled = false;
		let writeError: Error | undefined;

		const stop = (graceMs: number) => {
			if (result.stopped) return;
			result.stopped = true;
			stopProcess(child, graceMs);
		};
		const capture = (chunk: Buffer) => {
			if (capturedBytes + chunk.length > maxCapturedBytes) {
				result.overflowed = true;
				return;
			}
			chunks.push(chunk);
			capturedBytes += chunk.length;
		};
		const onAbort = () => {
			result.aborted = true;
			stop(5000);
		};
		const finish = (error?: Error) => {
			if (settled) return;
			settled = true;
			for (const timer of timers) clearTimeout(timer);
			options.signal?.removeEventListener("abort", onAbort);
			// Keep only the final redraw of carriage-return progress lines.
			result.output = stripVTControlCharacters(Buffer.concat(chunks).toString("utf8"))
				.replaceAll("\r\n", "\n")
				.replace(/^.*\r/gm, "");
			if (!file) {
				if (error) reject(error);
				else resolve(result);
				return;
			}
			file.end(() => {
				const failure = error ?? writeError;
				if (failure) reject(failure);
				else resolve(result);
			});
		};

		file?.on("error", (error) => {
			writeError = error;
			stop(5000);
		});
		child.stdout.on("data", (chunk: Buffer) => {
			if (!file) {
				capture(chunk);
				return;
			}
			file.write(chunk);
			for (let index = chunk.indexOf(10); index !== -1; index = chunk.indexOf(10, index + 1)) {
				result.stdoutLines++;
			}
		});
		child.stderr.on("data", (chunk: Buffer) => {
			capture(chunk);
			if (result.started || !window) return;
			announcement = (announcement + chunk.toString("utf8")).slice(-4096);
			if (!window.startMarker.test(announcement)) return;
			result.started = true;
			timers.push(setTimeout(() => stop(window.graceMs), window.ms));
		});

		if (window) {
			timers.push(
				setTimeout(() => {
					if (!result.started) stop(window.graceMs);
				}, window.startTimeoutMs),
			);
		}
		if (options.timeoutMs) {
			timers.push(
				setTimeout(() => {
					result.timedOut = true;
					stop(5000);
				}, options.timeoutMs),
			);
		}
		options.signal?.addEventListener("abort", onAbort, { once: true });

		child.on("error", finish);
		child.once("exit", (code, signal) => {
			result.code = code;
			result.signal = signal;
			// A force-killed launcher can leave its detached CLI holding these pipes open.
			timers.push(
				setTimeout(() => {
					child.stdout.destroy();
					child.stderr.destroy();
				}, 2000),
			);
		});
		child.once("close", () => finish());
	});
}

export function runSimvyn(args: string[], options: RunOptions) {
	return runProcess(nodeExecutable, [launcherPath, ...args], options);
}

export function startDashboard(cwd: string, port: string) {
	return new Promise<Dashboard>((resolve, reject) => {
		const child = spawnProcess(nodeExecutable, [launcherPath, "start", "--port", port], cwd);
		let output = "";
		let pending = true;

		const fail = (message: string) => {
			if (!pending) return;
			pending = false;
			clearTimeout(timeout);
			reject(new Error(`${message}\n${output.trim()}`.trim()));
		};
		const timeout = setTimeout(() => {
			fail("simvyn dashboard did not start within 60 seconds");
			stopProcess(child);
		}, 60_000);
		// Listeners stay attached so the server's output keeps draining after startup.
		const onData = (chunk: Buffer) => {
			if (!pending) return;
			output = (output + stripVTControlCharacters(chunk.toString("utf8"))).slice(-8192);
			const url = /running at (http:\/\/\S+)/.exec(output)?.[1];
			if (!url) return;
			pending = false;
			clearTimeout(timeout);
			resolve({ child, url });
		};

		child.stdout.on("data", onData);
		child.stderr.on("data", onData);
		child.on("error", (error) => fail(error.message));
		child.once("exit", (code, signal) => fail(`simvyn dashboard exited with ${code ?? signal}`));
	});
}

export async function dashboardIsHealthy(url: string) {
	try {
		const response = await fetch(`${url}/api/health`, { signal: AbortSignal.timeout(1000) });
		return response.ok && ((await response.json()) as { status?: string }).status === "ok";
	} catch {
		return false;
	}
}

export async function readTail(path: string, maxBytes: number) {
	const handle = await open(path, "r");
	try {
		const { size } = await handle.stat();
		const length = Math.min(size, maxBytes);
		const { buffer } = await handle.read(Buffer.alloc(length), 0, length, size - length);
		const text = buffer.toString("utf8");
		return length < size ? text.slice(text.indexOf("\n") + 1) : text;
	} finally {
		await handle.close();
	}
}
