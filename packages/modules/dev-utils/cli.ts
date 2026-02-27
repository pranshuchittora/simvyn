import { homedir } from "node:os";
import { join } from "node:path";
import type { Command } from "commander";

export function registerDevUtilsCli(program: Command) {
	// --- Port Forwarding ---

	const forward = program.command("forward").description("Port forwarding (local → device)");

	forward
		.command("add <device> <local> <remote>")
		.description("Add port forward (e.g. tcp:8080 tcp:3000)")
		.action(async (deviceId: string, local: string, remote: string) => {
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
				if (!adapter?.addForward) {
					console.error(`Port forwarding not supported for ${target.platform}`);
					process.exit(1);
				}
				await adapter.addForward(target.id, local, remote);
				console.log(`Forward added: ${local} → ${remote} on ${target.name}`);
			} finally {
				dm.stop();
			}
		});

	forward
		.command("remove <device> <local>")
		.description("Remove port forward")
		.action(async (deviceId: string, local: string) => {
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
				if (!adapter?.removeForward) {
					console.error(`Port forwarding not supported for ${target.platform}`);
					process.exit(1);
				}
				await adapter.removeForward(target.id, local);
				console.log(`Forward removed: ${local} on ${target.name}`);
			} finally {
				dm.stop();
			}
		});

	forward
		.command("list <device>")
		.description("List active port forwards")
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
				if (!adapter?.listForwards) {
					console.error(`Port forwarding not supported for ${target.platform}`);
					process.exit(1);
				}
				const forwards = await adapter.listForwards(target.id);
				if (forwards.length === 0) {
					console.log("No active forwards");
				} else {
					console.log("LOCAL\t\tREMOTE");
					for (const f of forwards) console.log(`${f.local}\t\t${f.remote}`);
				}
			} finally {
				dm.stop();
			}
		});

	// --- Reverse Port Forwarding ---

	const reverse = program
		.command("reverse")
		.description("Reverse port forwarding (device → local)");

	reverse
		.command("add <device> <remote> <local>")
		.description("Add reverse forward (e.g. tcp:3000 tcp:8080)")
		.action(async (deviceId: string, remote: string, local: string) => {
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
				if (!adapter?.addReverse) {
					console.error(`Reverse forwarding not supported for ${target.platform}`);
					process.exit(1);
				}
				await adapter.addReverse(target.id, remote, local);
				console.log(`Reverse added: ${remote} → ${local} on ${target.name}`);
			} finally {
				dm.stop();
			}
		});

	reverse
		.command("remove <device> <remote>")
		.description("Remove reverse forward")
		.action(async (deviceId: string, remote: string) => {
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
				if (!adapter?.removeReverse) {
					console.error(`Reverse forwarding not supported for ${target.platform}`);
					process.exit(1);
				}
				await adapter.removeReverse(target.id, remote);
				console.log(`Reverse removed: ${remote} on ${target.name}`);
			} finally {
				dm.stop();
			}
		});

	reverse
		.command("list <device>")
		.description("List active reverse forwards")
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
				if (!adapter?.listReverses) {
					console.error(`Reverse forwarding not supported for ${target.platform}`);
					process.exit(1);
				}
				const reverses = await adapter.listReverses(target.id);
				if (reverses.length === 0) {
					console.log("No active reverses");
				} else {
					console.log("LOCAL\t\tREMOTE");
					for (const r of reverses) console.log(`${r.local}\t\t${r.remote}`);
				}
			} finally {
				dm.stop();
			}
		});

	// --- Display Overrides ---

	const display = program.command("display").description("Display size and density overrides");

	display
		.command("size <device> [resolution]")
		.description("Set display size (e.g. 1080x1920) or --reset")
		.option("--reset", "Reset to default size")
		.action(async (deviceId: string, resolution: string | undefined, opts: { reset?: boolean }) => {
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

				if (opts.reset) {
					if (!adapter?.resetDisplaySize) {
						console.error(`Display override not supported for ${target.platform}`);
						process.exit(1);
					}
					await adapter.resetDisplaySize(target.id);
					console.log(`Display size reset on ${target.name}`);
				} else {
					if (!resolution) {
						console.error("Provide resolution (e.g. 1080x1920) or --reset");
						process.exit(1);
					}
					const [w, h] = resolution.split("x").map(Number);
					if (!w || !h) {
						console.error("Invalid resolution format. Use WxH (e.g. 1080x1920)");
						process.exit(1);
					}
					if (!adapter?.setDisplaySize) {
						console.error(`Display override not supported for ${target.platform}`);
						process.exit(1);
					}
					await adapter.setDisplaySize(target.id, w, h);
					console.log(`Display size set to ${w}x${h} on ${target.name}`);
				}
			} finally {
				dm.stop();
			}
		});

	display
		.command("density <device> [dpi]")
		.description("Set display density (e.g. 320) or --reset")
		.option("--reset", "Reset to default density")
		.action(async (deviceId: string, dpi: string | undefined, opts: { reset?: boolean }) => {
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

				if (opts.reset) {
					if (!adapter?.resetDisplayDensity) {
						console.error(`Display override not supported for ${target.platform}`);
						process.exit(1);
					}
					await adapter.resetDisplayDensity(target.id);
					console.log(`Display density reset on ${target.name}`);
				} else {
					if (!dpi) {
						console.error("Provide DPI value or --reset");
						process.exit(1);
					}
					const dpiVal = Number(dpi);
					if (!Number.isInteger(dpiVal) || dpiVal <= 0) {
						console.error("DPI must be a positive integer");
						process.exit(1);
					}
					if (!adapter?.setDisplayDensity) {
						console.error(`Display override not supported for ${target.platform}`);
						process.exit(1);
					}
					await adapter.setDisplayDensity(target.id, dpiVal);
					console.log(`Display density set to ${dpiVal} on ${target.name}`);
				}
			} finally {
				dm.stop();
			}
		});

	// --- Battery Simulation ---

	const battery = program.command("battery").description("Battery simulation commands");

	battery
		.command("set <device>")
		.description("Set battery properties")
		.option("--level <0-100>", "Battery level")
		.option(
			"--status <1-5>",
			"Battery status (1=unknown, 2=charging, 3=discharging, 4=not_charging, 5=full)",
		)
		.option("--ac", "Enable AC power")
		.option("--no-ac", "Disable AC power")
		.option("--usb", "Enable USB power")
		.option("--no-usb", "Disable USB power")
		.action(
			async (
				deviceId: string,
				opts: { level?: string; status?: string; ac?: boolean; usb?: boolean },
			) => {
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
					if (!adapter?.setBattery) {
						console.error(`Battery simulation not supported for ${target.platform}`);
						process.exit(1);
					}

					const options: { level?: number; status?: number; ac?: boolean; usb?: boolean } = {};
					if (opts.level !== undefined) options.level = Number(opts.level);
					if (opts.status !== undefined) options.status = Number(opts.status);
					if (opts.ac !== undefined) options.ac = opts.ac;
					if (opts.usb !== undefined) options.usb = opts.usb;

					await adapter.setBattery(target.id, options);
					console.log(`Battery updated on ${target.name}`);
				} finally {
					dm.stop();
				}
			},
		);

	battery
		.command("unplug <device>")
		.description("Simulate battery unplug")
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
				if (!adapter?.unplugBattery) {
					console.error(`Battery simulation not supported for ${target.platform}`);
					process.exit(1);
				}
				await adapter.unplugBattery(target.id);
				console.log(`Battery unplugged on ${target.name}`);
			} finally {
				dm.stop();
			}
		});

	battery
		.command("reset <device>")
		.description("Reset battery to real values")
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
				if (!adapter?.resetBattery) {
					console.error(`Battery simulation not supported for ${target.platform}`);
					process.exit(1);
				}
				await adapter.resetBattery(target.id);
				console.log(`Battery reset on ${target.name}`);
			} finally {
				dm.stop();
			}
		});

	// --- Input Injection ---

	const input = program.command("input").description("Input injection commands");

	input
		.command("tap <device> <x> <y>")
		.description("Tap at coordinates")
		.action(async (deviceId: string, x: string, y: string) => {
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
				if (!adapter?.inputTap) {
					console.error(`Input injection not supported for ${target.platform}`);
					process.exit(1);
				}
				await adapter.inputTap(target.id, Number(x), Number(y));
				console.log(`Tapped (${x}, ${y}) on ${target.name}`);
			} finally {
				dm.stop();
			}
		});

	input
		.command("swipe <device> <x1> <y1> <x2> <y2> [durationMs]")
		.description("Swipe between coordinates")
		.action(
			async (
				deviceId: string,
				x1: string,
				y1: string,
				x2: string,
				y2: string,
				durationMs?: string,
			) => {
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
					if (!adapter?.inputSwipe) {
						console.error(`Input injection not supported for ${target.platform}`);
						process.exit(1);
					}
					await adapter.inputSwipe(
						target.id,
						Number(x1),
						Number(y1),
						Number(x2),
						Number(y2),
						durationMs ? Number(durationMs) : undefined,
					);
					console.log(`Swiped (${x1},${y1}) → (${x2},${y2}) on ${target.name}`);
				} finally {
					dm.stop();
				}
			},
		);

	input
		.command("text <device> <text>")
		.description("Input text on device")
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
				if (!adapter?.inputText) {
					console.error(`Input injection not supported for ${target.platform}`);
					process.exit(1);
				}
				await adapter.inputText(target.id, text);
				console.log(`Text input sent to ${target.name}`);
			} finally {
				dm.stop();
			}
		});

	input
		.command("keyevent <device> <keyCode>")
		.description("Send key event (code or name)")
		.action(async (deviceId: string, keyCode: string) => {
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
				if (!adapter?.inputKeyEvent) {
					console.error(`Input injection not supported for ${target.platform}`);
					process.exit(1);
				}
				const code = /^\d+$/.test(keyCode) ? Number(keyCode) : keyCode;
				await adapter.inputKeyEvent(target.id, code);
				console.log(`Key event ${keyCode} sent to ${target.name}`);
			} finally {
				dm.stop();
			}
		});

	// --- Bug Reports ---

	program
		.command("bugreport <device>")
		.description("Collect bug report from device")
		.option("--output <path>", "Output directory", join(homedir(), ".simvyn", "bug-reports"))
		.action(async (deviceId: string, opts: { output: string }) => {
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
				if (!adapter?.collectBugReport) {
					console.error(`Bug reports not supported for ${target.platform}`);
					process.exit(1);
				}
				console.log(`Collecting bug report from ${target.name}... (this may take a few minutes)`);
				const result = await adapter.collectBugReport(target.id, opts.output);
				console.log(
					`Bug report saved: ${result.path} (${(result.size / 1024 / 1024).toFixed(1)} MB)`,
				);
			} finally {
				dm.stop();
			}
		});
}
