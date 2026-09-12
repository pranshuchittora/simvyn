import type { Device, SimvynModule } from "@simvyn/types";
import { locationRoutes } from "./routes.js";
import { registerLocationWsHandler } from "./ws-handler.js";

function resolveDevice(
	devices: Device[],
	selector: string,
): { device: Device } | { error: string } {
	const exactId = devices.find((d) => d.id === selector);
	if (exactId) return { device: exactId };

	const exactNameMatches = devices.filter((d) => d.name === selector);
	if (exactNameMatches.length === 1) return { device: exactNameMatches[0] };
	if (exactNameMatches.length > 1) {
		return { error: `Device name is ambiguous: ${selector}. Use the device ID.` };
	}

	const idPrefixMatches = devices.filter((d) => d.id.startsWith(selector));
	if (idPrefixMatches.length === 1) return { device: idPrefixMatches[0] };
	if (idPrefixMatches.length > 1) {
		return { error: `Device ID prefix is ambiguous: ${selector}. Use the full device ID.` };
	}

	const namePrefixMatches = devices.filter((d) => d.name.startsWith(selector));
	if (namePrefixMatches.length === 1) return { device: namePrefixMatches[0] };
	if (namePrefixMatches.length > 1) {
		return { error: `Device name prefix is ambiguous: ${selector}. Use the device ID.` };
	}

	return { error: `Device not found: ${selector}` };
}

function getLocationUnsupportedReason(device: Device): string | null {
	const isPhysical = device.deviceType === "Physical" || device.id.startsWith("physical:");
	if (!isPhysical) return null;

	if (device.platform === "android") {
		return "Location simulation is not available on physical Android devices. Simvyn uses adb emu geo fix, which only works with Android Emulators.";
	}

	return "Location simulation is not available on physical iOS devices. Use an iOS Simulator for simvyn location commands.";
}

function reportError(message: string): void {
	console.error(message);
	process.exitCode = 1;
}

const locationModule: SimvynModule = {
	name: "location",
	version: "0.1.0",
	description: "GPS location simulation with interactive map",
	icon: "map-pin",

	async register(fastify, _opts) {
		await fastify.register(locationRoutes);
		registerLocationWsHandler(fastify);
	},

	cli(program) {
		const location = program.command("location").description("GPS location commands");

		location
			.command("set <device> <lat> <lng>")
			.description("Set GPS coordinates on a device")
			.action(async (deviceId: string, latStr: string, lngStr: string) => {
				const lat = Number(latStr);
				const lng = Number(lngStr);
				if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
					reportError("Invalid coordinates: lat and lng must be finite numbers");
					return;
				}

				const { createAvailableAdapters, createDeviceManager } = await import("@simvyn/core");
				const adapters = await createAvailableAdapters();
				const dm = createDeviceManager(adapters);
				try {
					const devices = await dm.refresh();

					const resolved = resolveDevice(devices, deviceId);
					if ("error" in resolved) {
						reportError(resolved.error);
						return;
					}
					const target = resolved.device;

					const unsupportedReason = getLocationUnsupportedReason(target);
					if (unsupportedReason) {
						reportError(unsupportedReason);
						return;
					}

					const adapter = dm.getAdapter(target.platform);
					if (!adapter?.setLocation) {
						reportError(`Location not supported for ${target.platform}`);
						return;
					}

					await adapter.setLocation(target.id, lat, lng);
					console.log(`Set location on ${target.name}: ${lat}, ${lng}`);
				} catch (err) {
					reportError(`Failed to set location: ${(err as Error).message}`);
				} finally {
					dm.stop();
				}
			});

		location
			.command("route <device> <file>")
			.description("Simulate GPS route from GPX/KML file")
			.option("-s, --speed <ms>", "Speed in m/s", "10")
			.action(async (deviceId: string, filePath: string, opts: { speed: string }) => {
				const { readFile } = await import("node:fs/promises");
				const { createAvailableAdapters, createDeviceManager } = await import("@simvyn/core");
				const { detectFormat, parseRouteFile } = await import("./parse-route.js");
				const { cumulativeDistances, interpolateAlongRoute } = await import("./geo.js");

				const adapters = await createAvailableAdapters();
				const dm = createDeviceManager(adapters);
				try {
					const devices = await dm.refresh();

					const resolved = resolveDevice(devices, deviceId);
					if ("error" in resolved) {
						reportError(resolved.error);
						dm.stop();
						return;
					}
					const target = resolved.device;

					const unsupportedReason = getLocationUnsupportedReason(target);
					if (unsupportedReason) {
						reportError(unsupportedReason);
						dm.stop();
						return;
					}

					const adapter = dm.getAdapter(target.platform);
					if (!adapter?.setLocation) {
						reportError(`Location not supported for ${target.platform}`);
						dm.stop();
						return;
					}

					const content = await readFile(filePath, "utf-8");
					const waypoints = parseRouteFile(content, detectFormat(filePath));
					console.log(`Loaded ${waypoints.length} waypoints from ${filePath}`);

					const speedMs = Number(opts.speed) || 10;
					const distances = cumulativeDistances(waypoints);
					const totalDistance = distances[distances.length - 1];
					console.log(`Total distance: ${(totalDistance / 1000).toFixed(2)} km`);

					const startTime = Date.now();
					const tickInterval = setInterval(async () => {
						const elapsed = (Date.now() - startTime) / 1000;
						const traveled = elapsed * speedMs;
						const progress = Math.min(traveled / totalDistance, 1);
						const [lat, lon] = interpolateAlongRoute(waypoints, distances, traveled);

						try {
							await adapter.setLocation!(target.id, lat, lon);
						} catch (err) {
							clearInterval(tickInterval);
							reportError(`Failed to set route location: ${(err as Error).message}`);
							dm.stop();
							return;
						}

						process.stdout.write(
							`\rProgress: ${Math.round(progress * 100)}% — ${lat.toFixed(6)}, ${lon.toFixed(6)}`,
						);

						if (progress >= 1) {
							clearInterval(tickInterval);
							console.log("\nRoute complete");
							dm.stop();
						}
					}, 200);

					process.on("SIGINT", () => {
						clearInterval(tickInterval);
						console.log("\nPlayback stopped");
						dm.stop();
						process.exit(0);
					});
				} catch (err) {
					reportError(`Failed to start route playback: ${(err as Error).message}`);
					dm.stop();
				}
			});

		location
			.command("clear <device>")
			.description("Clear GPS override on a device")
			.action(async (deviceId: string) => {
				const { createAvailableAdapters, createDeviceManager } = await import("@simvyn/core");
				const adapters = await createAvailableAdapters();
				const dm = createDeviceManager(adapters);
				try {
					const devices = await dm.refresh();

					const resolved = resolveDevice(devices, deviceId);
					if ("error" in resolved) {
						reportError(resolved.error);
						return;
					}
					const target = resolved.device;

					const unsupportedReason = getLocationUnsupportedReason(target);
					if (unsupportedReason) {
						reportError(unsupportedReason);
						return;
					}

					const adapter = dm.getAdapter(target.platform);
					if (!adapter?.clearLocation) {
						reportError(`Clear location not supported for ${target.platform}`);
						return;
					}

					await adapter.clearLocation(target.id);
					console.log(`Cleared location on ${target.name}`);
				} catch (err) {
					reportError(`Failed to clear location: ${(err as Error).message}`);
				} finally {
					dm.stop();
				}
			});
	},

	capabilities: ["setLocation"],
};

export default locationModule;
