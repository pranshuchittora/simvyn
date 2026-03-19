import type { ChildProcess } from "node:child_process";
import { mkdir, mkdtemp, readFile, readdir, rm, stat, writeFile } from "node:fs/promises";
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

// --- devicectl integration for physical iOS devices ---

interface DevicectlDevice {
	identifier: string;
	hardwareProperties: {
		reality: string;
		marketingName: string;
		platform: string;
		udid: string;
		deviceType: string;
	};
	deviceProperties: {
		name: string;
		osVersionNumber: string;
		ddiServicesAvailable?: boolean;
	};
	connectionProperties: {
		transportType: string;
		tunnelState: string;
		pairingState: string;
	};
}

interface DevicectlListResult {
	devices: DevicectlDevice[];
}

let hasDevicectl: boolean | null = null;

async function checkDevicectl(): Promise<boolean> {
	if (hasDevicectl !== null) return hasDevicectl;
	try {
		await verboseExec("xcrun", ["devicectl", "list", "devices", "--help"]);
		hasDevicectl = true;
	} catch {
		hasDevicectl = false;
	}
	return hasDevicectl;
}

async function devicectlJson<T>(args: string[]): Promise<T> {
	const tmpDir = await mkdtemp(join(tmpdir(), "simvyn-dctl-"));
	const jsonPath = join(tmpDir, "output.json");
	try {
		await verboseExec("xcrun", ["devicectl", ...args, "--json-output", jsonPath, "-q"]);
		const raw = await readFile(jsonPath, "utf-8");
		const parsed = JSON.parse(raw);
		return parsed.result as T;
	} finally {
		await rm(tmpDir, { recursive: true, force: true });
	}
}

export function isPhysicalDevice(id: string): boolean {
	return id.startsWith("physical:");
}

export function stripPhysicalPrefix(id: string): string {
	return id.replace("physical:", "");
}

async function listPhysicalDevices(): Promise<Device[]> {
	if (!(await checkDevicectl())) return [];
	try {
		const result = await devicectlJson<DevicectlListResult>(["list", "devices"]);
		return result.devices
			.filter((d) => d.hardwareProperties.reality === "physical")
			.filter((d) => d.hardwareProperties.platform === "iOS")
			.map((d) => ({
				id: `physical:${d.identifier}`,
				name: d.deviceProperties.name,
				platform: "ios" as const,
				state: "booted" as const,
				osVersion: `iOS ${d.deviceProperties.osVersionNumber}`,
				deviceType: d.hardwareProperties.marketingName,
				isAvailable: true,
			}));
	} catch (err) {
		console.warn("Failed to list physical iOS devices:", (err as Error).message);
		return [];
	}
}

export interface DevicectlStatus {
	available: boolean;
	version?: string;
	error?: string;
}

