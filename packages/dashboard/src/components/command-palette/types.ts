import type { Device } from "@simvyn/types";

export type StepType =
	| "device-select"
	| "confirm"
	| "parameter"
	| "execute"
	| "locale-select"
	| "location-select";

export interface Step {
	id: string;
	type: StepType;
	label: string;
}

export interface DeviceSelectStep extends Step {
	type: "device-select";
	multi: boolean;
	filter?: (device: Device) => boolean;
}

export interface ConfirmStep extends Step {
	type: "confirm";
	message: string | ((ctx: StepContext) => string);
	destructive?: boolean;
}

export interface LocaleSelectStep extends Step {
	type: "locale-select";
}

export interface LocationSelectStep extends Step {
	type: "location-select";
}

export interface StepContext {
	selectedDeviceIds: string[];
	selectedDeviceNames: string[];
	params: Record<string, unknown>;
}

export type AnyStep = DeviceSelectStep | ConfirmStep | LocaleSelectStep | LocationSelectStep | Step;

export interface MultiStepAction {
	id: string;
	label: string;
	description: string;
	icon: React.ReactNode;
	steps: AnyStep[];
	execute: (context: StepContext) => Promise<void>;
}
