import { mkdir } from "node:fs/promises";
import { join } from "node:path";
import type { SimvynModule } from "@simvyn/types";
import { screenshotRoutes } from "./routes.js";
import { registerScreenshotWsHandler } from "./ws-handler.js";

const screenshotModule: SimvynModule = {
	name: "screenshot",
	version: "0.1.0",
	description: "Screenshot capture and screen recording with history tracking",
	icon: "camera",

	async register(fastify, _opts) {
		await fastify.register(screenshotRoutes);
		registerScreenshotWsHandler(fastify);
	},

	cli(program) {
		program
			.command("screenshot <device>")
			.description("Capture a screenshot from a device")
			.option("-o, --output <path>", "Output file path")
			.action(async (deviceId: string, opts: { output?: string }) => {
				const { createAvailableAdapters, createDeviceManager } = await import("@simvyn/core");
				const adapters = await createAvailableAdapters();
				const dm = createDeviceManager(adapters);

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

					const adapter = dm.getAdapter(target.platform);
					if (!adapter?.screenshot) {
						console.error(`Screenshot not supported for ${target.platform}`);
						process.exit(1);
					}

					const timestamp = Date.now();
					const safeName = target.id.replace(/[^a-zA-Z0-9-]/g, "_");
					const filename = `screenshot-${safeName}-${timestamp}.png`;
					const outputPath = opts.output ?? join(process.cwd(), filename);

					await adapter.screenshot(target.id, outputPath);
					console.log(outputPath);
				} finally {
					dm.stop();
				}
			});

		program
			.command("record <device>")
			.description("Record the device screen")
			.option("-o, --output <path>", "Output file path")
			.action(async (deviceId: string, opts: { output?: string }) => {
				const { createAvailableAdapters, createDeviceManager, getSimvynDir } =
					await import("@simvyn/core");
				const adapters = await createAvailableAdapters();
				const dm = createDeviceManager(adapters);

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

					const adapter = dm.getAdapter(target.platform);
					if (!adapter?.startRecording || !adapter.stopRecording) {
						console.error(`Recording not supported for ${target.platform}`);
						process.exit(1);
					}

					const timestamp = Date.now();
					const safeName = target.id.replace(/[^a-zA-Z0-9-]/g, "_");
					const defaultName = `recording-${safeName}-${timestamp}.mp4`;
					const outputPath = opts.output ?? join(process.cwd(), defaultName);

					const outputDir = join(getSimvynDir(), "screenshot", "recordings");
					await mkdir(outputDir, { recursive: true });

					const child = await adapter.startRecording(target.id, outputPath);
					console.error(`Recording ${target.name}... press Ctrl+C to stop`);

					await new Promise<void>((resolve) => {
						process.on("SIGINT", async () => {
							try {
								await adapter.stopRecording!(child, target.id, outputPath);
							} catch {
								child.kill("SIGINT");
							}
							console.log(outputPath);
							resolve();
						});
					});
				} finally {
					dm.stop();
				}
			});
	},

	capabilities: ["screenshot", "screenRecord"],
};

export default screenshotModule;
