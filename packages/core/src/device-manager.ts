import { EventEmitter } from "node:events";
import type { Device, Platform, PlatformAdapter } from "@simvyn/types";

export interface DeviceManager {
	devices: Device[];
	pollInterval: number;
	start(): void;
	stop(): void;
	refresh(): Promise<Device[]>;
	setPollInterval(ms: number): void;
	on(event: "devices-changed", cb: (devices: Device[]) => void): void;
	on(event: "devices-disconnected", cb: (devices: Device[]) => void): void;
	off(event: "devices-changed", cb: (devices: Device[]) => void): void;
	off(event: "devices-disconnected", cb: (devices: Device[]) => void): void;
	getAdapter(platform: Platform): PlatformAdapter | undefined;
}

function sortDevices(devices: Device[]): Device[] {
	return devices.slice().sort((a, b) => {
		// booted first
		if (a.state === "booted" && b.state !== "booted") return -1;
		if (a.state !== "booted" && b.state === "booted") return 1;
		// then by platform
		if (a.platform < b.platform) return -1;
		if (a.platform > b.platform) return 1;
		// then by name
		return a.name.localeCompare(b.name);
	});
}

function devicesFingerprint(devices: Device[]): string {
	return JSON.stringify(devices.map((d) => `${d.id}:${d.state}`));
}

export function createDeviceManager(
	adapters: PlatformAdapter[],
	opts?: { pollInterval?: number },
): DeviceManager {
	const emitter = new EventEmitter();
	let currentPollInterval = opts?.pollInterval ?? 5000;
	let intervalId: ReturnType<typeof setInterval> | null = null;
	let currentDevices: Device[] = [];
	let lastFingerprint = "";

	async function poll(): Promise<Device[]> {
		const results = await Promise.all(adapters.map((a) => a.listDevices()));
		const allDevices = sortDevices(results.flat());
		const fp = devicesFingerprint(allDevices);

		if (fp !== lastFingerprint) {
			const currentIds = new Set(allDevices.map((d) => d.id));
			const disconnected = currentDevices.filter(
				(d) => d.deviceType === "Physical" && !currentIds.has(d.id),
			);

			lastFingerprint = fp;
			currentDevices = allDevices;
			emitter.emit("devices-changed", allDevices);

			if (disconnected.length > 0) {
				emitter.emit("devices-disconnected", disconnected);
			}
		}

		return allDevices;
	}

	return {
		get devices() {
			return currentDevices;
		},

		get pollInterval() {
			return currentPollInterval;
		},

		start() {
			if (intervalId) return;
			poll();
			intervalId = setInterval(poll, currentPollInterval);
		},

		stop() {
			if (intervalId) {
				clearInterval(intervalId);
				intervalId = null;
			}
		},

		setPollInterval(ms: number) {
			currentPollInterval = ms;
			if (intervalId) {
				clearInterval(intervalId);
				intervalId = setInterval(poll, currentPollInterval);
			}
		},

		async refresh(): Promise<Device[]> {
			return poll();
		},

		on(event: "devices-changed" | "devices-disconnected", cb: (devices: Device[]) => void) {
			emitter.on(event, cb);
		},

		off(event: "devices-changed" | "devices-disconnected", cb: (devices: Device[]) => void) {
			emitter.off(event, cb);
		},

		getAdapter(platform: Platform): PlatformAdapter | undefined {
			return adapters.find((a) => a.platform === platform);
		},
	};
}
