import type { SimvynModule } from "@simvyn/types";
import { locationRoutes } from "./routes.js";
import { registerLocationWsHandler } from "./ws-handler.js";

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
					console.error("Invalid coordinates: lat and lng must be finite numbers");
					process.exit(1);
				}

				const { createAvailableAdapters, createDeviceManager } = await import("@simvyn/core");
				const adapters = await createAvailableAdapters();
				const dm = createDeviceManager(adapters);
				const devices = await dm.refresh();

				const target = devices.find((d) => d.id === deviceId || d.id.startsWith(deviceId));
				if (!target) {
					console.error(`Device not found: ${deviceId}`);
					process.exit(1);
				}

				const adapter = dm.getAdapter(target.platform);
				if (!adapter?.setLocation) {
					console.error(`Location not supported for ${target.platform}`);
					process.exit(1);
				}

				await adapter.setLocation(target.id, lat, lng);
				console.log(`Set location on ${target.name}: ${lat}, ${lng}`);
				dm.stop();
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
				const devices = await dm.refresh();

				const target = devices.find((d) => d.id === deviceId || d.id.startsWith(deviceId));
				if (!target) {
					console.error(`Device not found: ${deviceId}`);
					dm.stop();
					process.exit(1);
				}

				const adapter = dm.getAdapter(target.platform);
				if (!adapter?.setLocation) {
					console.error(`Location not supported for ${target.platform}`);
					dm.stop();
					process.exit(1);
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

					await adapter.setLocation!(target.id, lat, lon);
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
			});

		location
			.command("clear <device>")
			.description("Clear GPS override on a device")
			.action(async (deviceId: string) => {
				const { createAvailableAdapters, createDeviceManager } = await import("@simvyn/core");
				const adapters = await createAvailableAdapters();
				const dm = createDeviceManager(adapters);
				const devices = await dm.refresh();

				const target = devices.find((d) => d.id === deviceId || d.id.startsWith(deviceId));
				if (!target) {
					console.error(`Device not found: ${deviceId}`);
					process.exit(1);
				}

				const adapter = dm.getAdapter(target.platform);
				if (!adapter?.clearLocation) {
					console.error(`Clear location not supported for ${target.platform}`);
					process.exit(1);
				}

				await adapter.clearLocation(target.id);
				console.log(`Cleared location on ${target.name}`);
				dm.stop();
			});
	},

	capabilities: ["setLocation"],
};

export default locationModule;