export async function getDevicectlStatus(): Promise<DevicectlStatus> {
	try {
		await verboseExec("xcrun", ["devicectl", "list", "devices", "--help"]);
		return { available: true };
	} catch {
		return {
			available: false,
			error: "devicectl not found — Xcode 15+ is required for physical iOS device support",
		};
	}
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
			const devices: Device[] = [];
			try {
				const { stdout } = await verboseExec("xcrun", ["simctl", "list", "devices", "--json"]);
				const data = JSON.parse(stdout);

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
			} catch (err) {
				console.warn("Failed to list iOS simulators:", (err as Error).message);
			}

			const physical = await listPhysicalDevices();
			devices.push(...physical);

			return devices;
		},

		async boot(id: string): Promise<void> {
			if (isPhysicalDevice(id)) return; // physical devices don't need booting
			try {
				await verboseExec("xcrun", ["simctl", "boot", id]);
			} catch (err) {
				const msg = (err as Error).message ?? "";
				if (!msg.includes("already booted")) throw err;
			}
		},

		async shutdown(id: string): Promise<void> {
			if (isPhysicalDevice(id)) throw new Error("Shutdown is not available for physical devices");
			try {
				await verboseExec("xcrun", ["simctl", "shutdown", id]);
			} catch (err) {
				const msg = (err as Error).message ?? "";
				if (!msg.includes("current state: Shutdown")) throw err;
			}
		},

		async erase(id: string): Promise<void> {
			if (isPhysicalDevice(id)) throw new Error("Erase is only available for simulators");
			await verboseExec("xcrun", ["simctl", "erase", id]);
		},

		async setLocation(deviceId: string, lat: number, lon: number): Promise<void> {
			if (isPhysicalDevice(deviceId))
				throw new Error(
					"Location simulation is not available on physical devices (hardware GPS cannot be overridden)",
				);
			await verboseExec("xcrun", ["simctl", "location", deviceId, "set", `${lat},${lon}`]);
		},

		async clearLocation(deviceId: string): Promise<void> {
			if (isPhysicalDevice(deviceId))
				throw new Error(
					"Location simulation is not available on physical devices (hardware GPS cannot be overridden)",
				);
			await verboseExec("xcrun", ["simctl", "location", deviceId, "clear"]);
		},

		async listApps(deviceId: string): Promise<AppInfo[]> {
			if (isPhysicalDevice(deviceId)) {
				interface DevicectlAppsResult {
					apps: Array<{
						bundleIdentifier: string;
						bundleDisplayName?: string;
						bundleName?: string;
						bundleShortVersion?: string;
						bundleVersion?: string;
					}>;
				}
				const result = await devicectlJson<DevicectlAppsResult>([
					"device",
					"info",
					"apps",
					"--device",
					stripPhysicalPrefix(deviceId),
				]);
				return (result.apps ?? []).map((app) => ({
					bundleId: app.bundleIdentifier,
					name: app.bundleDisplayName ?? app.bundleName ?? app.bundleIdentifier,
					version: app.bundleShortVersion ?? app.bundleVersion ?? "unknown",
					type: "user" as const,
				}));
			}
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
			if (isPhysicalDevice(deviceId)) {
				await verboseExec("xcrun", [
					"devicectl",
					"device",
					"install",
					"app",
					"--device",
					stripPhysicalPrefix(deviceId),
					appPath,
					"-q",
				]);
				return;
			}
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
			if (isPhysicalDevice(deviceId)) {
				await verboseExec("xcrun", [
					"devicectl",
					"device",
					"uninstall",
					"app",
					"--device",
					stripPhysicalPrefix(deviceId),
					bundleId,
					"-q",
				]);
				return;
			}
			await verboseExec("xcrun", ["simctl", "uninstall", deviceId, bundleId]);
		},

		async launchApp(deviceId: string, bundleId: string): Promise<void> {
			if (isPhysicalDevice(deviceId)) {
				await verboseExec("xcrun", [
					"devicectl",
					"device",
					"process",
					"launch",
					"--device",
					stripPhysicalPrefix(deviceId),
					bundleId,
					"-q",
				]);
				return;
			}
			await verboseExec("xcrun", ["simctl", "launch", deviceId, bundleId]);
		},

		async terminateApp(deviceId: string, bundleId: string): Promise<void> {
			if (isPhysicalDevice(deviceId)) {
				try {
					interface DevicectlProcessesResult {
						runningProcesses: Array<{
							processIdentifier: number;
							executable?: string;
							bundleIdentifier?: string;
						}>;
					}
					const result = await devicectlJson<DevicectlProcessesResult>([
						"device",
						"info",
						"processes",
						"--device",
						stripPhysicalPrefix(deviceId),
					]);
					const proc = result.runningProcesses?.find((p) => p.bundleIdentifier === bundleId);
					if (!proc) return; // app not running, silently succeed
					await verboseExec("xcrun", [
						"devicectl",
						"device",
						"process",
						"terminate",
						"--device",
						stripPhysicalPrefix(deviceId),
						"--pid",
						String(proc.processIdentifier),
						"-q",
					]);
				} catch {
					// silently succeed if process already terminated
				}
				return;
			}
			await verboseExec("xcrun", ["simctl", "terminate", deviceId, bundleId]);
		},

		async getAppInfo(deviceId: string, bundleId: string): Promise<AppInfo | null> {
			if (isPhysicalDevice(deviceId)) {
				try {
					const apps = await this.listApps!(deviceId);
					return apps.find((a) => a.bundleId === bundleId) ?? null;
				} catch {
					return null;
				}
			}
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

		async clearAppData(deviceId: string, bundleId: string): Promise<void> {
			if (isPhysicalDevice(deviceId))
				throw new Error("Clear app data is not available on physical iOS devices");
			const { stdout } = await verboseExec("xcrun", [
				"simctl",
				"get_app_container",
				deviceId,
				bundleId,
				"data",
			]);
			const containerPath = stdout.trim();
			if (!containerPath) throw new Error(`No data container found for ${bundleId}`);
			const entries = await readdir(containerPath);
			await Promise.all(
				entries.map((entry) => rm(join(containerPath, entry), { recursive: true, force: true })),
			);
		},

		async openUrl(deviceId: string, url: string): Promise<void> {
			if (isPhysicalDevice(deviceId)) {
				await verboseExec("xcrun", [
					"devicectl",
					"device",
					"process",
					"launch",
					"--device",
					stripPhysicalPrefix(deviceId),
					"com.apple.mobilesafari",
					"--payload-url",
					url,
					"-q",
				]);
				return;
			}
			await verboseExec("xcrun", ["simctl", "openurl", deviceId, url]);
		},

		async screenshot(deviceId: string, outputPath: string): Promise<void> {
			if (isPhysicalDevice(deviceId))
				throw new Error("Screenshot is not available on physical iOS devices");
			await verboseExec("xcrun", ["simctl", "io", deviceId, "screenshot", outputPath]);
		},

		startRecording(deviceId: string, outputPath: string) {
			if (isPhysicalDevice(deviceId))
				throw new Error("Screen recording is not available on physical iOS devices");
			const child = verboseSpawn("xcrun", ["simctl", "io", deviceId, "recordVideo", outputPath]);
			return Promise.resolve(child);
		},

		async stopRecording(child: ChildProcess) {
			if (child.exitCode !== null) return;
			child.kill("SIGINT");
			await new Promise<void>((resolve) => {
				const timeout = setTimeout(resolve, 5000);
				child.on("close", () => {
					clearTimeout(timeout);
					resolve();
				});
			});
		},

		async getClipboard(deviceId: string): Promise<string> {
			if (isPhysicalDevice(deviceId))
				throw new Error("Clipboard access is not available on physical iOS devices");
			const { stdout } = await verboseExec("xcrun", ["simctl", "pbpaste", deviceId]);
			return stdout;
		},

		async setClipboard(deviceId: string, text: string): Promise<void> {
			if (isPhysicalDevice(deviceId))
				throw new Error("Clipboard access is not available on physical iOS devices");
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
			if (isPhysicalDevice(deviceId))
				throw new Error("Media injection is not available on physical iOS devices");
			await verboseExec("xcrun", ["simctl", "addmedia", deviceId, filePath]);
		},

		async setAppearance(deviceId: string, mode: "light" | "dark"): Promise<void> {
			if (isPhysicalDevice(deviceId))
				throw new Error("Appearance control is not available on physical iOS devices");
			await verboseExec("xcrun", ["simctl", "ui", deviceId, "appearance", mode]);
		},

		async setStatusBar(deviceId: string, overrides: Record<string, string>): Promise<void> {
			if (isPhysicalDevice(deviceId))
				throw new Error("Status bar overrides are not available on physical devices");
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
			if (isPhysicalDevice(deviceId))
				throw new Error("Status bar overrides are not available on physical devices");
			await verboseExec("xcrun", ["simctl", "status_bar", deviceId, "clear"]);
		},

		async grantPermission(deviceId: string, bundleId: string, permission: string): Promise<void> {
			if (isPhysicalDevice(deviceId))
				throw new Error("Permission management is not available on physical iOS devices");
			await verboseExec("xcrun", ["simctl", "privacy", deviceId, "grant", permission, bundleId]);
		},

		async revokePermission(deviceId: string, bundleId: string, permission: string): Promise<void> {
			if (isPhysicalDevice(deviceId))
				throw new Error("Permission management is not available on physical iOS devices");
			await verboseExec("xcrun", ["simctl", "privacy", deviceId, "revoke", permission, bundleId]);
		},

		async resetPermissions(deviceId: string, bundleId: string): Promise<void> {
			if (isPhysicalDevice(deviceId))
				throw new Error("Permission management is not available on physical iOS devices");
			await verboseExec("xcrun", ["simctl", "privacy", deviceId, "reset", "all", bundleId]);
		},

		async setLocale(deviceId: string, locale: string): Promise<void> {
			if (isPhysicalDevice(deviceId))
				throw new Error("Locale control is not available on physical iOS devices");
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
			if (isPhysicalDevice(deviceId))
				throw new Error("Accessibility settings are not available on physical iOS devices");
			await verboseExec("xcrun", ["simctl", "ui", deviceId, "content_size", size]);
		},

		async setIncreaseContrast(deviceId: string, enabled: boolean): Promise<void> {
			if (isPhysicalDevice(deviceId))
				throw new Error("Accessibility settings are not available on physical iOS devices");
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
			if (isPhysicalDevice(deviceId))
				throw new Error("Simulator lifecycle operations are not available on physical devices");
			const { stdout } = await verboseExec("xcrun", ["simctl", "clone", deviceId, newName]);
			return stdout.trim();
		},

		async renameDevice(deviceId: string, newName: string): Promise<void> {
			if (isPhysicalDevice(deviceId))
				throw new Error("Simulator lifecycle operations are not available on physical devices");
			await verboseExec("xcrun", ["simctl", "rename", deviceId, newName]);
		},

		async deleteDevice(deviceId: string): Promise<void> {
			if (isPhysicalDevice(deviceId))
				throw new Error("Simulator lifecycle operations are not available on physical devices");
			try {
				await verboseExec("xcrun", ["simctl", "delete", deviceId]);
			} catch (err) {
				const msg = (err as Error).message ?? "";
				if (msg.includes("Invalid device state")) {
					throw new Error("Device must be shut down before deleting", { cause: err });
				}
				throw err;
			}
		},

		async addKeychainCert(deviceId: string, certData: Buffer, isRoot: boolean): Promise<void> {
			if (isPhysicalDevice(deviceId))
				throw new Error("Keychain management is not available on physical iOS devices");
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
			if (isPhysicalDevice(deviceId))
				throw new Error("Keychain management is not available on physical iOS devices");
			await verboseExec("xcrun", ["simctl", "keychain", deviceId, "reset"]);
		},

		async collectBugReport(deviceId: string, outputDir: string): Promise<BugReportResult> {
			if (isPhysicalDevice(deviceId)) {
				throw new Error("Bug report collection is not available on physical iOS devices");
			}
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
