import { Camera, Eraser, MapPin, Moon, Trash2 } from "lucide-react";
import type { NavigateFunction } from "react-router";
import { toast } from "sonner";
import type { MultiStepAction } from "./types";

export function getActions(navigate: NavigateFunction): MultiStepAction[] {
	return [
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
		{
			id: "clear-logs",
			label: "Clear Logs",
			description: "Navigate to logs module",
			icon: <Trash2 size={18} />,
			steps: [],
			execute: async () => {
				navigate("/logs");
				toast.info("Navigated to logs");
			},
		},
		{
			id: "set-location",
			label: "Set Location",
			description: "Navigate to location module",
			icon: <MapPin size={18} />,
			steps: [],
			execute: async () => {
				navigate("/location");
			},
		},
	];
}
