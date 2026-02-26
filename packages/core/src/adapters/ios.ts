import { execFile } from "node:child_process";
import { promisify } from "node:util";
import type { Device, DeviceState, PlatformAdapter, PlatformCapability } from "@simvyn/types";

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
