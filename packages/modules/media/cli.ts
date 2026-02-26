import { stat } from "node:fs/promises";
import { basename, resolve } from "node:path";
import type { Command } from "commander";

export function registerMediaCli(program: Command) {
	const media = program.command("media").description("Media injection commands");

	media
		.command("add <device> <file>")
		.description("Add a photo or video to device camera roll/gallery")
		.action(async (deviceId: string, file: string) => {
			const absolutePath = resolve(file);

			try {
				await stat(absolutePath);
			} catch {
				console.error(`File not found: ${absolutePath}`);
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

				const adapter = dm.getAdapter(target.platform);
				if (!adapter?.addMedia) {
					console.error(`Media injection not supported for ${target.platform}`);
					process.exit(1);
				}

				await adapter.addMedia(target.id, absolutePath);
				console.log(`Added ${basename(absolutePath)} to ${target.name}`);
			} finally {
				dm.stop();
			}
		});
}
