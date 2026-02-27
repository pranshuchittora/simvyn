import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { Device, PlatformAdapter } from "@simvyn/types";
import { createDeviceManager } from "../device-manager.ts";

function makeMockAdapter(platform: "ios" | "android", devices: Device[] = []): PlatformAdapter {
	return {
		platform,
		isAvailable: async () => true,
		listDevices: async () => devices,
		boot: async () => {},
		shutdown: async () => {},
		capabilities: () => [],
	};
}

function makeDevice(overrides: Partial<Device> & { id: string; name: string }): Device {
	return {
		platform: "ios",
		state: "shutdown",
		osVersion: "17.0",
		deviceType: "iPhone 15",
		isAvailable: true,
		...overrides,
	};
}

describe("createDeviceManager", () => {
	it("creates a manager with empty devices", () => {
		const dm = createDeviceManager([]);
		assert.deepStrictEqual(dm.devices, []);
	});

	it("uses default poll interval of 5000ms", () => {
		const dm = createDeviceManager([]);
		assert.equal(dm.pollInterval, 5000);
	});

	it("accepts custom poll interval", () => {
		const dm = createDeviceManager([], { pollInterval: 2000 });
		assert.equal(dm.pollInterval, 2000);
	});
});

describe("refresh", () => {
	it("calls all adapter listDevices and returns merged sorted list", async () => {
		const iosDevice = makeDevice({
			id: "ios-1",
			name: "iPhone 15",
			platform: "ios",
			state: "booted",
		});
		const androidDevice = makeDevice({
			id: "android-1",
			name: "Pixel 7",
			platform: "android",
			state: "booted",
		});

		const iosAdapter = makeMockAdapter("ios", [iosDevice]);
		const androidAdapter = makeMockAdapter("android", [androidDevice]);
		const dm = createDeviceManager([iosAdapter, androidAdapter]);

		const result = await dm.refresh();
		assert.equal(result.length, 2);
		// android < ios alphabetically, both booted
		assert.equal(result[0].platform, "android");
		assert.equal(result[1].platform, "ios");
	});

	it("updates dm.devices after refresh", async () => {
		const device = makeDevice({ id: "d1", name: "Test", state: "booted" });
		const adapter = makeMockAdapter("ios", [device]);
		const dm = createDeviceManager([adapter]);

		assert.deepStrictEqual(dm.devices, []);
		await dm.refresh();
		assert.equal(dm.devices.length, 1);
		assert.equal(dm.devices[0].id, "d1");
	});
});

describe("sorting", () => {
	it("sorts booted devices first", async () => {
		const booted = makeDevice({
			id: "b",
			name: "Booted",
			state: "booted",
			platform: "ios",
		});
		const shutdown = makeDevice({
			id: "s",
			name: "Shutdown",
			state: "shutdown",
			platform: "ios",
		});
		const adapter = makeMockAdapter("ios", [shutdown, booted]);
		const dm = createDeviceManager([adapter]);

		const result = await dm.refresh();
		assert.equal(result[0].state, "booted");
		assert.equal(result[1].state, "shutdown");
	});

	it("sorts by platform (android < ios) within same state", async () => {
		const ios = makeDevice({
			id: "i",
			name: "iPhone",
			platform: "ios",
			state: "booted",
		});
		const android = makeDevice({
			id: "a",
			name: "Pixel",
			platform: "android",
			state: "booted",
		});
		const iosAdapter = makeMockAdapter("ios", [ios]);
		const androidAdapter = makeMockAdapter("android", [android]);
		const dm = createDeviceManager([iosAdapter, androidAdapter]);

		const result = await dm.refresh();
		assert.equal(result[0].platform, "android");
		assert.equal(result[1].platform, "ios");
	});

	it("sorts by name alphabetically within same state and platform", async () => {
		const devB = makeDevice({
			id: "b",
			name: "Zeta",
			platform: "ios",
			state: "booted",
		});
		const devA = makeDevice({
			id: "a",
			name: "Alpha",
			platform: "ios",
			state: "booted",
		});
		const adapter = makeMockAdapter("ios", [devB, devA]);
		const dm = createDeviceManager([adapter]);

		const result = await dm.refresh();
		assert.equal(result[0].name, "Alpha");
		assert.equal(result[1].name, "Zeta");
	});
});

describe("fingerprinting and change detection", () => {
	it("emits devices-changed on first refresh", async () => {
		const device = makeDevice({ id: "d1", name: "Test", state: "booted" });
		const adapter = makeMockAdapter("ios", [device]);
		const dm = createDeviceManager([adapter]);

		let emitted = false;
		dm.on("devices-changed", () => {
			emitted = true;
		});
		await dm.refresh();
		assert.equal(emitted, true);
	});

	it("does NOT emit devices-changed when device list is identical", async () => {
		const device = makeDevice({ id: "d1", name: "Test", state: "booted" });
		const adapter = makeMockAdapter("ios", [device]);
		const dm = createDeviceManager([adapter]);

		await dm.refresh();
		let emitCount = 0;
		dm.on("devices-changed", () => {
			emitCount++;
		});
		await dm.refresh();
		assert.equal(emitCount, 0);
	});

	it("emits devices-changed when device state changes", async () => {
		const devices = [makeDevice({ id: "d1", name: "Test", state: "booted" })];
		const adapter = makeMockAdapter("ios", devices);
		const dm = createDeviceManager([adapter]);

		await dm.refresh();
		let emitted = false;
		dm.on("devices-changed", () => {
			emitted = true;
		});

		// Mutate device state
		devices[0] = makeDevice({ id: "d1", name: "Test", state: "shutdown" });
		(adapter as any).listDevices = async () => devices;

		await dm.refresh();
		assert.equal(emitted, true);
	});

	it("emits devices-changed when a new device appears", async () => {
		let devices = [makeDevice({ id: "d1", name: "Test", state: "booted" })];
		const adapter: PlatformAdapter = {
			...makeMockAdapter("ios"),
			listDevices: async () => devices,
		};
		const dm = createDeviceManager([adapter]);

		await dm.refresh();
		let emitted = false;
		dm.on("devices-changed", () => {
			emitted = true;
		});

		devices = [
			makeDevice({ id: "d1", name: "Test", state: "booted" }),
			makeDevice({ id: "d2", name: "New", state: "shutdown" }),
		];

		await dm.refresh();
		assert.equal(emitted, true);
	});
});

