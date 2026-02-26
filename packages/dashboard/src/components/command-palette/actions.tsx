import { Camera, Download, Eraser, Globe, Link, MapPin, Moon, Power, PowerOff } from "lucide-react";
import type { NavigateFunction } from "react-router";
import { toast } from "sonner";
import type { MultiStepAction } from "./types";

export function getActions(navigate: NavigateFunction): MultiStepAction[] {
	return [
		// --- Device actions ---
		{
			id: "boot-device",
			label: "Boot Device",
			description: "Start a shutdown device",
			icon: <Power size={18} />,
			steps: [
				{
					id: "pick-device",
					type: "device-select",
					label: "Select Device",
					multi: false,
					filter: (d) => d.state === "shutdown",
				},
			],
			execute: async (ctx) => {
				const deviceId = ctx.selectedDeviceIds[0];
				try {
					const res = await fetch("/api/modules/devices/boot", {
						method: "POST",
						headers: { "Content-Type": "application/json" },
						body: JSON.stringify({ deviceId }),
					});
					const name = ctx.selectedDeviceNames[0] ?? deviceId;
					if (res.ok) toast.success(`Booting ${name}`);
					else toast.error(`Boot failed for ${name}`);
				} catch {
					toast.error("Boot failed");
				}
			},
		},
		{
			id: "shutdown-device",
			label: "Shutdown Device",
			description: "Shut down a running device",
			icon: <PowerOff size={18} />,
			steps: [
				{
					id: "pick-device",
					type: "device-select",
					label: "Select Device",
					multi: false,
					filter: (d) => d.state === "booted",
				},
			],
			execute: async (ctx) => {
				const deviceId = ctx.selectedDeviceIds[0];
				try {
					const res = await fetch("/api/modules/devices/shutdown", {
						method: "POST",
						headers: { "Content-Type": "application/json" },
						body: JSON.stringify({ deviceId }),
					});
					const name = ctx.selectedDeviceNames[0] ?? deviceId;
					if (res.ok) toast.success(`Shutting down ${name}`);
					else toast.error(`Shutdown failed for ${name}`);
				} catch {
					toast.error("Shutdown failed");
				}
			},
		},
		{
			id: "erase-device",
			label: "Erase Device",
			description: "Erase all content and settings",
			icon: <Eraser size={18} />,
			steps: [
				{
					id: "pick-device",
					type: "device-select",
					label: "Select Device",
					multi: false,
					filter: (d) => d.platform === "ios",
				},
				{
					id: "confirm-erase",
					type: "confirm",
					label: "Confirm",
					message: (ctx) =>
						`This will erase all content and settings on ${ctx.selectedDeviceNames[0] ?? "this device"}. This cannot be undone.`,
					destructive: true,
				},
			],
			execute: async (ctx) => {
				const deviceId = ctx.selectedDeviceIds[0];
				try {
					const res = await fetch("/api/modules/devices/erase", {
						method: "POST",
						headers: { "Content-Type": "application/json" },
						body: JSON.stringify({ deviceId }),
					});
					if (res.ok) toast.success("Device erased");
					else toast.error("Erase failed");
				} catch {
					toast.error("Erase failed");
				}
			},
		},

		// --- Quick actions ---
		{
			id: "screenshot",
			label: "Take Screenshot",
			description: "Capture the current screen",
			icon: <Camera size={18} />,
			steps: [{ id: "pick-device", type: "device-select", label: "Select Device", multi: false }],
			execute: async (ctx) => {
				const deviceId = ctx.selectedDeviceIds[0];
				try {
					const res = await fetch(`/api/modules/screenshot/capture/${deviceId}`, {
						method: "POST",
					});
					if (res.ok) toast.success("Screenshot captured");
					else toast.error("Screenshot failed");
				} catch {
					toast.error("Screenshot failed");
				}
			},
		},
		{
			id: "toggle-dark-mode",
			label: "Toggle Dark Mode",
			description: "Switch appearance mode",
			icon: <Moon size={18} />,
			steps: [{ id: "pick-devices", type: "device-select", label: "Select Devices", multi: true }],
			execute: async (ctx) => {
				for (const deviceId of ctx.selectedDeviceIds) {
					try {
						const res = await fetch("/api/modules/settings/appearance", {
							method: "POST",
							headers: { "Content-Type": "application/json" },
							body: JSON.stringify({ deviceId, mode: "dark" }),
						});
						const name =
							ctx.selectedDeviceNames[ctx.selectedDeviceIds.indexOf(deviceId)] ?? deviceId;
						if (res.ok) toast.success(`Appearance toggled on ${name}`);
						else toast.error(`Toggle failed on ${name}`);
					} catch {
						toast.error("Toggle failed");
					}
				}
			},
		},
		{
			id: "set-locale",
			label: "Set Locale",
			description: "Change device language and region",
			icon: <Globe size={18} />,
			steps: [
				{ id: "pick-locale", type: "locale-select", label: "Select Locale" },
				{ id: "pick-devices", type: "device-select", label: "Select Devices", multi: true },
			],
			execute: async (ctx) => {
				const locale = ctx.params.locale as string;
				for (const deviceId of ctx.selectedDeviceIds) {
					try {
						const res = await fetch("/api/modules/settings/locale", {
							method: "POST",
							headers: { "Content-Type": "application/json" },
							body: JSON.stringify({ deviceId, locale }),
						});
						const name =
							ctx.selectedDeviceNames[ctx.selectedDeviceIds.indexOf(deviceId)] ?? deviceId;
						if (res.ok) toast.success(`Locale set to ${locale} on ${name}`);
						else toast.error(`Locale change failed on ${name}`);
					} catch {
						toast.error("Locale change failed");
					}
				}
			},
		},
		{
			id: "set-location",
			label: "Set Location",
			description: "Set GPS location on device",
			icon: <MapPin size={18} />,
			steps: [
				{ id: "pick-location", type: "location-select", label: "Select Location" },
				{ id: "pick-devices", type: "device-select", label: "Select Devices", multi: true },
			],
			execute: async (ctx) => {
				const location = ctx.params.location as { lat: number; lon: number; name: string };
				for (const deviceId of ctx.selectedDeviceIds) {
					try {
						const res = await fetch("/api/modules/location/set", {
							method: "POST",
							headers: { "Content-Type": "application/json" },
							body: JSON.stringify({ deviceId, lat: location.lat, lon: location.lon }),
						});
						const name =
							ctx.selectedDeviceNames[ctx.selectedDeviceIds.indexOf(deviceId)] ?? deviceId;
						if (res.ok) toast.success(`Location set to ${location.name} on ${name}`);
						else toast.error(`Location change failed on ${name}`);
					} catch {
						toast.error("Location change failed");
					}
				}
			},
		},

		// --- Navigation shortcuts ---
		{
			id: "open-deep-link",
			label: "Open Deep Link",
			description: "Go to deep links module",
			icon: <Link size={18} />,
			steps: [],
			execute: async () => {
				navigate("/deep-links");
			},
		},
		{
			id: "install-app",
			label: "Install App",
			description: "Go to app management module",
			icon: <Download size={18} />,
			steps: [],
			execute: async () => {
				navigate("/app-management");
			},
		},
	];
}
