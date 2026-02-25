export type Platform = "ios" | "android";

export type DeviceState = "booted" | "shutdown" | "creating" | "shutting-down";

export interface Device {
	id: string;
	name: string;
	platform: Platform;
	state: DeviceState;
	osVersion: string;
	deviceType: string;
	isAvailable: boolean;
}

export type PlatformCapability =
	| "setLocation"
	| "push"
	| "screenshot"
	| "screenRecord"
	| "erase"
	| "statusBar"
	| "privacy"
	| "ui"
	| "clipboard"
	| "addMedia"
	| "logs"
	| "deepLinks"
	| "appManagement";

export interface PlatformAdapter {
	platform: Platform;
	isAvailable(): Promise<boolean>;
	listDevices(): Promise<Device[]>;
	boot(id: string): Promise<void>;
	shutdown(id: string): Promise<void>;
	erase?(id: string): Promise<void>;
	capabilities(): PlatformCapability[];
}
