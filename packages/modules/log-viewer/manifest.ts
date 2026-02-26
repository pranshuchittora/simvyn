import type { LogLevel, SimvynModule } from "@simvyn/types";
import { logRoutes } from "./routes.js";
import { registerLogWsHandler } from "./ws-handler.js";

const LOG_LEVELS: LogLevel[] = ["verbose", "debug", "info", "warning", "error", "fatal"];

const logViewerModule: SimvynModule = {
	name: "logs",
	version: "0.1.0",
	description: "Real-time device log streaming with filtering and export",
	icon: "scroll-text",

	async register(fastify, _opts) {
		await fastify.register(logRoutes);
		registerLogWsHandler(fastify);
	},

	cli(program) {
		program
			.command("logs <device>")
			.description("Stream device logs in real-time")
			.option(
				"--level <level>",
				"Minimum log level (verbose, debug, info, warning, error, fatal)",
				"info",
			)
			.option("--filter <pattern>", "Filter by text/regex pattern")
			.option("--json", "Output as JSON lines")
			.action(
				async (deviceId: string, opts: { level: string; filter?: string; json?: boolean }) => {
					const { createAvailableAdapters, createDeviceManager, createProcessManager } =
						await import("@simvyn/core");
					const adapters = await createAvailableAdapters();
					const dm = createDeviceManager(adapters);
					const pm = createProcessManager();

					try {
						const devices = await dm.refresh();
						const target = devices.find((d) => d.id === deviceId || d.id.startsWith(deviceId));
						if (!target) {
							console.error(`Device not found: ${deviceId}`);
							process.exit(1);
						}
						if (target.state !== "booted") {
							console.error("Device must be booted");
							process.exit(1);
						}

						const minLevelIndex = LOG_LEVELS.indexOf(opts.level as LogLevel);
						if (minLevelIndex === -1) {
							console.error(`Invalid level: ${opts.level}. Choose from: ${LOG_LEVELS.join(", ")}`);
							process.exit(1);
						}

						let filterRe: RegExp | null = null;
						if (opts.filter) {
							try {
								filterRe = new RegExp(opts.filter);
							} catch {
								console.error(`Invalid regex pattern: ${opts.filter}`);
								process.exit(1);
							}
						}

						const { createInterface } = await import("node:readline");
						const { parseIosLogLine, parseAndroidLogLine } = await import("./log-streamer.js");

						const child =
							target.platform === "ios"
								? pm.spawn("xcrun", [
										"simctl",
										"spawn",
										target.id,
										"log",
										"stream",
										"--style",
										"ndjson",
										"--level",
										"debug",
									])
								: pm.spawn("adb", ["-s", target.id, "logcat", "-v", "threadtime"]);

						const rl = createInterface({ input: child.stdout! });

						const noColor = !!process.env.NO_COLOR;
						const levelColors: Record<string, string> = {
							verbose: "\x1b[90m",
							debug: "\x1b[36m",
							info: "\x1b[37m",
							warning: "\x1b[33m",
							error: "\x1b[31m",
							fatal: "\x1b[35m",
						};
						const reset = "\x1b[0m";

						console.error(
							`Streaming ${target.platform} logs from ${target.name} (level >= ${opts.level})...`,
						);

						rl.on("line", (line) => {
							const entry =
								target.platform === "ios" ? parseIosLogLine(line) : parseAndroidLogLine(line);
							if (!entry) return;

							if (LOG_LEVELS.indexOf(entry.level) < minLevelIndex) return;
							if (filterRe && !filterRe.test(entry.message) && !filterRe.test(entry.processName))
								return;

							if (opts.json) {
								console.log(JSON.stringify(entry));
							} else {
								const color = noColor ? "" : (levelColors[entry.level] ?? "");
								const end = noColor ? "" : reset;
								const lvl = entry.level.toUpperCase().padEnd(7);
								console.log(
									`${color}${entry.timestamp} [${lvl}] ${entry.processName}: ${entry.message}${end}`,
								);
							}
						});

						process.on("SIGINT", () => {
							child.kill("SIGTERM");
							dm.stop();
							pm.cleanup();
							process.exit(0);
						});

						await new Promise<void>((resolve) => {
							rl.on("close", resolve);
						});
					} finally {
						dm.stop();
						pm.cleanup();
					}
				},
			);
	},

	capabilities: ["logs"],
};

export default logViewerModule;
