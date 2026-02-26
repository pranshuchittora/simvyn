import { type ChildProcess, execFile, spawn } from "node:child_process";
import { mkdtemp, readdir, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";
import type {
	AppInfo,
	Device,
	DeviceState,
	PlatformAdapter,
	PlatformCapability,
} from "@simvyn/types";

const execFileAsync = promisify(execFile);

interface SimctlDevice {
	udid: string;
	name: string;
	state: string;
	isAvailable: boolean;
	deviceTypeIdentifier?: string;
}

function parseOsVersion(runtimeKey: string): string {
	// e.g. "com.apple.CoreSimulator.SimRuntime.iOS-26-2" -> "iOS 26.2"
	// or "com.apple.CoreSimulator.SimRuntime.iOS-17-5" -> "iOS 17.5"
	const match = runtimeKey.match(/SimRuntime\.(\w+)-(.+)$/);
	if (!match) return "Unknown";
	const platform = match[1]; // "iOS", "watchOS", "tvOS", "visionOS"
	const version = match[2].replace(/-/g, ".");
	return `${platform} ${version}`;
}

function mapState(state: string): DeviceState {
	switch (state) {
		case "Booted":
			return "booted";
		case "Shutdown":
			return "shutdown";
		case "Creating":
			return "creating";
		case "ShuttingDown":
			return "shutting-down";
		default:
			return "shutdown";
	}
}

function parseDeviceType(identifier?: string): string {
	if (!identifier) return "Unknown";
	// e.g. "com.apple.CoreSimulator.SimDeviceType.iPhone-16-Pro" -> "iPhone 16 Pro"
	const parts = identifier.split(".");
	const last = parts[parts.length - 1];
	return last.replace(/-/g, " ");
}

function plistToJson(plistStr: string): Promise<string> {
	return new Promise((resolve, reject) => {
		const proc = spawn("plutil", ["-convert", "json", "-r", "-o", "-", "--", "-"]);
		let out = "";
		let err = "";
		proc.stdout.on("data", (d: Buffer) => {
			out += d.toString();
		});
		proc.stderr.on("data", (d: Buffer) => {
			err += d.toString();
		});
		proc.on("close", (code) =>
			code === 0 ? resolve(out) : reject(new Error(`plutil exit ${code}: ${err}`)),
		);
		proc.stdin.write(plistStr);
		proc.stdin.end();
	});
}

export function createIosAdapter(): PlatformAdapter {
	return {
		platform: "ios",

		async isAvailable(): Promise<boolean> {
			try {
				await execFileAsync("xcrun", ["simctl", "list", "devices", "--json"]);
				return true;
			} catch {
				return false;
			}
		},

		async listDevices(): Promise<Device[]> {
			try {
				const { stdout } = await execFileAsync("xcrun", ["simctl", "list", "devices", "--json"]);
				const data = JSON.parse(stdout);
				const devices: Device[] = [];

				for (const [runtimeKey, runtimeDevices] of Object.entries(data.devices)) {
					const osVersion = parseOsVersion(runtimeKey);
					for (const sim of runtimeDevices as SimctlDevice[]) {
						if (!sim.isAvailable) continue;
						devices.push({
							id: sim.udid,
							name: sim.name,
							platform: "ios",
							state: mapState(sim.state),
							osVersion,
							deviceType: parseDeviceType(sim.deviceTypeIdentifier),
							isAvailable: true,
						});
					}
				}

				return devices;
			} catch (err) {
				console.warn("Failed to list iOS simulators:", (err as Error).message);
				return [];
			}
		},

		async boot(id: string): Promise<void> {
			try {
				await execFileAsync("xcrun", ["simctl", "boot", id]);
			} catch (err) {
				const msg = (err as Error).message ?? "";
				if (!msg.includes("already booted")) throw err;
			}
		},

		async shutdown(id: string): Promise<void> {
			try {
				await execFileAsync("xcrun", ["simctl", "shutdown", id]);
			} catch (err) {
				const msg = (err as Error).message ?? "";
				if (!msg.includes("current state: Shutdown")) throw err;
			}
		},

		async erase(id: string): Promise<void> {
			await execFileAsync("xcrun", ["simctl", "erase", id]);
		},

		async setLocation(deviceId: string, lat: number, lon: number): Promise<void> {
			await execFileAsync("xcrun", ["simctl", "location", deviceId, "set", `${lat},${lon}`]);
		},

		async clearLocation(deviceId: string): Promise<void> {
			await execFileAsync("xcrun", ["simctl", "location", deviceId, "clear"]);
		},

		async listApps(deviceId: string): Promise<AppInfo[]> {
			const { stdout: plist } = await execFileAsync("xcrun", ["simctl", "listapps", deviceId]);
			const json = await plistToJson(plist);
			const data = JSON.parse(json) as Record<
				string,
				{
					CFBundleIdentifier: string;
					CFBundleDisplayName?: string;
					CFBundleName?: string;
					CFBundleVersion?: string;
					CFBundleShortVersionString?: string;
					ApplicationType: string;
					DataContainer?: string;
					Path?: string;
				}
			>;
			return Object.values(data).map((info) => ({
				bundleId: info.CFBundleIdentifier,
				name: info.CFBundleDisplayName ?? info.CFBundleName ?? info.CFBundleIdentifier,
				version: info.CFBundleShortVersionString ?? info.CFBundleVersion ?? "unknown",
				type: info.ApplicationType.toLowerCase() as "user" | "system",
				dataContainer: info.DataContainer?.replace("file://", "") ?? undefined,
				appPath: info.Path ?? undefined,
			}));
		},

		async installApp(deviceId: string, appPath: string): Promise<void> {
			let installPath = appPath;
			let tmpDir: string | undefined;

			if (appPath.endsWith(".ipa")) {
				tmpDir = await mkdtemp(join(tmpdir(), "simvyn-ipa-"));
				await execFileAsync("unzip", ["-q", appPath, "-d", tmpDir]);
				const entries = await readdir(join(tmpDir, "Payload"));
				const appBundle = entries.find((e) => e.endsWith(".app"));
				if (!appBundle) throw new Error("No .app found in IPA");
				installPath = join(tmpDir, "Payload", appBundle);
			}

			try {
				await execFileAsync("xcrun", ["simctl", "install", deviceId, installPath]);
			} finally {
				if (tmpDir) await rm(tmpDir, { recursive: true, force: true });
			}
		},

		async uninstallApp(deviceId: string, bundleId: string): Promise<void> {
			await execFileAsync("xcrun", ["simctl", "uninstall", deviceId, bundleId]);
		},

		async launchApp(deviceId: string, bundleId: string): Promise<void> {
			await execFileAsync("xcrun", ["simctl", "launch", deviceId, bundleId]);
		},

		async terminateApp(deviceId: string, bundleId: string): Promise<void> {
			await execFileAsync("xcrun", ["simctl", "terminate", deviceId, bundleId]);
		},

		async getAppInfo(deviceId: string, bundleId: string): Promise<AppInfo | null> {
			try {
				const { stdout: plist } = await execFileAsync("xcrun", [
					"simctl",
					"appinfo",
					deviceId,
					bundleId,
				]);
				const json = await plistToJson(plist);
				const info = JSON.parse(json) as {
					CFBundleIdentifier: string;
					CFBundleDisplayName?: string;
					CFBundleName?: string;
					CFBundleVersion?: string;
					CFBundleShortVersionString?: string;
					ApplicationType: string;
					DataContainer?: string;
					Path?: string;
				};
				return {
					bundleId: info.CFBundleIdentifier,
					name: info.CFBundleDisplayName ?? info.CFBundleName ?? info.CFBundleIdentifier,
					version: info.CFBundleShortVersionString ?? info.CFBundleVersion ?? "unknown",
					type: info.ApplicationType.toLowerCase() as "user" | "system",
					dataContainer: info.DataContainer?.replace("file://", "") ?? undefined,
					appPath: info.Path ?? undefined,
				};
			} catch {
				return null;
			}
		},

		clearAppData: undefined,

		async openUrl(deviceId: string, url: string): Promise<void> {
			await execFileAsync("xcrun", ["simctl", "openurl", deviceId, url]);
		},

		async screenshot(deviceId: string, outputPath: string): Promise<void> {
			await execFileAsync("xcrun", ["simctl", "io", deviceId, "screenshot", outputPath]);
		},

		startRecording(deviceId: string, outputPath: string) {
			const child = spawn("xcrun", ["simctl", "io", deviceId, "recordVideo", outputPath]);
			return Promise.resolve(child);
		},

		async stopRecording(child: ChildProcess) {
			child.kill("SIGINT");
			await new Promise<void>((resolve, reject) => {
				child.on("close", () => resolve());
				child.on("error", reject);
			});
		},

		capabilities(): PlatformCapability[] {
			return [
				"setLocation",
				"push",
				"screenshot",
				"screenRecord",
				"erase",
				"statusBar",
				"privacy",
				"ui",
				"clipboard",
				"addMedia",
				"logs",
				"deepLinks",
				"appManagement",
			];
		},
	};
}
