import { type ChildProcess, execFile, spawn } from "node:child_process";
import { basename } from "node:path";
import { promisify } from "node:util";
import type { AppInfo, Device, PlatformAdapter, PlatformCapability } from "@simvyn/types";

const execFileAsync = promisify(execFile);

async function getAvdList(): Promise<string[]> {
	try {
		const { stdout } = await execFileAsync("emulator", ["-list-avds"]);
		return stdout.trim().split("\n").filter(Boolean);
	} catch {
		return [];
	}
}

interface AdbDevice {
	serial: string;
	status: string;
}

async function getAdbDevices(): Promise<AdbDevice[]> {
	try {
		const { stdout } = await execFileAsync("adb", ["devices"]);
		const lines = stdout.trim().split("\n").slice(1); // skip "List of devices attached"
		return lines
			.map((line) => {
				const [serial, status] = line.split("\t");
				return { serial: serial?.trim(), status: status?.trim() };
			})
			.filter((d) => d.serial && (d.status === "device" || d.status === "emulator"));
	} catch {
		return [];
	}
}

async function getEmulatorAvdName(serial: string): Promise<string> {
	try {
		const { stdout } = await execFileAsync("adb", ["-s", serial, "emu", "avd", "name"]);
		return stdout.trim().split("\n")[0]?.trim() ?? serial;
	} catch {
		return serial;
	}
}

async function getDeviceProp(serial: string, prop: string): Promise<string> {
	try {
		const { stdout } = await execFileAsync("adb", ["-s", serial, "shell", "getprop", prop]);
		return stdout.trim();
	} catch {
		return "";
	}
}

