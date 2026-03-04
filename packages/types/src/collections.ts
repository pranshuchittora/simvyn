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

export type DeviceStepStatus = "pending" | "running" | "success" | "failed" | "skipped";

export interface DeviceStepResult {
	deviceId: string;
	deviceName: string;
	status: DeviceStepStatus;
	error?: string;
	startedAt?: string;
	completedAt?: string;
}

export interface StepExecution {
	stepId: string;
	actionId: string;
	label: string;
	devices: DeviceStepResult[];
}

export interface ExecutionRun {
	runId: string;
	collectionId: string;
	collectionName: string;
	deviceIds: string[];
	status: "running" | "completed" | "failed" | "cancelled";
	startedAt: string;
	completedAt?: string;
	currentStepIndex: number;
	steps: StepExecution[];
}
