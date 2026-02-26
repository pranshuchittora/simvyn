import type { SimvynModule } from "@simvyn/types";
import { pushRoutes } from "./routes.js";

const pushModule: SimvynModule = {
	name: "push",
	version: "0.1.0",
	description: "Send push notifications to iOS simulators",
	icon: "bell",

	async register(fastify, _opts) {
		await fastify.register(pushRoutes);
	},

	cli(program) {
		program
			.command("push <device>")
			.description("Send a push notification to an iOS simulator")
			.requiredOption("-b, --bundle <bundle-id>", "Target app bundle identifier")
			.option("-p, --payload <json>", "JSON payload string")
			.option("-f, --file <path>", "Path to JSON payload file")
			.action(
				async (deviceId: string, opts: { bundle: string; payload?: string; file?: string }) => {
					if (!opts.payload && !opts.file) {
						console.error("Either --payload or --file is required");
						process.exit(1);
					}

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
						if (target.platform !== "ios") {
							console.error("Push notifications are only supported on iOS simulators");
							process.exit(1);
						}

						let payload: Record<string, unknown>;
						if (opts.file) {
							const { readFile } = await import("node:fs/promises");
							const content = await readFile(opts.file, "utf-8");
							payload = JSON.parse(content);
						} else {
							payload = JSON.parse(opts.payload!);
						}

						const { execFile } = await import("node:child_process");
						const { promisify } = await import("node:util");
						const { mkdtemp, writeFile, rm } = await import("node:fs/promises");
						const { tmpdir } = await import("node:os");
						const { join } = await import("node:path");

						const execFileAsync = promisify(execFile);
						const tmpDir = await mkdtemp(join(tmpdir(), "simvyn-push-"));
						const tmpFile = join(tmpDir, "payload.json");

						try {
							await writeFile(tmpFile, JSON.stringify(payload), "utf-8");
							await execFileAsync("xcrun", ["simctl", "push", target.id, opts.bundle, tmpFile]);
							console.log(`Sent push to ${target.name} (${opts.bundle})`);
						} finally {
							await rm(tmpDir, { recursive: true, force: true }).catch(() => {});
						}
					} finally {
						dm.stop();
					}
				},
			);
	},

	capabilities: ["push"],
};

export default pushModule;
