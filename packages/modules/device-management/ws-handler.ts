import type { FastifyInstance } from "fastify";
import type { Device } from "@simvyn/types";
import type {} from "@simvyn/server";

export function registerDeviceWsHandler(fastify: FastifyInstance) {
	const { wsBroker, deviceManager } = fastify;

	wsBroker.registerChannel("devices", (type, _payload, socket, requestId) => {
		if (type === "list") {
			wsBroker.send(socket, "devices", "device-list", deviceManager.devices, requestId);
			return;
		}

		if (type === "refresh") {
			deviceManager.refresh().then((devices: Device[]) => {
				wsBroker.broadcast("devices", "device-list", devices);
			});
			return;
		}
	});

	const onDevicesChanged = (devices: Device[]) => {
		wsBroker.broadcast("devices", "device-list", devices);
	};

	deviceManager.on("devices-changed", onDevicesChanged);
}
