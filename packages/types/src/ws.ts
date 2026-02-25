import type { Device } from "./device.js";

export interface WsEnvelope {
	channel: string;
	type: string;
	payload: unknown;
	requestId?: string;
}

export type WsServerMessage = WsEnvelope & { channel: string };

export type WsClientMessage = WsEnvelope & { channel: string };

export type DeviceChannel =
	| { type: "device-list"; payload: Device[] }
	| { type: "device-updated"; payload: Device }
	| { type: "subscribe" }
	| { type: "unsubscribe" };
