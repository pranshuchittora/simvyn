import { execFile, spawn } from "node:child_process";
import { promisify } from "node:util";
import type { Device, PlatformAdapter, PlatformCapability } from "@simvyn/types";

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

		capabilities(): PlatformCapability[] {
			return [
				"setLocation",
				"screenshot",
				"screenRecord",
				"logs",
				"deepLinks",
				"appManagement",
				"addMedia",
			];
		},
	};
}
