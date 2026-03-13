import type { Command } from "commander";

export function registerSettingsCli(program: Command) {
	const settings = program.command("settings").description("Device settings commands");

	settings
		.command("dark-mode <device> <state>")
		.description("Toggle dark/light mode (on/off)")
		.action(async (deviceId: string, state: string) => {
			if (state !== "on" && state !== "off") {
				console.error('State must be "on" or "off"');
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
				if (!adapter?.setAppearance) {
					console.error(`Appearance not supported for ${target.platform}`);
					process.exit(1);
				}

				const mode = state === "on" ? "dark" : "light";
				await adapter.setAppearance(target.id, mode);
				console.log(`Dark mode ${state === "on" ? "enabled" : "disabled"} on ${target.name}`);
			} finally {
				dm.stop();
			}
		});

	settings
		.command("status-bar <device>")
		.description("Override or clear iOS status bar")
		.option("--time <string>", "Override time display")
		.option("--battery-level <0-100>", "Override battery level")
		.option("--battery-state <state>", "Battery state: charged, charging, discharging")
		.option("--cellular-bars <0-4>", "Cellular signal bars")
		.option("--wifi-bars <0-3>", "WiFi signal bars")
		.option("--operator <name>", "Operator name")
		.option("--network <type>", "Data network: wifi, 3g, 4g, lte, lte-a, lte+, 5g, 5g+, 5g-uwb")
		.option("--clear", "Clear all status bar overrides")
		.action(
			async (
				deviceId: string,
				opts: {
					time?: string;
					batteryLevel?: string;
					batteryState?: string;
					cellularBars?: string;
					wifiBars?: string;
					operator?: string;
					network?: string;
					clear?: boolean;
				},
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

					if (opts.clear) {
						if (!adapter?.clearStatusBar) {
							console.error(`Status bar clear not supported for ${target.platform}`);
							process.exit(1);
						}
						await adapter.clearStatusBar(target.id);
						console.log(`Status bar cleared on ${target.name}`);
						return;
					}

					if (!adapter?.setStatusBar) {
						console.error(`Status bar override not supported for ${target.platform}`);
						process.exit(1);
					}

					const overrides: Record<string, string> = {};
					if (opts.time) overrides.time = opts.time;
					if (opts.batteryLevel) overrides.batteryLevel = opts.batteryLevel;
					if (opts.batteryState) overrides.batteryState = opts.batteryState;
					if (opts.cellularBars) overrides.cellularBars = opts.cellularBars;
					if (opts.wifiBars) overrides.wifiBars = opts.wifiBars;
					if (opts.operator) overrides.operatorName = opts.operator;
					if (opts.network) overrides.dataNetwork = opts.network;

					await adapter.setStatusBar(target.id, overrides);
					console.log(`Status bar updated on ${target.name}`);
				} finally {
					dm.stop();
				}
			},
		);

	settings
		.command("permission <device> <action> [permission] [bundleId]")
		.description("Manage app permissions (grant/revoke/reset)")
		.action(async (deviceId: string, action: string, permission?: string, bundleId?: string) => {
			if (!["grant", "revoke", "reset"].includes(action)) {
				console.error('Action must be "grant", "revoke", or "reset"');
				process.exit(1);
			}

			if (action === "reset" && !permission) {
				// For reset: permission arg is actually the bundleId
				console.error("Usage: simvyn settings permission <device> reset <bundleId>");
				process.exit(1);
			}

			if ((action === "grant" || action === "revoke") && (!permission || !bundleId)) {
				console.error(
					`Usage: simvyn settings permission <device> ${action} <permission> <bundleId>`,
				);
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

				if (action === "grant") {
					if (!adapter?.grantPermission) {
						console.error(`Grant permission not supported for ${target.platform}`);
						process.exit(1);
					}
					await adapter.grantPermission(target.id, bundleId!, permission!);
					console.log(`Granted ${permission} to ${bundleId} on ${target.name}`);
				} else if (action === "revoke") {
					if (!adapter?.revokePermission) {
						console.error(`Revoke permission not supported for ${target.platform}`);
						process.exit(1);
					}
					await adapter.revokePermission(target.id, bundleId!, permission!);
					console.log(`Revoked ${permission} from ${bundleId} on ${target.name}`);
				} else {
					// reset — permission arg holds the bundleId
					if (!adapter?.resetPermissions) {
						console.error(`Reset permissions not supported for ${target.platform}`);
						process.exit(1);
					}
					await adapter.resetPermissions(target.id, permission!);
					console.log(`Reset all permissions for ${permission} on ${target.name}`);
				}
			} finally {
				dm.stop();
			}
		});

	settings
		.command("locale <device> <locale>")
		.description("Change device locale (e.g. en_US, ja_JP)")
		.action(async (deviceId: string, locale: string) => {
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
				if (!adapter?.setLocale) {
					console.error(`Locale not supported for ${target.platform}`);
					process.exit(1);
				}

				await adapter.setLocale(target.id, locale);
				console.log(`Locale set to ${locale} on ${target.name} (reboot may be required)`);
			} finally {
				dm.stop();
			}
		});
	settings
		.command("orientation <device> <orientation>")
		.description(
			"Set device orientation (portrait, landscape-left, landscape-right, portrait-upside-down)",
		)
		.action(async (deviceId: string, orientation: string) => {
			const valid = ["portrait", "landscape-left", "landscape-right", "portrait-upside-down"];
			if (!valid.includes(orientation)) {
				console.error(`Invalid orientation: ${orientation}`);
				console.error(`Valid options: ${valid.join(", ")}`);
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
				if (!adapter?.setOrientation) {
					console.error(`Orientation not supported for ${target.platform}`);
					process.exit(1);
				}

				await adapter.setOrientation(target.id, orientation);
				console.log(`Orientation set to ${orientation} on ${target.name}`);
			} finally {
				dm.stop();
			}
		});
}

export function registerA11yCli(program: Command) {
	const a11y = program.command("a11y").description("Accessibility commands");

	a11y
		.command("content-size <device> <size>")
		.description("Set accessibility content size")
		.action(async (deviceId: string, size: string) => {
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
				if (!adapter?.setContentSize) {
					console.error(`Content size not supported for ${target.platform}`);
					process.exit(1);
				}

				await adapter.setContentSize(target.id, size);
				console.log(`Content size set to ${size} on ${target.name}`);
			} finally {
				dm.stop();
			}
		});

	a11y
		.command("increase-contrast <device> <state>")
		.description("Toggle increase contrast (on/off)")
		.action(async (deviceId: string, state: string) => {
			if (state !== "on" && state !== "off") {
				console.error('State must be "on" or "off"');
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
				if (!adapter?.setIncreaseContrast) {
					console.error(`Increase contrast not supported for ${target.platform}`);
					process.exit(1);
				}

				await adapter.setIncreaseContrast(target.id, state === "on");
				console.log(
					`Increase contrast ${state === "on" ? "enabled" : "disabled"} on ${target.name}`,
				);
			} finally {
				dm.stop();
			}
		});

	a11y
		.command("talkback <device> <state>")
		.description("Toggle TalkBack (on/off)")
		.action(async (deviceId: string, state: string) => {
			if (state !== "on" && state !== "off") {
				console.error('State must be "on" or "off"');
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
				if (!adapter?.setTalkBack) {
					console.error(`TalkBack not supported for ${target.platform}`);
					process.exit(1);
				}

				await adapter.setTalkBack(target.id, state === "on");
				console.log(`TalkBack ${state === "on" ? "enabled" : "disabled"} on ${target.name}`);
			} finally {
				dm.stop();
			}
		});
}
