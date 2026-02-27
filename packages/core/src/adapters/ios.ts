import type { ChildProcess } from "node:child_process";
import { mkdir, mkdtemp, readdir, rm, stat, writeFile } from "node:fs/promises";
import { homedir, tmpdir } from "node:os";
import { join } from "node:path";
import type {
	AppInfo,
	BugReportResult,
	Device,
	DeviceState,
	DeviceType,
	PlatformAdapter,
	PlatformCapability,
	SimRuntime,
} from "@simvyn/types";
import { verboseExec, verboseSpawn } from "../verbose-exec.js";

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
		const proc = verboseSpawn("plutil", ["-convert", "json", "-r", "-o", "-", "--", "-"]);
		let out = "";
		let err = "";
		proc.stdout!.on("data", (d: Buffer) => {
			out += d.toString();
		});
		proc.stderr!.on("data", (d: Buffer) => {
			err += d.toString();
		});
		proc.on("close", (code: number | null) =>
			code === 0 ? resolve(out) : reject(new Error(`plutil exit ${code}: ${err}`)),
		);
		proc.stdin!.write(plistStr);
		proc.stdin!.end();
	});
}

export function createIosAdapter(): PlatformAdapter {
	return {
		platform: "ios",

		async isAvailable(): Promise<boolean> {
			try {
				await verboseExec("xcrun", ["simctl", "list", "devices", "--json"]);
				return true;
			} catch {
				return false;
			}
		},

		async listDevices(): Promise<Device[]> {
			try {
				const { stdout } = await verboseExec("xcrun", ["simctl", "list", "devices", "--json"]);
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
				await verboseExec("xcrun", ["simctl", "boot", id]);
			} catch (err) {
				const msg = (err as Error).message ?? "";
				if (!msg.includes("already booted")) throw err;
			}
		},

		async shutdown(id: string): Promise<void> {
			try {
				await verboseExec("xcrun", ["simctl", "shutdown", id]);
			} catch (err) {
				const msg = (err as Error).message ?? "";
				if (!msg.includes("current state: Shutdown")) throw err;
			}
		},

		async erase(id: string): Promise<void> {
			await verboseExec("xcrun", ["simctl", "erase", id]);
		},

		async setLocation(deviceId: string, lat: number, lon: number): Promise<void> {
			await verboseExec("xcrun", ["simctl", "location", deviceId, "set", `${lat},${lon}`]);
		},

		async clearLocation(deviceId: string): Promise<void> {
			await verboseExec("xcrun", ["simctl", "location", deviceId, "clear"]);
		},

		async listApps(deviceId: string): Promise<AppInfo[]> {
			const { stdout: plist } = await verboseExec("xcrun", ["simctl", "listapps", deviceId]);
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
				await verboseExec("unzip", ["-q", appPath, "-d", tmpDir]);
				const entries = await readdir(join(tmpDir, "Payload"));
				const appBundle = entries.find((e) => e.endsWith(".app"));
				if (!appBundle) throw new Error("No .app found in IPA");
				installPath = join(tmpDir, "Payload", appBundle);
			}

			try {
				await verboseExec("xcrun", ["simctl", "install", deviceId, installPath]);
			} finally {
				if (tmpDir) await rm(tmpDir, { recursive: true, force: true });
			}
		},

		async uninstallApp(deviceId: string, bundleId: string): Promise<void> {
			await verboseExec("xcrun", ["simctl", "uninstall", deviceId, bundleId]);
		},

		async launchApp(deviceId: string, bundleId: string): Promise<void> {
			await verboseExec("xcrun", ["simctl", "launch", deviceId, bundleId]);
		},

		async terminateApp(deviceId: string, bundleId: string): Promise<void> {
			await verboseExec("xcrun", ["simctl", "terminate", deviceId, bundleId]);
		},

		async getAppInfo(deviceId: string, bundleId: string): Promise<AppInfo | null> {
			try {
				const { stdout: plist } = await verboseExec("xcrun", [
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
			await verboseExec("xcrun", ["simctl", "openurl", deviceId, url]);
		},

		async screenshot(deviceId: string, outputPath: string): Promise<void> {
			await verboseExec("xcrun", ["simctl", "io", deviceId, "screenshot", outputPath]);
		},

		startRecording(deviceId: string, outputPath: string) {
			const child = verboseSpawn("xcrun", ["simctl", "io", deviceId, "recordVideo", outputPath]);
			return Promise.resolve(child);
		},

		async stopRecording(child: ChildProcess) {
			child.kill("SIGINT");
			await new Promise<void>((resolve, reject) => {
				child.on("close", () => resolve());
				child.on("error", reject);
			});
		},

		async getClipboard(deviceId: string): Promise<string> {
			const { stdout } = await verboseExec("xcrun", ["simctl", "pbpaste", deviceId]);
			return stdout;
		},

		async setClipboard(deviceId: string, text: string): Promise<void> {
			await new Promise<void>((resolve, reject) => {
				const proc = verboseSpawn("xcrun", ["simctl", "pbcopy", deviceId]);
				proc.on("close", (code: number | null) =>
					code === 0 ? resolve() : reject(new Error(`pbcopy exit ${code}`)),
				);
				proc.on("error", reject);
				proc.stdin!.write(text);
				proc.stdin!.end();
			});
		},

		async addMedia(deviceId: string, filePath: string): Promise<void> {
			await verboseExec("xcrun", ["simctl", "addmedia", deviceId, filePath]);
		},

		async setAppearance(deviceId: string, mode: "light" | "dark"): Promise<void> {
			await verboseExec("xcrun", ["simctl", "ui", deviceId, "appearance", mode]);
		},

		async setStatusBar(deviceId: string, overrides: Record<string, string>): Promise<void> {
			const flagMap: Record<string, string> = {
				time: "--time",
				batteryLevel: "--batteryLevel",
				batteryState: "--batteryState",
				cellularBars: "--cellularBars",
				wifiBars: "--wifiBars",
				operatorName: "--operatorName",
				dataNetwork: "--dataNetwork",
			};
			const args = ["simctl", "status_bar", deviceId, "override"];
			for (const [key, value] of Object.entries(overrides)) {
				const flag = flagMap[key];
				if (flag) args.push(flag, value);
			}
			await verboseExec("xcrun", args);
		},

		async clearStatusBar(deviceId: string): Promise<void> {
			await verboseExec("xcrun", ["simctl", "status_bar", deviceId, "clear"]);
		},

		async grantPermission(deviceId: string, bundleId: string, permission: string): Promise<void> {
			await verboseExec("xcrun", ["simctl", "privacy", deviceId, "grant", permission, bundleId]);
		},

		async revokePermission(deviceId: string, bundleId: string, permission: string): Promise<void> {
			await verboseExec("xcrun", ["simctl", "privacy", deviceId, "revoke", permission, bundleId]);
		},

		async resetPermissions(deviceId: string, bundleId: string): Promise<void> {
			await verboseExec("xcrun", ["simctl", "privacy", deviceId, "reset", "all", bundleId]);
		},

		async setLocale(deviceId: string, locale: string): Promise<void> {
			await verboseExec("xcrun", [
				"simctl",
				"spawn",
				deviceId,
				"defaults",
				"write",
				"Apple Global Domain",
				"AppleLocale",
				"-string",
				locale,
			]);
			const langCode = locale.split("_")[0];
			await verboseExec("xcrun", [
				"simctl",
				"spawn",
				deviceId,
				"defaults",
				"write",
				"Apple Global Domain",
				"AppleLanguages",
				"-array",
				langCode,
			]);
			console.log("Note: locale change requires a device reboot to take effect");
		},

		async setContentSize(deviceId: string, size: string): Promise<void> {
			await verboseExec("xcrun", ["simctl", "ui", deviceId, "content_size", size]);
		},

		async setIncreaseContrast(deviceId: string, enabled: boolean): Promise<void> {
			await verboseExec("xcrun", [
				"simctl",
				"ui",
				deviceId,
				"increase_contrast",
				enabled ? "enabled" : "disabled",
			]);
		},

		setTalkBack: undefined,

		async listDeviceTypes(): Promise<DeviceType[]> {
			const { stdout } = await verboseExec("xcrun", ["simctl", "list", "devicetypes", "--json"]);
			const data = JSON.parse(stdout);
			return (data.devicetypes as { identifier: string; name: string }[])
				.filter((dt) => dt.name)
				.map((dt) => ({ identifier: dt.identifier, name: dt.name }));
		},

		async listRuntimes(): Promise<SimRuntime[]> {
			const { stdout } = await verboseExec("xcrun", ["simctl", "list", "runtimes", "--json"]);
			const data = JSON.parse(stdout);
			return (
				data.runtimes as {
					identifier: string;
					name: string;
					version?: string;
					isAvailable: boolean;
				}[]
			).map((rt) => {
				const versionMatch = rt.name.match(/[\d.]+$/);
				return {
					identifier: rt.identifier,
					name: rt.name,
					version: rt.version ?? versionMatch?.[0] ?? "unknown",
					isAvailable: rt.isAvailable,
				};
			});
		},

		async createDevice(name: string, deviceTypeId: string, runtimeId?: string): Promise<string> {
			const args = ["simctl", "create", name, deviceTypeId];
			if (runtimeId) args.push(runtimeId);
			const { stdout } = await verboseExec("xcrun", args);
			return stdout.trim();
		},

		async cloneDevice(deviceId: string, newName: string): Promise<string> {
			const { stdout } = await verboseExec("xcrun", ["simctl", "clone", deviceId, newName]);
			return stdout.trim();
		},

		async renameDevice(deviceId: string, newName: string): Promise<void> {
			await verboseExec("xcrun", ["simctl", "rename", deviceId, newName]);
		},

		async deleteDevice(deviceId: string): Promise<void> {
			try {
				await verboseExec("xcrun", ["simctl", "delete", deviceId]);
			} catch (err) {
				const msg = (err as Error).message ?? "";
				if (msg.includes("Invalid device state")) {
					throw new Error("Device must be shut down before deleting");
				}
				throw err;
			}
		},

		async addKeychainCert(deviceId: string, certData: Buffer, isRoot: boolean): Promise<void> {
			const tmpDir = await mkdtemp(join(tmpdir(), "simvyn-cert-"));
			const certPath = join(tmpDir, "cert.pem");
			try {
				await writeFile(certPath, certData);
				const subcmd = isRoot ? "add-root-cert" : "add-cert";
				await verboseExec("xcrun", ["simctl", "keychain", deviceId, subcmd, certPath]);
			} finally {
				await rm(tmpDir, { recursive: true, force: true });
			}
		},

		async resetKeychain(deviceId: string): Promise<void> {
			await verboseExec("xcrun", ["simctl", "keychain", deviceId, "reset"]);
		},

		async collectBugReport(deviceId: string, outputDir: string): Promise<BugReportResult> {
			const dir = outputDir || join(homedir(), ".simvyn", "bug-reports");
			await mkdir(dir, { recursive: true });
			const filename = `diagnose-${deviceId}-${Date.now()}.tar.gz`;
			const outputPath = join(dir, filename);
			await verboseExec("xcrun", ["simctl", "diagnose", "-b", "--output", outputPath], {
				timeout: 300_000,
			});
			const info = await stat(outputPath);
			return { path: outputPath, filename, size: info.size };
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
				"settings",
				"accessibility",
				"deviceLifecycle",
				"keychain",
				"bugReport",
			];
		},
	};
}