export function createAndroidAdapter(): PlatformAdapter {
	return {
		platform: "android",

		async isAvailable(): Promise<boolean> {
			try {
				await execFileAsync("adb", ["version"]);
				return true;
			} catch {
				return false;
			}
		},

		async listDevices(): Promise<Device[]> {
			try {
				const [avds, adbDevices] = await Promise.all([getAvdList(), getAdbDevices()]);
				const devices: Device[] = [];
				const bootedAvdNames = new Set<string>();

				// running emulators
				for (const adbDev of adbDevices) {
					if (adbDev.serial.startsWith("emulator-")) {
						const avdName = await getEmulatorAvdName(adbDev.serial);
						bootedAvdNames.add(avdName);
						const androidVersion = await getDeviceProp(adbDev.serial, "ro.build.version.release");
						devices.push({
							id: adbDev.serial,
							name: avdName,
							platform: "android",
							state: "booted",
							osVersion: androidVersion ? `Android ${androidVersion}` : "Android",
							deviceType: "Emulator",
							isAvailable: true,
						});
					} else {
						// USB physical device
						const [model, androidVersion] = await Promise.all([
							getDeviceProp(adbDev.serial, "ro.product.model"),
							getDeviceProp(adbDev.serial, "ro.build.version.release"),
						]);
						devices.push({
							id: adbDev.serial,
							name: model || adbDev.serial,
							platform: "android",
							state: "booted",
							osVersion: androidVersion ? `Android ${androidVersion}` : "Android",
							deviceType: "Physical",
							isAvailable: true,
						});
					}
				}

				// available but not booted AVDs
				for (const avd of avds) {
					if (!bootedAvdNames.has(avd)) {
						devices.push({
							id: `avd:${avd}`,
							name: avd,
							platform: "android",
							state: "shutdown",
							osVersion: "Android",
							deviceType: "Emulator",
							isAvailable: true,
						});
					}
				}

				return devices;
			} catch (err) {
				console.warn("Failed to list Android devices:", (err as Error).message);
				return [];
			}
		},

		async boot(id: string): Promise<void> {
			if (!id.startsWith("avd:")) {
				throw new Error(`Cannot boot non-AVD device: ${id}`);
			}

			const avdName = id.slice(4);
			const child = spawn("emulator", [`@${avdName}`], {
				stdio: "ignore",
				detached: true,
			});
			child.unref();

			// poll for the emulator to appear in adb devices
			const deadline = Date.now() + 60_000;
			while (Date.now() < deadline) {
				const devices = await getAdbDevices();
				for (const d of devices) {
					if (d.serial.startsWith("emulator-")) {
						const name = await getEmulatorAvdName(d.serial);
						if (name === avdName) return;
					}
				}
				await new Promise((r) => setTimeout(r, 2000));
			}
			throw new Error(`Timed out waiting for AVD "${avdName}" to boot`);
		},

		async shutdown(id: string): Promise<void> {
			if (id.startsWith("avd:")) return; // can't shut down something not running

			try {
				await execFileAsync("adb", ["-s", id, "emu", "kill"]);
			} catch {
				// no-op for physical devices or already-dead emulators
			}
		},

		// erase is not available on Android via adb
		erase: undefined,

		async setLocation(deviceId: string, lat: number, lon: number): Promise<void> {
			await execFileAsync("adb", ["-s", deviceId, "emu", "geo", "fix", String(lon), String(lat)]);
		},

		async clearLocation(deviceId: string): Promise<void> {
			await execFileAsync("adb", ["-s", deviceId, "emu", "geo", "fix", "0", "0"]);
		},

		async listApps(deviceId: string): Promise<AppInfo[]> {
			if (deviceId.startsWith("avd:")) throw new Error("Device must be booted for app operations");
			const { stdout } = await execFileAsync("adb", [
				"-s",
				deviceId,
				"shell",
				"pm",
				"list",
				"packages",
				"-f",
				"-3",
			]);
			const apps: AppInfo[] = [];
			for (const line of stdout.trim().split("\n")) {
				if (!line) continue;
				const match = line.match(/^package:(.+?)=([^\s]+)$/);
				if (!match) continue;
				apps.push({
					bundleId: match[2],
					name: match[2],
					version: "unknown",
					type: "user",
					appPath: match[1],
				});
			}
			return apps;
		},

		async installApp(deviceId: string, appPath: string): Promise<void> {
			if (deviceId.startsWith("avd:")) throw new Error("Device must be booted for app operations");
			await execFileAsync("adb", ["-s", deviceId, "install", appPath]);
		},

		async uninstallApp(deviceId: string, bundleId: string): Promise<void> {
			if (deviceId.startsWith("avd:")) throw new Error("Device must be booted for app operations");
			await execFileAsync("adb", ["-s", deviceId, "uninstall", bundleId]);
		},

		async launchApp(deviceId: string, bundleId: string): Promise<void> {
			if (deviceId.startsWith("avd:")) throw new Error("Device must be booted for app operations");
			await execFileAsync("adb", [
				"-s",
				deviceId,
				"shell",
				"monkey",
				"-p",
				bundleId,
				"-c",
				"android.intent.category.LAUNCHER",
				"1",
			]);
		},

		async terminateApp(deviceId: string, bundleId: string): Promise<void> {
			if (deviceId.startsWith("avd:")) throw new Error("Device must be booted for app operations");
			await execFileAsync("adb", ["-s", deviceId, "shell", "am", "force-stop", bundleId]);
		},

		async getAppInfo(deviceId: string, bundleId: string): Promise<AppInfo | null> {
			if (deviceId.startsWith("avd:")) throw new Error("Device must be booted for app operations");
			try {
				const { stdout } = await execFileAsync("adb", [
					"-s",
					deviceId,
					"shell",
					"dumpsys",
					"package",
					bundleId,
				]);
				const versionName = stdout.match(/versionName=(.+)/)?.[1]?.trim() ?? "unknown";
				const versionCode = stdout.match(/versionCode=(\d+)/)?.[1] ?? "";
				const dataDir = stdout.match(/dataDir=(.+)/)?.[1]?.trim() ?? undefined;
				const codePath = stdout.match(/codePath=(.+)/)?.[1]?.trim() ?? undefined;
				return {
					bundleId,
					name: bundleId,
					version: versionName + (versionCode ? ` (${versionCode})` : ""),
					type: "user",
					dataContainer: dataDir,
					appPath: codePath,
				};
			} catch {
				return null;
			}
		},

		async clearAppData(deviceId: string, bundleId: string): Promise<void> {
			if (deviceId.startsWith("avd:")) throw new Error("Device must be booted for app operations");
			await execFileAsync("adb", ["-s", deviceId, "shell", "pm", "clear", bundleId]);
		},

		async openUrl(deviceId: string, url: string): Promise<void> {
			if (deviceId.startsWith("avd:"))
				throw new Error("Device must be booted for deep link operations");
			await execFileAsync("adb", [
				"-s",
				deviceId,
				"shell",
				"am",
				"start",
				"-a",
				"android.intent.action.VIEW",
				"-d",
				url,
			]);
		},

		async screenshot(deviceId: string, outputPath: string): Promise<void> {
			if (deviceId.startsWith("avd:")) throw new Error("Device must be booted for screenshot");
			await execFileAsync("adb", [
				"-s",
				deviceId,
				"shell",
				"screencap",
				"-p",
				"/sdcard/simvyn_screenshot.png",
			]);
			await execFileAsync("adb", [
				"-s",
				deviceId,
				"pull",
				"/sdcard/simvyn_screenshot.png",
				outputPath,
			]);
			await execFileAsync("adb", ["-s", deviceId, "shell", "rm", "/sdcard/simvyn_screenshot.png"]);
		},

		startRecording(deviceId: string, outputPath: string) {
			if (deviceId.startsWith("avd:"))
				return Promise.reject(new Error("Device must be booted for recording"));
			const child = spawn("adb", [
				"-s",
				deviceId,
				"shell",
				"screenrecord",
				"/sdcard/simvyn_recording.mp4",
			]);
			// stash metadata on the child for stopRecording
			(child as any).__simvyn_deviceId = deviceId;
			(child as any).__simvyn_outputPath = outputPath;
			return Promise.resolve(child);
		},

		async stopRecording(child: ChildProcess, deviceId: string, outputPath: string) {
			child.kill("SIGINT");
			await new Promise<void>((resolve) => {
				child.on("close", () => resolve());
				setTimeout(resolve, 3000);
			});
			const did = deviceId || (child as any).__simvyn_deviceId;
			const out = outputPath || (child as any).__simvyn_outputPath;
			await execFileAsync("adb", ["-s", did, "pull", "/sdcard/simvyn_recording.mp4", out]);
			await execFileAsync("adb", ["-s", did, "shell", "rm", "/sdcard/simvyn_recording.mp4"]);
		},

		async setAppearance(deviceId: string, mode: "light" | "dark"): Promise<void> {
			if (deviceId.startsWith("avd:"))
				throw new Error("Device must be booted for settings operations");
			await execFileAsync("adb", [
				"-s",
				deviceId,
				"shell",
				"cmd",
				"uimode",
				"night",
				mode === "dark" ? "yes" : "no",
			]);
		},

		async addMedia(deviceId: string, filePath: string): Promise<void> {
			if (deviceId.startsWith("avd:"))
				throw new Error("Device must be booted for media operations");
			const filename = basename(filePath);
			await execFileAsync("adb", ["-s", deviceId, "push", filePath, `/sdcard/DCIM/${filename}`]);
			await execFileAsync("adb", [
				"-s",
				deviceId,
				"shell",
				"am",
				"broadcast",
				"-a",
				"android.intent.action.MEDIA_SCANNER_SCAN_FILE",
				"-d",
				`file:///sdcard/DCIM/${filename}`,
			]);
		},

		async grantPermission(deviceId: string, bundleId: string, permission: string): Promise<void> {
			if (deviceId.startsWith("avd:"))
				throw new Error("Device must be booted for permission operations");
			const fullPermission = permission.startsWith("android.permission.")
				? permission
				: `android.permission.${permission}`;
			await execFileAsync("adb", [
				"-s",
				deviceId,
				"shell",
				"pm",
				"grant",
				bundleId,
				fullPermission,
			]);
		},

		async revokePermission(deviceId: string, bundleId: string, permission: string): Promise<void> {
			if (deviceId.startsWith("avd:"))
				throw new Error("Device must be booted for permission operations");
			const fullPermission = permission.startsWith("android.permission.")
				? permission
				: `android.permission.${permission}`;
			await execFileAsync("adb", [
				"-s",
				deviceId,
				"shell",
				"pm",
				"revoke",
				bundleId,
				fullPermission,
			]);
		},

		resetPermissions: undefined,

		async setLocale(deviceId: string, locale: string): Promise<void> {
			if (deviceId.startsWith("avd:"))
				throw new Error("Device must be booted for locale operations");
			await execFileAsync("adb", [
				"-s",
				deviceId,
				"shell",
				"setprop",
				"persist.sys.locale",
				locale,
			]);
			await execFileAsync("adb", ["-s", deviceId, "shell", "setprop", "ctl.restart", "zygote"]);
			console.log("Warning: locale change restarts the Android runtime");
		},

		async setTalkBack(deviceId: string, enabled: boolean): Promise<void> {
			if (deviceId.startsWith("avd:"))
				throw new Error("Device must be booted for accessibility operations");
			const service = enabled
				? "com.google.android.marvin.talkback/com.google.android.marvin.talkback.TalkBackService"
				: "";
			await execFileAsync("adb", [
				"-s",
				deviceId,
				"shell",
				"settings",
				"put",
				"secure",
				"enabled_accessibility_services",
				service,
			]);
			await execFileAsync("adb", [
				"-s",
				deviceId,
				"shell",
				"settings",
				"put",
				"secure",
				"accessibility_enabled",
				enabled ? "1" : "0",
			]);
		},

		setStatusBar: undefined,
		clearStatusBar: undefined,
		setContentSize: undefined,
		setIncreaseContrast: undefined,

		capabilities(): PlatformCapability[] {
			return [
				"setLocation",
				"screenshot",
				"screenRecord",
				"logs",
				"deepLinks",
				"appManagement",
				"addMedia",
				"settings",
				"accessibility",
			];
		},
	};
}
