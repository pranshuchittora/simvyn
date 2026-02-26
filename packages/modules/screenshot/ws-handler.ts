import type {} from "@simvyn/server";
import type { FastifyInstance } from "fastify";
import { getActiveRecordings } from "./recorder.js";

export function registerScreenshotWsHandler(fastify: FastifyInstance) {
	const { wsBroker } = fastify;

	wsBroker.registerChannel("screenshot", (type, _payload, socket, requestId) => {
		if (type === "get-status") {
			const active = getActiveRecordings();
			wsBroker.send(socket, "screenshot", "recording-status", { recording: active }, requestId);
			return;
		}
	});
}
