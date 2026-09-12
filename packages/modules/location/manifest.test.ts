import assert from "node:assert/strict";
import { afterEach, beforeEach, describe, it, mock } from "node:test";
import type { Device } from "@simvyn/types";
import { Command } from "commander";

let devices: Device[] = [];
let stoppedCount = 0;
const setLocationCalls: Array<{ deviceId: string; lat: number; lon: number }> = [];
const clearLocationCalls: string[] = [];

const androidAdapter = {
	platform: "android",
	setLocation: async (deviceId: string, lat: number, lon: number) => {
		setLocationCalls.push({ deviceId, lat, lon });
	},
	clearLocation: async (deviceId: string) => {
		clearLocationCalls.push(deviceId);
	},
};

mock.module("@simvyn/core", {
	namedExports: {
		createAvailableAdapters: async () => [androidAdapter],
		createModuleStorage: () => ({
			read: async () => null,
			write: async () => {},
		}),
		createDeviceManager: () => ({
			refresh: async () => devices,
			getAdapter: (platform: string) => (platform === "android" ? androidAdapter : undefined),
			stop: () => {
				stoppedCount += 1;
			},
		}),
	},
});

const { default: locationModule } = await import("./manifest.ts");

function createProgram(): Command {
	const program = new Command();
	program.exitOverride();
	locationModule.cli(program);
	return program;
}

function androidDevice(overrides: Partial<Device>): Device {
	return {
		id: "emulator-5554",
		name: "Pixel",
		platform: "android",
		state: "booted",
		osVersion: "Android 16",
		deviceType: "Emulator",
		isAvailable: true,
		...overrides,
	};
}

describe("location CLI", () => {
	const originalError = console.error;
	const originalLog = console.log;
	const originalExitCode = process.exitCode;
	let errors: string[] = [];
	let logs: string[] = [];

	beforeEach(() => {
		devices = [];
		stoppedCount = 0;
		setLocationCalls.length = 0;
		clearLocationCalls.length = 0;
		errors = [];
		logs = [];
		process.exitCode = undefined;
		console.error = (...args: unknown[]) => {
			errors.push(args.join(" "));
		};
		console.log = (...args: unknown[]) => {
			logs.push(args.join(" "));
		};
	});

	afterEach(() => {
		console.error = originalError;
		console.log = originalLog;
		process.exitCode = originalExitCode;
	});

	it("prints a clean unsupported message for physical Android devices selected by display name", async () => {
		devices = [
			androidDevice({
				id: "QO49VW8PFAA6JJPJ",
				name: "2510DRA23G",
				deviceType: "Physical",
				osVersion: "Android 15",
			}),
		];

		await createProgram().parseAsync(["location", "set", "2510DRA23G", "42", "44"], {
			from: "user",
		});

		assert.equal(process.exitCode, 1);
		assert.deepEqual(setLocationCalls, []);
		assert.equal(stoppedCount, 1);
		assert.match(errors.join("\n"), /physical Android devices/);
		assert.doesNotMatch(errors.join("\n"), /at Object\.setLocation/);
	});

	it("sets emulator location when selected by ID prefix", async () => {
		devices = [androidDevice({ id: "emulator-5554", name: "Medium_Phone_-_API_36.1" })];

		await createProgram().parseAsync(["location", "set", "emulator", "40", "50"], {
			from: "user",
		});

		assert.equal(process.exitCode, undefined);
		assert.deepEqual(setLocationCalls, [{ deviceId: "emulator-5554", lat: 40, lon: 50 }]);
		assert.equal(logs[0], "Set location on Medium_Phone_-_API_36.1: 40, 50");
		assert.equal(stoppedCount, 1);
	});
});
