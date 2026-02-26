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
	| "appManagement"
	| "fileSystem"
	| "database";

export interface AppInfo {
	bundleId: string;
	name: string;
	version: string;
	type: "user" | "system";
	dataContainer?: string;
	appPath?: string;
}

export type LogLevel = "verbose" | "debug" | "info" | "warning" | "error" | "fatal";

export interface LogEntry {
	timestamp: string;
	level: LogLevel;
	message: string;
	processName: string;
	pid: number;
	subsystem?: string;
	category?: string;
}

export interface PlatformAdapter {
	platform: Platform;
	isAvailable(): Promise<boolean>;
	listDevices(): Promise<Device[]>;
	boot(id: string): Promise<void>;
	shutdown(id: string): Promise<void>;
	erase?(id: string): Promise<void>;
	setLocation?(deviceId: string, lat: number, lon: number): Promise<void>;
	clearLocation?(deviceId: string): Promise<void>;
	listApps?(deviceId: string): Promise<AppInfo[]>;
	installApp?(deviceId: string, appPath: string): Promise<void>;
	uninstallApp?(deviceId: string, bundleId: string): Promise<void>;
	launchApp?(deviceId: string, bundleId: string): Promise<void>;
	terminateApp?(deviceId: string, bundleId: string): Promise<void>;
	getAppInfo?(deviceId: string, bundleId: string): Promise<AppInfo | null>;
	clearAppData?(deviceId: string, bundleId: string): Promise<void>;
	openUrl?(deviceId: string, url: string): Promise<void>;
	screenshot?(deviceId: string, outputPath: string): Promise<void>;
	startRecording?(
		deviceId: string,
		outputPath: string,
	): Promise<import("node:child_process").ChildProcess>;
	stopRecording?(
		process: import("node:child_process").ChildProcess,
		deviceId: string,
		outputPath: string,
	): Promise<void>;
	capabilities(): PlatformCapability[];
}
