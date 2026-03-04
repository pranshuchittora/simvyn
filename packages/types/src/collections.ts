import type { PlatformAdapter } from "./device.js";

export type ActionParamType = "string" | "number" | "boolean" | "select";

export interface ActionParam {
	key: string;
	label: string;
	type: ActionParamType;
	required: boolean;
	options?: { label: string; value: string }[];
	placeholder?: string;
	defaultValue?: unknown;
}

export interface ActionDescriptor {
	id: string;
	label: string;
	description: string;
	module: string;
	params: ActionParam[];
	execute: (
		adapter: PlatformAdapter,
		deviceId: string,
		params: Record<string, unknown>,
	) => Promise<void>;
	isSupported: (adapter: PlatformAdapter) => boolean;
}

export interface CollectionStep {
	id: string;
	actionId: string;
	params: Record<string, unknown>;
	label?: string;
}

export interface Collection {
	id: string;
	name: string;
	description?: string;
	steps: CollectionStep[];
	schemaVersion: 1;
	createdAt: string;
	updatedAt: string;
}
