import type { Device } from "@simvyn/types";

export type StepType = "device-select" | "confirm" | "parameter" | "execute";

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

export interface StepContext {
	selectedDeviceIds: string[];
	selectedDeviceNames: string[];
	params: Record<string, unknown>;
}

export interface MultiStepAction {
	id: string;
	label: string;
	description: string;
	icon: React.ReactNode;
	steps: Step[];
	execute: (context: StepContext) => Promise<void>;
}
