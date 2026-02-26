import type {} from "@simvyn/server";
import type { LogEntry } from "@simvyn/types";
import type { FastifyInstance } from "fastify";
import { getLogHistory } from "./ws-handler.js";

export async function logRoutes(fastify: FastifyInstance) {
	fastify.get<{ Params: { deviceId: string }; Querystring: { format?: string } }>(
		"/export/:deviceId",
		async (req, reply) => {
			const { deviceId } = req.params;
			const format = (req.query.format ?? "json") as string;
			const entries = getLogHistory(deviceId);

			if (format === "text") {
				reply.type("text/plain");
				return entries
					.map(
						(e: LogEntry) =>
							`[${e.timestamp}] [${e.level.toUpperCase().padEnd(7)}] ${e.processName}: ${e.message}`,
					)
					.join("\n");
			}

			return { deviceId, entries, count: entries.length };
		},
	);
}
