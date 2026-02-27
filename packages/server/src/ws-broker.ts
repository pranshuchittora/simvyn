import type { WebSocket } from "@fastify/websocket";
import type { WsEnvelope } from "@simvyn/types";
import fp from "fastify-plugin";
import type { FastifyInstance } from "fastify";

export type ChannelHandler = (
	type: string,
	payload: unknown,
	socket: WebSocket,
	requestId?: string,
) => void;

export interface WsBroker {
	registerChannel(channel: string, handler: ChannelHandler): void;
	broadcast(channel: string, type: string, payload: unknown): void;
	send(
		socket: WebSocket,
		channel: string,
		type: string,
		payload: unknown,
		requestId?: string,
	): void;
	clients: Set<WebSocket>;
}

interface ClientState {
	subscriptions: Set<string>;
}

declare module "fastify" {
	interface FastifyInstance {
		wsBroker: WsBroker;
	}
}

function createEnvelope(
	channel: string,
	type: string,
	payload: unknown,
	requestId?: string,
): string {
	const envelope: WsEnvelope = { channel, type, payload };
	if (requestId) envelope.requestId = requestId;
	return JSON.stringify(envelope);
}

export const wsBrokerPlugin = fp(
	async function wsBroker(fastify: FastifyInstance) {
		const clients = new Set<WebSocket>();
		const clientState = new WeakMap<WebSocket, ClientState>();
		const channelHandlers = new Map<string, ChannelHandler>();

		function send(
			socket: WebSocket,
			channel: string,
			type: string,
			payload: unknown,
			requestId?: string,
		) {
			if (socket.readyState === socket.OPEN) {
				socket.send(createEnvelope(channel, type, payload, requestId));
			}
		}

		function broadcast(channel: string, type: string, payload: unknown) {
			const msg = createEnvelope(channel, type, payload);
			for (const client of clients) {
				const state = clientState.get(client);
				if (state?.subscriptions.has(channel) && client.readyState === client.OPEN) {
					client.send(msg);
				}
			}
		}

		function registerChannel(channel: string, handler: ChannelHandler) {
			channelHandlers.set(channel, handler);
			fastify.log.info({ channel }, "WS channel registered");
		}

		function handleMessage(socket: WebSocket, raw: string) {
			let envelope: WsEnvelope;
			try {
				envelope = JSON.parse(raw);
			} catch {
				send(socket, "system", "error", { message: "Invalid JSON" });
				return;
			}

			if (!envelope.channel || !envelope.type) {
				send(socket, "system", "error", { message: "Missing channel or type" }, envelope.requestId);
				return;
			}

			const state = clientState.get(socket);
			if (!state) return;

			if (envelope.channel === "system") {
				if (envelope.type === "ping") {
					send(socket, "system", "pong", {}, envelope.requestId);
					return;
				}
				if (envelope.type === "subscribe") {
					const ch = (envelope.payload as any)?.channel;
					if (typeof ch === "string") {
						state.subscriptions.add(ch);
						send(socket, "system", "subscribed", { channel: ch }, envelope.requestId);
					}
					return;
				}
				if (envelope.type === "unsubscribe") {
					const ch = (envelope.payload as any)?.channel;
					if (typeof ch === "string") {
						state.subscriptions.delete(ch);
						send(socket, "system", "unsubscribed", { channel: ch }, envelope.requestId);
					}
					return;
				}
			}

			const handler = channelHandlers.get(envelope.channel);
			if (handler) {
				handler(envelope.type, envelope.payload, socket, envelope.requestId);
			} else {
				send(
					socket,
					"system",
					"error",
					{ message: `Unknown channel: ${envelope.channel}` },
					envelope.requestId,
				);
			}
		}

		const broker: WsBroker = { registerChannel, broadcast, send, clients };
		fastify.decorate("wsBroker", broker);

		fastify.get("/ws", { websocket: true }, (socket, _req) => {
			clients.add(socket);
			clientState.set(socket, { subscriptions: new Set() });

			send(socket, "system", "connected", {
				serverVersion: "0.0.1",
				timestamp: Date.now(),
			});

			socket.on("message", (data: Buffer) => {
				handleMessage(socket, data.toString());
			});

			socket.on("close", () => {
				clients.delete(socket);
			});

			socket.on("error", (err: Error) => {
				fastify.log.warn({ err: err.message }, "WebSocket error");
				clients.delete(socket);
			});
		});
	},
	{ name: "ws-broker" },
);
