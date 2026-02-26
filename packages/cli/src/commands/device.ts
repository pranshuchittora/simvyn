import type { Command } from "commander";
import type { Device, Platform, PlatformAdapter } from "@simvyn/types";
import { createAvailableAdapters, createDeviceManager } from "@simvyn/core";

function padRight(str: string, len: number): string {
	return str.length >= len ? str : str + " ".repeat(len - str.length);
}

function printTable(devices: Device[]): void {
	if (devices.length === 0) {
		console.log("No devices found.");
		return;
	}

	const headers = ["ID", "NAME", "PLATFORM", "STATE", "OS VERSION"];
	const rows = devices.map((d) => [d.id, d.name, d.platform, d.state, d.osVersion]);

	// calculate column widths
	const widths = headers.map((h, i) =>
		Math.max(h.length, ...rows.map((r) => r[i].length)),
	);

	const headerLine = headers.map((h, i) => padRight(h, widths[i])).join("  ");
	console.log(headerLine);
	for (const row of rows) {
		console.log(row.map((val, i) => padRight(val, widths[i])).join("  "));
	}
}

async function getAllDevices(platform?: string): Promise<{ devices: Device[]; adapters: PlatformAdapter[] }> {
	const adapters = await createAvailableAdapters();
	const dm = createDeviceManager(adapters);
	const devices = await dm.refresh();

	const filtered = platform
		? devices.filter((d) => d.platform === platform)
		: devices;

	return { devices: filtered, adapters };
}

function findAdapter(adapters: PlatformAdapter[], platform: Platform): PlatformAdapter | undefined {
	return adapters.find((a) => a.platform === platform);
}

async function findDevice(id: string): Promise<{ device: Device; adapter: PlatformAdapter }> {
	const { devices, adapters } = await getAllDevices();
	const device = devices.find((d) => d.id === id);
	if (!device) {
		console.error(`Device not found: ${id}`);
		process.exit(1);
	}

	const adapter = findAdapter(adapters, device.platform);
	if (!adapter) {
		console.error(`No ${device.platform} support on this platform`);
		process.exit(1);
	}

	return { device, adapter };
}

export function registerDeviceCommand(program: Command): void {
	const device = program
		.command("device")
		.description("Device management commands");

	// simvyn device list
	device
		.command("list")
		.description("List available devices")
		.option("--platform <platform>", "Filter by platform (ios|android)")
		.option("--json", "Output as JSON")
		.action(async (opts) => {
			try {
				const { devices } = await getAllDevices(opts.platform);
				if (opts.json) {
					console.log(JSON.stringify(devices, null, 2));
				} else {
					printTable(devices);
				}
			} catch (err) {
				console.error("Failed to list devices:", (err as Error).message);
				process.exit(1);
			}
		});

	// simvyn device boot <id>
	device
		.command("boot <id>")
		.description("Boot a device")
		.action(async (id) => {
			try {
				const { device: dev, adapter } = await findDevice(id);
				console.log(`Booting ${dev.name}...`);
				await adapter.boot(id);

				// Poll until booted (max 60s)
				const deadline = Date.now() + 60_000;
				while (Date.now() < deadline) {
					const devices = await adapter.listDevices();
					const updated = devices.find((d) => d.id === id || d.name === dev.name);
					if (updated && updated.state === "booted") {
						console.log(`\u2713 ${dev.name} booted`);
						return;
					}
					await new Promise((r) => setTimeout(r, 2000));
				}
				console.error(`\u2717 Timed out waiting for ${dev.name} to boot`);
				process.exit(1);
			} catch (err) {
				console.error(`Failed to boot device: ${(err as Error).message}`);
				process.exit(1);
			}
		});

	// simvyn device shutdown <id>
	device
		.command("shutdown <id>")
		.description("Shutdown a device")
		.action(async (id) => {
			try {
				const { device: dev, adapter } = await findDevice(id);
				await adapter.shutdown(id);
				console.log(`\u2713 ${dev.name} shut down`);
			} catch (err) {
				console.error(`Failed to shutdown device: ${(err as Error).message}`);
				process.exit(1);
			}
		});

	// simvyn device erase <id>
	device
		.command("erase <id>")
		.description("Erase a device (iOS only, must be shutdown)")
		.action(async (id) => {
			try {
				const { device: dev, adapter } = await findDevice(id);

				if (dev.platform !== "ios") {
					console.error("Erase is only supported on iOS simulators");
					process.exit(1);
				}

				if (dev.state === "booted") {
					console.error(`${dev.name} is booted — shut it down first: simvyn device shutdown ${id}`);
					process.exit(1);
				}

				if (!adapter.erase) {
					console.error("Erase not available for this adapter");
					process.exit(1);
				}

				await adapter.erase(id);
				console.log(`\u2713 ${dev.name} erased`);
			} catch (err) {
				console.error(`Failed to erase device: ${(err as Error).message}`);
				process.exit(1);
			}
		});
}
