import type { Command } from "commander";

export function registerCrashLogsCli(program: Command) {
	program
		.command("crashes <device>")
		.description("List or view crash logs for a device")
		.option("--app <bundle-id>", "Filter by app/process name")
		.option("--since <date>", "Filter by date (ISO format)")
		.option("--view <log-id>", "View a specific crash log")
		.action(async (deviceId: string, opts: { app?: string; since?: string; view?: string }) => {
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

				if (opts.view) {
					if (target.platform === "ios") {
						const { readIosCrashLog } = await import("./ios-crashes.js");
						const content = await readIosCrashLog(opts.view);
						console.log(content);
					} else {
						const { listAndroidCrashLogs } = await import("./android-crashes.js");
						const logs = await listAndroidCrashLogs(target.id);
						const entry = logs.find((l) => l.id === opts.view);
						if (!entry) {
							console.error(`Crash log not found: ${opts.view}`);
							process.exit(1);
						}
						console.log(entry.preview);
					}
					return;
				}

				let logs;
				if (target.platform === "ios") {
					const { listIosCrashLogs } = await import("./ios-crashes.js");
					logs = await listIosCrashLogs({ app: opts.app, since: opts.since });
				} else {
					const { listAndroidCrashLogs } = await import("./android-crashes.js");
					logs = await listAndroidCrashLogs(target.id, {
						app: opts.app,
						since: opts.since,
					});
				}

				if (logs.length === 0) {
					console.log("No crash logs found");
					return;
				}

				// Print table header
				console.log(`${"Timestamp".padEnd(26)} ${"Process".padEnd(30)} Preview`);
				console.log("-".repeat(80));

				for (const log of logs) {
					const ts = log.timestamp.slice(0, 19).replace("T", " ");
					const proc = log.process.slice(0, 28).padEnd(30);
					const preview = log.preview.split("\n")[0].slice(0, 60);
					console.log(`${ts.padEnd(26)} ${proc} ${preview}`);
				}

				console.log(`\n${logs.length} crash log(s) found`);
			} finally {
				dm.stop();
			}
		});
}
