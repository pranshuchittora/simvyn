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

export interface PortMapping {
	local: string;
	remote: string;
}

export interface BugReportResult {
	path: string;
	filename: string;
	size: number;
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
	| "database"
	| "settings"
	| "accessibility"
	| "crashLogs"
	| "deviceLifecycle"
	| "keychain"
	| "portForward"
	| "displayOverride"
	| "batterySimulation"
	| "inputInjection"
	| "bugReport"
	| "orientation";

export interface CrashLogEntry {
	id: string;
	process: string;
	timestamp: string;
	path?: string;
	preview: string;
}

export interface DeviceType {
	identifier: string;
	name: string;
}

export interface SimRuntime {
	identifier: string;
	name: string;
	version: string;
	isAvailable: boolean;
}

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
	addMedia?(deviceId: string, filePath: string): Promise<void>;
	getClipboard?(deviceId: string): Promise<string>;
	setClipboard?(deviceId: string, text: string): Promise<void>;
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
	setAppearance?(deviceId: string, mode: "light" | "dark"): Promise<void>;
	setStatusBar?(deviceId: string, overrides: Record<string, string>): Promise<void>;
	clearStatusBar?(deviceId: string): Promise<void>;
	grantPermission?(deviceId: string, bundleId: string, permission: string): Promise<void>;
	revokePermission?(deviceId: string, bundleId: string, permission: string): Promise<void>;
	resetPermissions?(deviceId: string, bundleId: string): Promise<void>;
	setLocale?(deviceId: string, locale: string): Promise<void>;
	setContentSize?(deviceId: string, size: string): Promise<void>;
	setIncreaseContrast?(deviceId: string, enabled: boolean): Promise<void>;
	setTalkBack?(deviceId: string, enabled: boolean): Promise<void>;
	setOrientation?(deviceId: string, orientation: string): Promise<void>;
	listDeviceTypes?(): Promise<DeviceType[]>;
	listRuntimes?(): Promise<SimRuntime[]>;
	createDevice?(name: string, deviceTypeId: string, runtimeId?: string): Promise<string>;
	cloneDevice?(deviceId: string, newName: string): Promise<string>;
	renameDevice?(deviceId: string, newName: string): Promise<void>;
	deleteDevice?(deviceId: string): Promise<void>;
	addKeychainCert?(deviceId: string, certData: Buffer, isRoot: boolean): Promise<void>;
	resetKeychain?(deviceId: string): Promise<void>;
	addForward?(deviceId: string, local: string, remote: string): Promise<void>;
	removeForward?(deviceId: string, local: string): Promise<void>;
	listForwards?(deviceId: string): Promise<PortMapping[]>;
	addReverse?(deviceId: string, remote: string, local: string): Promise<void>;
	removeReverse?(deviceId: string, remote: string): Promise<void>;
	listReverses?(deviceId: string): Promise<PortMapping[]>;
	setDisplaySize?(deviceId: string, width: number, height: number): Promise<void>;
	resetDisplaySize?(deviceId: string): Promise<void>;
	setDisplayDensity?(deviceId: string, dpi: number): Promise<void>;
	resetDisplayDensity?(deviceId: string): Promise<void>;
	setBattery?(
		deviceId: string,
		options: { level?: number; status?: number; ac?: boolean; usb?: boolean },
	): Promise<void>;
	unplugBattery?(deviceId: string): Promise<void>;
	resetBattery?(deviceId: string): Promise<void>;
	inputTap?(deviceId: string, x: number, y: number): Promise<void>;
	inputSwipe?(
		deviceId: string,
		x1: number,
		y1: number,
		x2: number,
		y2: number,
		durationMs?: number,
	): Promise<void>;
	inputText?(deviceId: string, text: string): Promise<void>;
	inputKeyEvent?(deviceId: string, keyCode: number | string): Promise<void>;
	collectBugReport?(deviceId: string, outputDir: string): Promise<BugReportResult>;
	capabilities(): PlatformCapability[];
}