describe("start and stop", () => {
	it("start triggers an immediate poll", async () => {
		const device = makeDevice({ id: "d1", name: "Test", state: "booted" });
		const adapter = makeMockAdapter("ios", [device]);
		const dm = createDeviceManager([adapter], { pollInterval: 100_000 });

		let emitted = false;
		dm.on("devices-changed", () => {
			emitted = true;
		});
		dm.start();

		// Give the async poll a tick to resolve
		await new Promise((r) => setTimeout(r, 50));
		assert.equal(emitted, true);
		dm.stop();
	});

	it("stop clears the interval (no more polls)", async () => {
		let callCount = 0;
		const adapter: PlatformAdapter = {
			...makeMockAdapter("ios"),
			listDevices: async () => {
				callCount++;
				return [
					makeDevice({
						id: `d-${callCount}`,
						name: `D${callCount}`,
						state: "booted",
					}),
				];
			},
		};
		const dm = createDeviceManager([adapter], { pollInterval: 30 });
		dm.start();
		await new Promise((r) => setTimeout(r, 50));
		dm.stop();
		const countAtStop = callCount;
		await new Promise((r) => setTimeout(r, 100));
		// Should not have increased significantly after stop
		assert.ok(
			callCount - countAtStop <= 1,
			`Expected no more polls after stop, but got ${callCount - countAtStop} extra`,
		);
	});

	it("start is idempotent (calling twice does not create duplicate intervals)", async () => {
		let callCount = 0;
		const adapter: PlatformAdapter = {
			...makeMockAdapter("ios"),
			listDevices: async () => {
				callCount++;
				return [];
			},
		};
		const dm = createDeviceManager([adapter], { pollInterval: 30 });
		dm.start();
		dm.start(); // second call should be no-op
		await new Promise((r) => setTimeout(r, 100));
		dm.stop();
		// With 30ms interval over 100ms, we'd expect ~3-4 calls for one interval
		// With two intervals it would be ~6-8. Generous bound:
		assert.ok(
			callCount < 8,
			`Expected single interval, got ${callCount} calls suggesting duplicate`,
		);
	});
});

describe("setPollInterval", () => {
	it("changes the poll interval value", () => {
		const dm = createDeviceManager([], { pollInterval: 5000 });
		dm.setPollInterval(1000);
		assert.equal(dm.pollInterval, 1000);
	});

	it("restarts interval when already started", async () => {
		let callCount = 0;
		const adapter: PlatformAdapter = {
			...makeMockAdapter("ios"),
			listDevices: async () => {
				callCount++;
				return [];
			},
		};
		const dm = createDeviceManager([adapter], { pollInterval: 500_000 });
		dm.start();
		await new Promise((r) => setTimeout(r, 50));
		const beforeChange = callCount;
		dm.setPollInterval(20);
		await new Promise((r) => setTimeout(r, 100));
		dm.stop();
		assert.ok(
			callCount > beforeChange,
			"Expected new polls after setPollInterval with shorter interval",
		);
	});
});

describe("getAdapter", () => {
	it("returns the correct adapter for a platform", () => {
		const iosAdapter = makeMockAdapter("ios");
		const androidAdapter = makeMockAdapter("android");
		const dm = createDeviceManager([iosAdapter, androidAdapter]);

		assert.equal(dm.getAdapter("ios"), iosAdapter);
		assert.equal(dm.getAdapter("android"), androidAdapter);
	});

	it("returns undefined for missing platform", () => {
		const iosAdapter = makeMockAdapter("ios");
		const dm = createDeviceManager([iosAdapter]);
		assert.equal(dm.getAdapter("android"), undefined);
	});
});

describe("event emission (on/off)", () => {
	it("on registers a listener that receives sorted device array", async () => {
		const devices = [
			makeDevice({ id: "z", name: "Zeta", platform: "ios", state: "shutdown" }),
			makeDevice({ id: "a", name: "Alpha", platform: "ios", state: "booted" }),
		];
		const adapter = makeMockAdapter("ios", devices);
		const dm = createDeviceManager([adapter]);

		let received: Device[] = [];
		dm.on("devices-changed", (devs) => {
			received = devs;
		});
		await dm.refresh();

		assert.equal(received.length, 2);
		assert.equal(received[0].name, "Alpha"); // booted first
		assert.equal(received[1].name, "Zeta");
	});

	it("off removes a listener", async () => {
		const device = makeDevice({ id: "d1", name: "Test", state: "booted" });
		let devices = [device];
		const adapter: PlatformAdapter = {
			...makeMockAdapter("ios"),
			listDevices: async () => devices,
		};
		const dm = createDeviceManager([adapter]);

		let callCount = 0;
		const cb = () => {
			callCount++;
		};
		dm.on("devices-changed", cb);
		await dm.refresh();
		assert.equal(callCount, 1);

		dm.off("devices-changed", cb);
		devices = [makeDevice({ id: "d2", name: "New", state: "booted" })];
		await dm.refresh();
		assert.equal(callCount, 1); // should not have incremented
	});
});
