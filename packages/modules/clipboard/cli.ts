import type { Command } from "commander";

export function registerClipboardCli(program: Command) {
	const clipboard = program.command("clipboard").description("Device clipboard commands");

	clipboard
		.command("get <device>")
		.description("Read clipboard contents from device")
		.action(async (deviceId: string) => {
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
				if (!adapter?.getClipboard) {
					console.error(`Clipboard read not supported for ${target.platform}`);
					process.exit(1);
				}

				const text = await adapter.getClipboard(target.id);
				process.stdout.write(text);
			} finally {
				dm.stop();
			}
		});

	clipboard
		.command("set <device> <text>")
		.description("Write text to device clipboard")
		.action(async (deviceId: string, text: string) => {
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
				if (!adapter?.setClipboard) {
					console.error(`Clipboard write not supported for ${target.platform}`);
					process.exit(1);
				}

				await adapter.setClipboard(target.id, text);
				console.log(`Clipboard set on ${target.name}`);
			} finally {
				dm.stop();
			}
		});
}
