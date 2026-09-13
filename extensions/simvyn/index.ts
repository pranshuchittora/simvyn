import { mkdir, stat, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { StringEnum } from "@earendil-works/pi-ai";
import {
	createReadToolDefinition,
	DEFAULT_MAX_BYTES,
	DEFAULT_MAX_LINES,
	type ExtensionAPI,
	type ExtensionContext,
	formatSize,
	truncateTail,
} from "@earendil-works/pi-coding-agent";
import { Type } from "typebox";
import {
	type Dashboard,
	dashboardIsHealthy,
	readTail,
	rejectionReason,
	type RunResult,
	runSimvyn,
	startDashboard,
	stopProcess,
} from "./cli.js";

const logLevels = ["verbose", "debug", "info", "warning", "error", "fatal"] as const;
const artifactDir = join(tmpdir(), "pi-simvyn");
const deviceParameter = Type.String({
	description: "Full device ID from simvyn device list --json",
});

interface SharedDashboard extends Dashboard {
	refreshStatus?: () => void;
}

// Pi rebuilds extensions on /new, /resume, /fork, and /reload; the dashboard outlives those.
const shared = globalThis as typeof globalThis & { simvynPiDashboard?: SharedDashboard };

function runningDashboard() {
	const dashboard = shared.simvynPiDashboard;
	if (dashboard?.child.exitCode === null && dashboard.child.signalCode === null) return dashboard;
	return undefined;
}

function artifactPath(kind: string, device: string, extension: string) {
	const safeId = device.replace(/[^a-zA-Z0-9-]/g, "_");
	return join(artifactDir, `${kind}-${safeId}-${Date.now()}.${extension}`);
}

async function prepareOutput(cwd: string, requested: string | undefined, fallback: string) {
	const path = requested ? resolve(cwd, requested.replace(/^@/, "")) : fallback;
	await mkdir(dirname(path), { recursive: true });
	return path;
}

function failure(args: string[], result: RunResult) {
	let status = `exited with ${result.code ?? result.signal}`;
	if (result.timedOut) status = "timed out";
	else if (!result.started) status = "did not start";
	else if (result.code === 0 && !result.stopped) status = "ended before the requested duration";
	const output = truncateTail(result.output.trim(), { maxLines: 40, maxBytes: 8192 }).content;
	return new Error(`simvyn ${args.join(" ")} ${status}${output ? `\n${output}` : ""}`);
}

export default function simvyn(pi: ExtensionAPI) {
	let ui: ExtensionContext["ui"] | undefined;
	const refreshStatus = () => {
		const dashboard = runningDashboard();
		ui?.setStatus("simvyn", dashboard ? `simvyn ${dashboard.url}` : undefined);
	};

	pi.on("session_start", (_event, ctx) => {
		ui = ctx.ui;
		if (shared.simvynPiDashboard) shared.simvynPiDashboard.refreshStatus = refreshStatus;
		refreshStatus();
	});

	pi.on("session_shutdown", async (event) => {
		ui = undefined;
		const dashboard = runningDashboard();
		if (event.reason === "quit" && dashboard) await stopProcess(dashboard.child);
	});

	pi.registerTool({
		name: "simvyn",
		label: "simvyn",
		description: `Run a simvyn CLI command on iOS Simulators, Android Emulators, or connected devices. Pass the arguments after "simvyn" as an array without shell quoting, for example ["device", "list", "--json"] or ["app", "launch", "<device-id>", "com.example.app"]. Output is truncated to the last ${DEFAULT_MAX_LINES} lines or ${DEFAULT_MAX_BYTES / 1024}KB, and truncated output is saved to a temp file. The dashboard server, log streaming, screen recording, and upgrade commands are rejected.`,
		promptSnippet: "Run simvyn CLI commands against simulators, emulators, and devices",
		promptGuidelines: [
			'Use simvyn with ["device", "list", "--json"] first, then pass full device IDs to simvyn, simvyn_screenshot, simvyn_logs, and simvyn_record.',
			'Use simvyn with ["<command>", "--help"] or read the simvyn skill references when simvyn arguments or platform support are unclear.',
		],
		parameters: Type.Object({
			args: Type.Array(Type.String(), { minItems: 1, description: "Arguments after simvyn" }),
			timeoutSeconds: Type.Optional(
				Type.Integer({
					minimum: 1,
					maximum: 900,
					description: "Stop the command after this many seconds (default 120)",
				}),
			),
		}),
		async execute(_toolCallId, params, signal, _onUpdate, ctx) {
			const rejection = rejectionReason(params.args);
			if (rejection) throw new Error(rejection);

			const result = await runSimvyn(params.args, {
				cwd: ctx.cwd,
				signal,
				timeoutMs: (params.timeoutSeconds ?? 120) * 1000,
			});
			if (result.aborted) throw new Error("Operation aborted");
			if (result.timedOut || result.code !== 0) throw failure(params.args, result);

			const truncation = truncateTail(result.output, {
				maxLines: DEFAULT_MAX_LINES,
				maxBytes: DEFAULT_MAX_BYTES,
			});
			let text = truncation.content || "(no output)";
			if (truncation.truncated) {
				const fullOutput = join(artifactDir, `output-${Date.now()}.log`);
				await mkdir(artifactDir, { recursive: true });
				await writeFile(fullOutput, result.output);
				text += `\n\n[Showing the last ${truncation.outputLines} of ${truncation.totalLines} lines. Full output: ${fullOutput}]`;
			}
			if (result.overflowed) text += "\n\n[Output beyond 16MB was discarded.]";
			return { content: [{ type: "text", text }], details: { args: params.args } };
		},
	});

	pi.registerTool({
		name: "simvyn_screenshot",
		label: "simvyn screenshot",
		description:
			"Capture a screenshot of a booted iOS Simulator or Android device and return the image. Saves a PNG to a temp file unless path is given. Physical iPhones are not supported.",
		promptSnippet: "Capture and view a simulator, emulator, or device screen",
		promptGuidelines: [
			"Use simvyn_screenshot to look at a device screen instead of running simvyn screenshot and reading the file.",
		],
		parameters: Type.Object({
			device: deviceParameter,
			path: Type.Optional(
				Type.String({ description: "PNG output path relative to the working directory" }),
			),
		}),
		async execute(toolCallId, params, signal, _onUpdate, ctx) {
			const path = await prepareOutput(
				ctx.cwd,
				params.path,
				artifactPath("screenshot", params.device, "png"),
			);
			const args = ["screenshot", params.device, "--output", path];
			const result = await runSimvyn(args, { cwd: ctx.cwd, signal, timeoutMs: 60_000 });
			if (result.aborted) throw new Error("Operation aborted");
			if (result.timedOut || result.code !== 0) throw failure(args, result);

			// Pi's read tool resizes the image for the model and reports the scale factor.
			const image = await createReadToolDefinition(ctx.cwd).execute(
				toolCallId,
				{ path },
				signal,
				undefined,
				ctx,
			);
			const notes = image.content.flatMap((part) =>
				part.type === "text"
					? part.text.split("\n").filter((line) => !line.startsWith("Read image file"))
					: [],
			);
			return {
				content: [
					{
						type: "text",
						text: [`Screenshot of ${params.device} saved to ${path}`, ...notes].join("\n"),
					},
					...image.content.filter((part) => part.type === "image"),
				],
				details: { device: params.device, path },
			};
		},
	});

	pi.registerTool({
		name: "simvyn_logs",
		label: "simvyn logs",
		description: `Stream logs from a booted iOS Simulator or Android device for a fixed number of seconds, then stop. Entries are JSON lines. Returns the last ${DEFAULT_MAX_LINES} lines or ${DEFAULT_MAX_BYTES / 1024}KB and saves the full capture to a file. Android can include buffered entries from before the capture started. Physical iPhones are not supported.`,
		promptSnippet: "Capture device logs for a bounded number of seconds",
		promptGuidelines: [
			"Use simvyn_logs for device logs instead of streaming simvyn logs through bash, and narrow noisy captures with its level and filter.",
		],
		parameters: Type.Object({
			device: deviceParameter,
			seconds: Type.Optional(
				Type.Integer({ minimum: 1, maximum: 120, description: "Capture length (default 10)" }),
			),
			level: Type.Optional(
				StringEnum(logLevels, { description: "Minimum log level (default info)" }),
			),
			filter: Type.Optional(
				Type.String({ description: "Regex matched against the message or process name" }),
			),
		}),
		async execute(_toolCallId, params, signal, onUpdate, ctx) {
			const seconds = params.seconds ?? 10;
			const level = params.level ?? "info";
			const path = await prepareOutput(
				ctx.cwd,
				undefined,
				artifactPath("logs", params.device, "jsonl"),
			);
			const args = ["logs", params.device, "--json", "--level", level];
			if (params.filter) args.push("--filter", params.filter);

			onUpdate?.({
				content: [{ type: "text", text: `Capturing ${seconds}s of logs from ${params.device}` }],
				details: undefined,
			});
			const result = await runSimvyn(args, {
				cwd: ctx.cwd,
				signal,
				stdoutFile: path,
				window: {
					ms: seconds * 1000,
					startMarker: /^Streaming /m,
					startTimeoutMs: 60_000,
					graceMs: 5000,
				},
			});
			if (result.aborted) throw new Error("Operation aborted");
			// The CLI exits 0 when the underlying log stream fails, so an early end with no lines is an error.
			if (!result.started || (result.stdoutLines === 0 && (result.code !== 0 || !result.stopped))) {
				throw failure(args, result);
			}

			const scope = [`level >= ${level}`, params.filter && `filter /${params.filter}/`]
				.filter(Boolean)
				.join(", ");
			let text = `Captured ${result.stdoutLines} log lines from ${params.device} over ${seconds}s (${scope}). Full capture: ${path}`;
			if (!result.stopped) text += "\nThe log stream ended before the requested duration.";
			if (result.stdoutLines === 0) {
				text += "\nNo log lines matched during the capture.";
			} else {
				const tail = (await readTail(path, DEFAULT_MAX_BYTES * 2)).trimEnd();
				const truncation = truncateTail(tail, {
					maxLines: DEFAULT_MAX_LINES,
					maxBytes: DEFAULT_MAX_BYTES,
				});
				text += `\n\n${truncation.content}`;
				if (truncation.outputLines < result.stdoutLines) {
					text += `\n\n[Showing the last ${truncation.outputLines} of ${result.stdoutLines} lines]`;
				}
			}
			return {
				content: [{ type: "text", text }],
				details: { device: params.device, path, lines: result.stdoutLines },
			};
		},
	});

	pi.registerTool({
		name: "simvyn_record",
		label: "simvyn record",
		description:
			"Record the screen of a booted iOS Simulator or Android device for a fixed number of seconds and save an MP4. Returns the file path; the video is not shown to the model. Physical iPhones are not supported.",
		promptSnippet: "Record a simulator, emulator, or device screen for a bounded number of seconds",
		parameters: Type.Object({
			device: deviceParameter,
			seconds: Type.Optional(
				Type.Integer({ minimum: 1, maximum: 180, description: "Recording length (default 10)" }),
			),
			path: Type.Optional(
				Type.String({
					description: "New MP4 output path relative to the working directory",
				}),
			),
		}),
		async execute(_toolCallId, params, signal, onUpdate, ctx) {
			const seconds = params.seconds ?? 10;
			const path = await prepareOutput(
				ctx.cwd,
				params.path,
				artifactPath("recording", params.device, "mp4"),
			);
			const args = ["record", params.device, "--output", path];

			onUpdate?.({
				content: [{ type: "text", text: `Recording ${seconds}s from ${params.device}` }],
				details: undefined,
			});
			const startedAt = Date.now();
			const result = await runSimvyn(args, {
				cwd: ctx.cwd,
				signal,
				window: {
					ms: seconds * 1000,
					startMarker: /press Ctrl\+C to stop/,
					startTimeoutMs: 60_000,
					graceMs: 60_000,
				},
			});
			if (result.aborted) throw new Error("Operation aborted");
			if (!result.started) throw failure(args, result);
			// simctl refuses to overwrite an existing file, but the CLI still exits 0.
			const video = await stat(path).catch(() => undefined);
			if (!video?.size || video.mtimeMs < startedAt) {
				const output = result.output.trim();
				throw new Error(
					`simvyn record did not write a new video to ${path}. Use a path that does not exist yet.${output ? `\n${output}` : ""}`,
				);
			}

			return {
				content: [
					{
						type: "text",
						text: `Recorded ${seconds}s from ${params.device} to ${path} (${formatSize(video.size)})`,
					},
				],
				details: { device: params.device, path, bytes: video.size },
			};
		},
	});

	pi.registerCommand("simvyn", {
		description: "Manage the simvyn dashboard: start [port], stop, or status",
		getArgumentCompletions: (prefix) => {
			const actions = ["start", "stop", "status"].filter((action) => action.startsWith(prefix));
			return actions.length > 0
				? actions.map((action) => ({ value: action, label: action }))
				: null;
		},
		handler: async (args, ctx) => {
			const [action = "start", port = "3847"] = args.trim().split(/\s+/).filter(Boolean);
			const dashboard = runningDashboard();

			if (action === "status") {
				ctx.ui.notify(
					dashboard
						? `simvyn dashboard running at ${dashboard.url}`
						: "simvyn dashboard is not running from Pi",
					"info",
				);
				return;
			}
			if (action === "stop") {
				if (!dashboard) {
					ctx.ui.notify("simvyn dashboard is not running from Pi", "warning");
					return;
				}
				await stopProcess(dashboard.child);
				ctx.ui.notify("simvyn dashboard stopped", "info");
				return;
			}
			if (action !== "start" || !/^\d+$/.test(port)) {
				ctx.ui.notify("Usage: /simvyn [start [port] | stop | status]", "warning");
				return;
			}
			if (dashboard) {
				ctx.ui.notify(`simvyn dashboard running at ${dashboard.url}`, "info");
				return;
			}

			const url = `http://127.0.0.1:${port}`;
			if (await dashboardIsHealthy(url)) {
				ctx.ui.notify(`simvyn is already running at ${url}`, "info");
				return;
			}
			ctx.ui.notify(`Starting simvyn dashboard on port ${port}`, "info");
			try {
				const started: SharedDashboard = {
					...(await startDashboard(ctx.cwd, port)),
					refreshStatus,
				};
				shared.simvynPiDashboard = started;
				started.child.once("exit", () => shared.simvynPiDashboard?.refreshStatus?.());
				refreshStatus();
				ctx.ui.notify(`simvyn dashboard running at ${started.url}`, "info");
			} catch (error) {
				ctx.ui.notify(error instanceof Error ? error.message : String(error), "error");
			}
		},
	});
}
