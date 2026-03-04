import type {} from "@simvyn/server";
import type { FastifyInstance } from "fastify";

export function registerCollectionsWsHandler(fastify: FastifyInstance) {
	const { wsBroker } = fastify;

	wsBroker.registerChannel("collections", (type, payload, socket, requestId) => {
		if (type === "cancel") {
			const { runId } = payload as any;
			wsBroker.send(
				socket,
				"collections",
				"cancel-ack",
				{ runId, message: "Cancel not yet implemented" },
				requestId,
			);
			return;
		}
	});
}
