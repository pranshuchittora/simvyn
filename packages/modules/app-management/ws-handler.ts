import type {} from "@simvyn/server";
import type { Device } from "@simvyn/types";
import type { FastifyInstance } from "fastify";

export function registerAppWsHandler(fastify: FastifyInstance) {
	const { wsBroker, deviceManager } = fastify;

	wsBroker.registerChannel("apps", (type, payload, socket, requestId) => {
		const data = payload as Record<string, string>;

		function findDevice(deviceId: string): Device | undefined {
			return deviceManager.devices.find((d: Device) => d.id === deviceId);
		}

		function sendError(message: string) {
			wsBroker.send(socket, "apps", "error", { message }, requestId);
		}

		if (type === "list-apps") {
			const device = findDevice(data.deviceId);
			if (!device) {
				sendError(`Device not found: ${data.deviceId}`);
				return;
			}
			if (device.state !== "booted") {
				sendError("Device must be booted");
				return;
			}

			const adapter = deviceManager.getAdapter(device.platform);
			if (!adapter?.listApps) {
				sendError("Not supported for this platform");
				return;
			}

			adapter
				.listApps(device.id)
				.then((apps) => {
					wsBroker.send(socket, "apps", "app-list", { deviceId: device.id, apps }, requestId);
				})
				.catch((err: Error) => {
					sendError(err.message);
				});
			return;
		}

		if (type === "install-app") {
			const device = findDevice(data.deviceId);
			if (!device) {
				sendError(`Device not found: ${data.deviceId}`);
				return;
			}
			if (device.state !== "booted") {
				sendError("Device must be booted");
				return;
			}

			const adapter = deviceManager.getAdapter(device.platform);
			if (!adapter?.installApp) {
				sendError("Not supported for this platform");
				return;
			}

			adapter
				.installApp(device.id, data.path)
				.then(() => {
					wsBroker.broadcast("apps", "app-installed", { deviceId: device.id, path: data.path });
				})
				.catch((err: Error) => {
					sendError(err.message);
				});
			return;
		}

		if (type === "uninstall-app") {
			const device = findDevice(data.deviceId);
			if (!device) {
				sendError(`Device not found: ${data.deviceId}`);
				return;
			}
			if (device.state !== "booted") {
				sendError("Device must be booted");
				return;
			}

			const adapter = deviceManager.getAdapter(device.platform);
			if (!adapter?.uninstallApp) {
				sendError("Not supported for this platform");
				return;
			}

			adapter
				.uninstallApp(device.id, data.bundleId)
				.then(() => {
					wsBroker.broadcast("apps", "app-uninstalled", {
						deviceId: device.id,
						bundleId: data.bundleId,
					});
				})
				.catch((err: Error) => {
					sendError(err.message);
				});
			return;
		}

		if (type === "launch-app") {
			const device = findDevice(data.deviceId);
			if (!device) {
				sendError(`Device not found: ${data.deviceId}`);
				return;
			}
			if (device.state !== "booted") {
				sendError("Device must be booted");
				return;
			}

			const adapter = deviceManager.getAdapter(device.platform);
			if (!adapter?.launchApp) {
				sendError("Not supported for this platform");
				return;
			}

			adapter
				.launchApp(device.id, data.bundleId)
				.then(() => {
					wsBroker.broadcast("apps", "app-launched", {
						deviceId: device.id,
						bundleId: data.bundleId,
					});
				})
				.catch((err: Error) => {
					sendError(err.message);
				});
			return;
		}

		if (type === "terminate-app") {
			const device = findDevice(data.deviceId);
			if (!device) {
				sendError(`Device not found: ${data.deviceId}`);
				return;
			}
			if (device.state !== "booted") {
				sendError("Device must be booted");
				return;
			}

			const adapter = deviceManager.getAdapter(device.platform);
			if (!adapter?.terminateApp) {
				sendError("Not supported for this platform");
				return;
			}

			adapter
				.terminateApp(device.id, data.bundleId)
				.then(() => {
					wsBroker.broadcast("apps", "app-terminated", {
						deviceId: device.id,
						bundleId: data.bundleId,
					});
				})
				.catch((err: Error) => {
					sendError(err.message);
				});
			return;
		}

		if (type === "clear-data") {
			const device = findDevice(data.deviceId);
			if (!device) {
				sendError(`Device not found: ${data.deviceId}`);
				return;
			}
			if (device.state !== "booted") {
				sendError("Device must be booted");
				return;
			}

			const adapter = deviceManager.getAdapter(device.platform);
			if (!adapter?.clearAppData) {
				sendError("Clear data not supported for this platform");
				return;
			}

			adapter
				.clearAppData(device.id, data.bundleId)
				.then(() => {
					wsBroker.broadcast("apps", "data-cleared", {
						deviceId: device.id,
						bundleId: data.bundleId,
					});
				})
				.catch((err: Error) => {
					sendError(err.message);
				});
			return;
		}
	});
}
