import type { WebSocket } from "@fastify/websocket";
import type { WsEnvelope } from "@simvyn/types";
import fp from "fastify-plugin";
import type { FastifyInstance } from "fastify";

export type ChannelHandler = (type: string, payload: unknown, socket: WebSocket, requestId?: string) => void;

export interface WsBroker {
	registerChannel(channel: string, handler: ChannelHandler): void;
	broadcast(channel: string, type: string, payload: unknown): void;
	send(socket: WebSocket, channel: string, type: string, payload: unknown, requestId?: string): void;
}

declare module "fastify" {
	interface FastifyInstance {
		wsBroker: WsBroker;
	}
}

export const wsBrokerPlugin = fp(async function wsBroker(fastify: FastifyInstance) {
	// Placeholder — implemented in Task 2
}, { name: "ws-broker" });
