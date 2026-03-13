import type { ActionDescriptor } from "@simvyn/types";

export const actionRegistry: ActionDescriptor[] = [
	{
		id: "set-appearance",
		label: "Set Appearance",
		description: "Switch device between light and dark mode",
		module: "device-settings",
		params: [
			{
				key: "mode",
				label: "Mode",
				type: "select",
				required: true,
				options: [
					{ label: "Light", value: "light" },
					{ label: "Dark", value: "dark" },
				],
			},
		],
		async execute(adapter, deviceId, params) {
			await adapter.setAppearance!(deviceId, params.mode as "light" | "dark");
		},
		isSupported: (adapter) => !!adapter.setAppearance,
	},
	{
		id: "set-location",
		label: "Set Location",
		description: "Set the device GPS location to specific coordinates",
		module: "location",
		params: [
			{ key: "lat", label: "Latitude", type: "number", required: true, placeholder: "37.7749" },
			{ key: "lon", label: "Longitude", type: "number", required: true, placeholder: "-122.4194" },
		],
		async execute(adapter, deviceId, params) {
			await adapter.setLocation!(deviceId, params.lat as number, params.lon as number);
		},
		isSupported: (adapter) => !!adapter.setLocation,
	},
	{
		id: "clear-location",
		label: "Clear Location",
		description: "Reset the device GPS location to default",
		module: "location",
		params: [],
		async execute(adapter, deviceId) {
			await adapter.clearLocation!(deviceId);
		},
		isSupported: (adapter) => !!adapter.clearLocation,
	},
	{
		id: "set-clipboard",
		label: "Set Clipboard",
		description: "Set the device clipboard text content",
		module: "clipboard",
		params: [
			{
				key: "text",
				label: "Text",
				type: "string",
				required: true,
				placeholder: "Clipboard content",
			},
		],
		async execute(adapter, deviceId, params) {
			await adapter.setClipboard!(deviceId, params.text as string);
		},
		isSupported: (adapter) => !!adapter.setClipboard,
	},
	{
		id: "set-locale",
		label: "Set Locale",
		description: "Change the device locale and language setting",
		module: "device-settings",
		params: [
			{ key: "locale", label: "Locale", type: "string", required: true, placeholder: "en_US" },
		],
		async execute(adapter, deviceId, params) {
			await adapter.setLocale!(deviceId, params.locale as string);
		},
		isSupported: (adapter) => !!adapter.setLocale,
	},
	{
		id: "set-status-bar",
		label: "Set Status Bar",
		description: "Override status bar values (time, battery, signal, etc.)",
		module: "device-settings",
		params: [
			{
				key: "overrides",
				label: "Overrides",
				type: "string",
				required: true,
				placeholder: "JSON object",
			},
		],
		async execute(adapter, deviceId, params) {
			const overrides = JSON.parse(params.overrides as string) as Record<string, string>;
			await adapter.setStatusBar!(deviceId, overrides);
		},
		isSupported: (adapter) => !!adapter.setStatusBar,
	},
	{
		id: "clear-status-bar",
		label: "Clear Status Bar",
		description: "Reset status bar to default system values",
		module: "device-settings",
		params: [],
		async execute(adapter, deviceId) {
			await adapter.clearStatusBar!(deviceId);
		},
		isSupported: (adapter) => !!adapter.clearStatusBar,
	},
	{
		id: "grant-permission",
		label: "Grant Permission",
		description: "Grant a specific permission to an app",
		module: "device-settings",
		params: [
			{
				key: "bundleId",
				label: "Bundle ID",
				type: "string",
				required: true,
				placeholder: "com.example.app",
			},
			{
				key: "permission",
				label: "Permission",
				type: "string",
				required: true,
				placeholder: "camera",
			},
		],
		async execute(adapter, deviceId, params) {
			await adapter.grantPermission!(
				deviceId,
				params.bundleId as string,
				params.permission as string,
			);
		},
		isSupported: (adapter) => !!adapter.grantPermission,
	},
	{
		id: "open-deep-link",
		label: "Open Deep Link",
		description: "Open a URL or custom scheme on the device",
		module: "deep-links",
		params: [
			{
				key: "url",
				label: "URL",
				type: "string",
				required: true,
				placeholder: "https://example.com",
			},
		],
		async execute(adapter, deviceId, params) {
			await adapter.openUrl!(deviceId, params.url as string);
		},
		isSupported: (adapter) => !!adapter.openUrl,
	},
	{
		id: "add-media",
		label: "Add Media",
		description: "Add a photo or video file to the device media library",
		module: "media",
		params: [
			{
				key: "filePath",
				label: "File Path",
				type: "string",
				required: true,
				placeholder: "/path/to/image.png",
			},
		],
		async execute(adapter, deviceId, params) {
			await adapter.addMedia!(deviceId, params.filePath as string);
		},
		isSupported: (adapter) => !!adapter.addMedia,
	},
	{
		id: "launch-app",
		label: "Launch App",
		description: "Launch an installed application on the device",
		module: "app-management",
		params: [
			{
				key: "bundleId",
				label: "Bundle ID",
				type: "string",
				required: true,
				placeholder: "com.example.app",
			},
		],
		async execute(adapter, deviceId, params) {
			await adapter.launchApp!(deviceId, params.bundleId as string);
		},
		isSupported: (adapter) => !!adapter.launchApp,
	},
	{
		id: "terminate-app",
		label: "Terminate App",
		description: "Force-stop a running application on the device",
		module: "app-management",
		params: [
			{
				key: "bundleId",
				label: "Bundle ID",
				type: "string",
				required: true,
				placeholder: "com.example.app",
			},
		],
		async execute(adapter, deviceId, params) {
			await adapter.terminateApp!(deviceId, params.bundleId as string);
		},
		isSupported: (adapter) => !!adapter.terminateApp,
	},
	{
		id: "set-content-size",
		label: "Set Content Size",
		description: "Change the dynamic type / content size category",
		module: "device-settings",
		params: [
			{
				key: "size",
				label: "Size",
				type: "select",
				required: true,
				options: [
					{ label: "Extra Small", value: "xSmall" },
					{ label: "Small", value: "small" },
					{ label: "Medium", value: "medium" },
					{ label: "Large", value: "large" },
					{ label: "Extra Large", value: "xLarge" },
					{ label: "XX Large", value: "xxLarge" },
					{ label: "XXX Large", value: "xxxLarge" },
				],
			},
		],
		async execute(adapter, deviceId, params) {
			await adapter.setContentSize!(deviceId, params.size as string);
		},
		isSupported: (adapter) => !!adapter.setContentSize,
	},
	{
		id: "set-increase-contrast",
		label: "Set Increase Contrast",
		description: "Toggle the increase contrast accessibility setting",
		module: "device-settings",
		params: [
			{ key: "enabled", label: "Enabled", type: "boolean", required: true, defaultValue: true },
		],
		async execute(adapter, deviceId, params) {
			await adapter.setIncreaseContrast!(deviceId, params.enabled as boolean);
		},
		isSupported: (adapter) => !!adapter.setIncreaseContrast,
	},
	{
		id: "set-orientation",
		label: "Set Orientation",
		description: "Rotate the device to a specific orientation (Android only)",
		module: "device-settings",
		params: [
			{
				key: "orientation",
				label: "Orientation",
				type: "select",
				required: true,
				options: [
					{ label: "Portrait", value: "portrait" },
					{ label: "Landscape Left", value: "landscape-left" },
					{ label: "Landscape Right", value: "landscape-right" },
					{ label: "Portrait Upside Down", value: "portrait-upside-down" },
				],
			},
		],
		async execute(adapter, deviceId, params) {
			await adapter.setOrientation!(deviceId, params.orientation as string);
		},
		isSupported: (adapter) => !!adapter.setOrientation,
	},
	{
		id: "boot-device",
		label: "Boot Device",
		description: "Start a shutdown device",
		module: "device-management",
		params: [],
		async execute(adapter, deviceId) {
			await adapter.boot(deviceId);
		},
		isSupported: () => true,
	},
	{
		id: "shutdown-device",
		label: "Shutdown Device",
		description: "Shut down a running device",
		module: "device-management",
		params: [],
		async execute(adapter, deviceId) {
			await adapter.shutdown(deviceId);
		},
		isSupported: () => true,
	},
	{
		id: "restart-device",
		label: "Restart Device",
		description: "Shutdown and reboot the device",
		module: "device-management",
		params: [],
		async execute(adapter, deviceId) {
			await adapter.shutdown(deviceId);
			await adapter.boot(deviceId);
		},
		isSupported: () => true,
	},
	{
		id: "erase-device",
		label: "Erase Device",
		description: "Erase all content and settings on the device",
		module: "device-management",
		params: [],
		async execute(adapter, deviceId) {
			await adapter.erase!(deviceId);
		},
		isSupported: (adapter) => !!adapter.erase,
	},
];

export function getActionDescriptors(): ActionDescriptor[] {
	return actionRegistry;
}
