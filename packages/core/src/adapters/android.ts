import type { ChildProcess } from "node:child_process";
import { mkdir, stat } from "node:fs/promises";
import { homedir } from "node:os";
import { basename, join } from "node:path";
import type {
	AppInfo,
	BugReportResult,
	Device,
	PlatformAdapter,
	PlatformCapability,
	PortMapping,
} from "@simvyn/types";
import { verboseExec, verboseSpawn } from "../verbose-exec.js";

export function isAndroidPhysical(deviceId: string): boolean {
	return !deviceId.startsWith("emulator-") && !deviceId.startsWith("avd:");
}

async function getAvdList(): Promise<string[]> {
	try {
		const { stdout } = await verboseExec("emulator", ["-list-avds"]);
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
		const { stdout } = await verboseExec("adb", ["devices"]);
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
	// prefer getprop — adb emu console bridge returns empty on some adb versions (e.g. 35.x)
	try {
		const { stdout } = await verboseExec("adb", [
			"-s",
			serial,
			"shell",
			"getprop",
			"ro.boot.qemu.avd_name",
		]);
		const name = stdout.trim();
		if (name) return name;
	} catch {}

	// fallback to emu console for older emulators that may not set the prop
	try {
		const { stdout } = await verboseExec("adb", ["-s", serial, "emu", "avd", "name"]);
		const name = stdout.trim().split(/\r?\n/)[0]?.trim();
		if (name && name !== "OK" && !name.startsWith("KO")) return name;
	} catch {}

	return serial;
}

async function getDeviceProp(serial: string, prop: string): Promise<string> {
	try {
		const { stdout } = await verboseExec("adb", ["-s", serial, "shell", "getprop", prop]);
		return stdout.trim();
	} catch {
		return "";
	}
}

const CONTENT_SIZE_TO_FONT_SCALE: Record<string, number> = {
	"extra-small": 0.85,
	small: 0.9,
	medium: 1.0,
	large: 1.1,
	"extra-large": 1.2,
	"extra-extra-large": 1.3,
	"extra-extra-extra-large": 1.4,
	"accessibility-medium": 1.5,
	"accessibility-large": 1.7,
	"accessibility-extra-large": 2.0,
	"accessibility-extra-extra-large": 2.5,
	"accessibility-extra-extra-extra-large": 3.0,
};

export function createAndroidAdapter(): PlatformAdapter {
	return {
		platform: "android",

		async isAvailable(): Promise<boolean> {
			try {
				await verboseExec("adb", ["version"]);
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
			const child = verboseSpawn("emulator", [`@${avdName}`], {
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
			if (isAndroidPhysical(id)) return; // no-op for physical devices — don't attempt emu kill

			try {
				await verboseExec("adb", ["-s", id, "emu", "kill"]);
			} catch {
				// no-op for already-dead emulators
			}
		},

		// erase is not available on Android via adb
		erase: undefined,

		async setLocation(deviceId: string, lat: number, lon: number): Promise<void> {
			if (deviceId.startsWith("avd:")) throw new Error("Device must be booted");
			if (isAndroidPhysical(deviceId)) {
				throw new Error("Location simulation is not available on physical Android devices");
			}
			await verboseExec("adb", ["-s", deviceId, "emu", "geo", "fix", String(lon), String(lat)]);
		},

		async clearLocation(deviceId: string): Promise<void> {
			if (deviceId.startsWith("avd:")) throw new Error("Device must be booted");
			if (isAndroidPhysical(deviceId)) {
				throw new Error("Location simulation is not available on physical Android devices");
			}
			await verboseExec("adb", ["-s", deviceId, "emu", "geo", "fix", "0", "0"]);
		},

		async listApps(deviceId: string): Promise<AppInfo[]> {
			if (deviceId.startsWith("avd:")) throw new Error("Device must be booted for app operations");
			const [listResult, dumpResult] = await Promise.all([
				verboseExec("adb", ["-s", deviceId, "shell", "pm", "list", "packages", "-f"]),
				verboseExec("adb", [
					"-s",
					deviceId,
					"shell",
					"dumpsys package | grep -E 'Package \\[|versionName=|nonLocalizedLabel='",
				]).catch(() => ({ stdout: "" })),
			]);

			const meta = new Map<string, { version?: string; label?: string }>();
			let currentPkg = "";
			for (const line of dumpResult.stdout.split("\n")) {
				const pkgMatch = line.match(/Package \[(.+?)\]/);
				if (pkgMatch) {
					currentPkg = pkgMatch[1];
					if (!meta.has(currentPkg)) meta.set(currentPkg, {});
					continue;
				}
				if (!currentPkg || !meta.has(currentPkg)) continue;
				const entry = meta.get(currentPkg)!;
				if (!entry.version) {
					const verMatch = line.match(/versionName=(.+)/);
					if (verMatch) entry.version = verMatch[1].trim();
				}
				if (!entry.label) {
					const labelMatch = line.match(/nonLocalizedLabel=(.+)/);
					if (labelMatch && labelMatch[1].trim() !== "null") {
						entry.label = labelMatch[1].trim();
					}
				}
			}

			const apps: AppInfo[] = [];
			for (const line of listResult.stdout.trim().split("\n")) {
				if (!line) continue;
				const match = line.match(/^package:(.+)=([^\s=]+)$/);
				if (!match) continue;
				const appPath = match[1];
				const bundleId = match[2];
				const info = meta.get(bundleId);
				apps.push({
					bundleId,
					name: info?.label || bundleId,
					version: info?.version || "unknown",
					type: appPath.startsWith("/data/") ? "user" : "system",
					appPath,
				});
			}
			return apps;
		},

		async installApp(deviceId: string, appPath: string): Promise<void> {
			if (deviceId.startsWith("avd:")) throw new Error("Device must be booted for app operations");
			await verboseExec("adb", ["-s", deviceId, "install", appPath]);
		},

		async uninstallApp(deviceId: string, bundleId: string): Promise<void> {
			if (deviceId.startsWith("avd:")) throw new Error("Device must be booted for app operations");
			await verboseExec("adb", ["-s", deviceId, "uninstall", bundleId]);
		},

		async launchApp(deviceId: string, bundleId: string): Promise<void> {
			if (deviceId.startsWith("avd:")) throw new Error("Device must be booted for app operations");
			await verboseExec("adb", [
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
			await verboseExec("adb", ["-s", deviceId, "shell", "am", "force-stop", bundleId]);
		},

		async getAppInfo(deviceId: string, bundleId: string): Promise<AppInfo | null> {
			if (deviceId.startsWith("avd:")) throw new Error("Device must be booted for app operations");
			try {
				const { stdout } = await verboseExec("adb", [
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
			await verboseExec("adb", ["-s", deviceId, "shell", "pm", "clear", bundleId]);
		},

		async openUrl(deviceId: string, url: string): Promise<void> {
			if (deviceId.startsWith("avd:"))
				throw new Error("Device must be booted for deep link operations");
			await verboseExec("adb", [
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
			await verboseExec("adb", [
				"-s",
				deviceId,
				"shell",
				"screencap",
				"-p",
				"/sdcard/simvyn_screenshot.png",
			]);
			await verboseExec("adb", [
				"-s",
				deviceId,
				"pull",
				"/sdcard/simvyn_screenshot.png",
				outputPath,
			]);
			await verboseExec("adb", ["-s", deviceId, "shell", "rm", "/sdcard/simvyn_screenshot.png"]);
		},

		startRecording(deviceId: string, outputPath: string) {
			if (deviceId.startsWith("avd:"))
				return Promise.reject(new Error("Device must be booted for recording"));
			const child = verboseSpawn("adb", [
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
			await verboseExec("adb", ["-s", did, "pull", "/sdcard/simvyn_recording.mp4", out]);
			await verboseExec("adb", ["-s", did, "shell", "rm", "/sdcard/simvyn_recording.mp4"]);
		},

		getClipboard: undefined,

		async setClipboard(deviceId: string, text: string): Promise<void> {
			if (deviceId.startsWith("avd:"))
				throw new Error("Device must be booted for clipboard operations");

			// Try Android 12+ clipboard service first
			try {
				await verboseExec("adb", ["-s", deviceId, "shell", "cmd", "clipboard", "set-text", text]);
				return;
			} catch {
				// Fall back to input text for older Android
			}

			// Escape for adb shell input text — %s = space, backslash-escape specials
			const escaped = text
				.slice(0, 256)
				.replace(/\\/g, "\\\\")
				.replace(/ /g, "%s")
				.replace(/[()&|;<>*~"'`]/g, (c) => `\\${c}`);
			await verboseExec("adb", ["-s", deviceId, "shell", "input", "text", escaped]);
		},

		async setAppearance(deviceId: string, mode: "light" | "dark"): Promise<void> {
			if (deviceId.startsWith("avd:"))
				throw new Error("Device must be booted for settings operations");
			await verboseExec("adb", [
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
			await verboseExec("adb", ["-s", deviceId, "push", filePath, `/sdcard/DCIM/${filename}`]);
			await verboseExec("adb", [
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
			await verboseExec("adb", ["-s", deviceId, "shell", "pm", "grant", bundleId, fullPermission]);
		},

		async revokePermission(deviceId: string, bundleId: string, permission: string): Promise<void> {
			if (deviceId.startsWith("avd:"))
				throw new Error("Device must be booted for permission operations");
			const fullPermission = permission.startsWith("android.permission.")
				? permission
				: `android.permission.${permission}`;
			await verboseExec("adb", ["-s", deviceId, "shell", "pm", "revoke", bundleId, fullPermission]);
		},

		resetPermissions: undefined,

		async setLocale(deviceId: string, locale: string): Promise<void> {
			if (deviceId.startsWith("avd:"))
				throw new Error("Device must be booted for locale operations");
			if (isAndroidPhysical(deviceId)) {
				throw new Error(
					"Locale change requires root access and is not available on most physical devices",
				);
			}
			// Android expects BCP 47 tags (en-US) not POSIX (en_US)
			const bcp47 = locale.replace("_", "-");
			// setprop persist.sys.locale requires root — emulators have su
			await verboseExec("adb", [
				"-s",
				deviceId,
				"shell",
				"su",
				"0",
				"setprop",
				"persist.sys.locale",
				bcp47,
			]);
			await verboseExec("adb", [
				"-s",
				deviceId,
				"shell",
				"su",
				"0",
				"setprop",
				"ctl.restart",
				"zygote",
			]);
		},

		async setTalkBack(deviceId: string, enabled: boolean): Promise<void> {
			if (deviceId.startsWith("avd:"))
				throw new Error("Device must be booted for accessibility operations");
			const service = enabled
				? "com.google.android.marvin.talkback/com.google.android.marvin.talkback.TalkBackService"
				: "";
			await verboseExec("adb", [
				"-s",
				deviceId,
				"shell",
				"settings",
				"put",
				"secure",
				"enabled_accessibility_services",
				service,
			]);
			await verboseExec("adb", [
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

		async setOrientation(deviceId: string, orientation: string): Promise<void> {
			if (deviceId.startsWith("avd:"))
				throw new Error("Device must be booted for orientation operations");
			const map: Record<string, string> = {
				portrait: "0",
				"landscape-left": "1",
				"portrait-upside-down": "2",
				"landscape-right": "3",
			};
			const value = map[orientation];
			if (!value && !["0", "1", "2", "3"].includes(orientation))
				throw new Error(
					`Invalid orientation: ${orientation}. Use: portrait, landscape-left, landscape-right, portrait-upside-down`,
				);
			const rotation = value ?? orientation;
			await verboseExec("adb", [
				"-s",
				deviceId,
				"shell",
				"settings",
				"put",
				"system",
				"accelerometer_rotation",
				"0",
			]);
			await verboseExec("adb", [
				"-s",
				deviceId,
				"shell",
				"settings",
				"put",
				"system",
				"user_rotation",
				rotation,
			]);
		},

		setStatusBar: undefined,
		clearStatusBar: undefined,
		async setContentSize(deviceId: string, size: string): Promise<void> {
			if (deviceId.startsWith("avd:"))
				throw new Error("Device must be booted to change font scale");
			const scale = CONTENT_SIZE_TO_FONT_SCALE[size];
			if (scale === undefined) throw new Error(`Unknown content size: ${size}`);
			await verboseExec("adb", [
				"-s",
				deviceId,
				"shell",
				"settings",
				"put",
				"system",
				"font_scale",
				scale.toString(),
			]);
		},
		setIncreaseContrast: undefined,

		async addForward(deviceId: string, local: string, remote: string): Promise<void> {
			if (deviceId.startsWith("avd:")) throw new Error("Device must be booted for port forwarding");
			await verboseExec("adb", ["-s", deviceId, "forward", local, remote]);
		},

		async removeForward(deviceId: string, local: string): Promise<void> {
			if (deviceId.startsWith("avd:")) throw new Error("Device must be booted for port forwarding");
			await verboseExec("adb", ["-s", deviceId, "forward", "--remove", local]);
		},

		async listForwards(deviceId: string): Promise<PortMapping[]> {
			if (deviceId.startsWith("avd:")) throw new Error("Device must be booted for port forwarding");
			const { stdout } = await verboseExec("adb", ["-s", deviceId, "forward", "--list"]);
			const mappings: PortMapping[] = [];
			for (const line of stdout.trim().split("\n")) {
				if (!line) continue;
				const parts = line.trim().split(/\s+/);
				if (parts.length >= 3) {
					mappings.push({ local: parts[1], remote: parts[2] });
				}
			}
			return mappings;
		},

		async addReverse(deviceId: string, remote: string, local: string): Promise<void> {
			if (deviceId.startsWith("avd:")) throw new Error("Device must be booted for port forwarding");
			await verboseExec("adb", ["-s", deviceId, "reverse", remote, local]);
		},

		async removeReverse(deviceId: string, remote: string): Promise<void> {
			if (deviceId.startsWith("avd:")) throw new Error("Device must be booted for port forwarding");
			await verboseExec("adb", ["-s", deviceId, "reverse", "--remove", remote]);
		},

		async listReverses(deviceId: string): Promise<PortMapping[]> {
			if (deviceId.startsWith("avd:")) throw new Error("Device must be booted for port forwarding");
			const { stdout } = await verboseExec("adb", ["-s", deviceId, "reverse", "--list"]);
			const mappings: PortMapping[] = [];
			for (const line of stdout.trim().split("\n")) {
				if (!line) continue;
				const parts = line.trim().split(/\s+/);
				if (parts.length >= 3) {
					mappings.push({ local: parts[1], remote: parts[2] });
				}
			}
			return mappings;
		},

		async setDisplaySize(deviceId: string, width: number, height: number): Promise<void> {
			if (deviceId.startsWith("avd:"))
				throw new Error("Device must be booted for display operations");
			await verboseExec("adb", ["-s", deviceId, "shell", "wm", "size", `${width}x${height}`]);
		},

		async resetDisplaySize(deviceId: string): Promise<void> {
			if (deviceId.startsWith("avd:"))
				throw new Error("Device must be booted for display operations");
			await verboseExec("adb", ["-s", deviceId, "shell", "wm", "size", "reset"]);
		},

		async setDisplayDensity(deviceId: string, dpi: number): Promise<void> {
			if (deviceId.startsWith("avd:"))
				throw new Error("Device must be booted for display operations");
			await verboseExec("adb", ["-s", deviceId, "shell", "wm", "density", String(dpi)]);
		},

		async resetDisplayDensity(deviceId: string): Promise<void> {
			if (deviceId.startsWith("avd:"))
				throw new Error("Device must be booted for display operations");
			await verboseExec("adb", ["-s", deviceId, "shell", "wm", "density", "reset"]);
		},

		async setBattery(
			deviceId: string,
			options: { level?: number; status?: number; ac?: boolean; usb?: boolean },
		): Promise<void> {
			if (deviceId.startsWith("avd:"))
				throw new Error("Device must be booted for battery simulation");
			if (options.level !== undefined) {
				await verboseExec("adb", [
					"-s",
					deviceId,
					"shell",
					"dumpsys",
					"battery",
					"set",
					"level",
					String(options.level),
				]);
			}
			if (options.status !== undefined) {
				await verboseExec("adb", [
					"-s",
					deviceId,
					"shell",
					"dumpsys",
					"battery",
					"set",
					"status",
					String(options.status),
				]);
			}
			if (options.ac !== undefined) {
				await verboseExec("adb", [
					"-s",
					deviceId,
					"shell",
					"dumpsys",
					"battery",
					"set",
					"ac",
					options.ac ? "1" : "0",
				]);
			}
			if (options.usb !== undefined) {
				await verboseExec("adb", [
					"-s",
					deviceId,
					"shell",
					"dumpsys",
					"battery",
					"set",
					"usb",
					options.usb ? "1" : "0",
				]);
			}
		},

		async unplugBattery(deviceId: string): Promise<void> {
			if (deviceId.startsWith("avd:"))
				throw new Error("Device must be booted for battery simulation");
			await verboseExec("adb", ["-s", deviceId, "shell", "dumpsys", "battery", "unplug"]);
		},

		async resetBattery(deviceId: string): Promise<void> {
			if (deviceId.startsWith("avd:"))
				throw new Error("Device must be booted for battery simulation");
			await verboseExec("adb", ["-s", deviceId, "shell", "dumpsys", "battery", "reset"]);
		},

		async inputTap(deviceId: string, x: number, y: number): Promise<void> {
			if (deviceId.startsWith("avd:")) throw new Error("Device must be booted for input injection");
			await verboseExec("adb", ["-s", deviceId, "shell", "input", "tap", String(x), String(y)]);
		},

		async inputSwipe(
			deviceId: string,
			x1: number,
			y1: number,
			x2: number,
			y2: number,
			durationMs?: number,
		): Promise<void> {
			if (deviceId.startsWith("avd:")) throw new Error("Device must be booted for input injection");
			const args = [
				"-s",
				deviceId,
				"shell",
				"input",
				"swipe",
				String(x1),
				String(y1),
				String(x2),
				String(y2),
			];
			if (durationMs !== undefined) args.push(String(durationMs));
			await verboseExec("adb", args);
		},

		async inputText(deviceId: string, text: string): Promise<void> {
			if (deviceId.startsWith("avd:")) throw new Error("Device must be booted for input injection");
			const escaped = text.replace(/ /g, "%s").replace(/[()&|;<>*~"'`]/g, (c) => `\\${c}`);
			await verboseExec("adb", ["-s", deviceId, "shell", "input", "text", escaped]);
		},

		async inputKeyEvent(deviceId: string, keyCode: number | string): Promise<void> {
			if (deviceId.startsWith("avd:")) throw new Error("Device must be booted for input injection");
			await verboseExec("adb", ["-s", deviceId, "shell", "input", "keyevent", String(keyCode)]);
		},

		async collectBugReport(deviceId: string, outputDir: string): Promise<BugReportResult> {
			if (deviceId.startsWith("avd:")) throw new Error("Device must be booted for bug reports");
			const dir = outputDir || join(homedir(), ".simvyn", "bug-reports");
			await mkdir(dir, { recursive: true });
			const filename = `bugreport-${deviceId}-${Date.now()}.zip`;
			const outputPath = join(dir, filename);
			await verboseExec("adb", ["-s", deviceId, "bugreport", outputPath], { timeout: 300_000 });
			const info = await stat(outputPath);
			return { path: outputPath, filename, size: info.size };
		},

		capabilities(): PlatformCapability[] {
			return [
				"setLocation",
				"screenshot",
				"screenRecord",
				"logs",
				"deepLinks",
				"appManagement",
				"addMedia",
				"clipboard",
				"settings",
				"accessibility",
				"fileSystem",
				"database",
				"portForward",
				"displayOverride",
				"batterySimulation",
				"inputInjection",
				"bugReport",
				"orientation",
			];
		},
	};
}
