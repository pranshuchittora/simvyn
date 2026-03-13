import {
	Camera,
	CopyPlus,
	Download,
	Eraser,
	Globe,
	Layers,
	Link,
	MapPin,
	Moon,
	Pencil,
	Plus,
	Power,
	PowerOff,
	RotateCw,
	Trash2,
} from "lucide-react";
import type { NavigateFunction } from "react-router";
import { toast } from "sonner";
import type { MultiStepAction } from "./types";

interface CollectionRef {
	id: string;
	name: string;
	steps: { actionId: string }[];
}

export function getActions(
	navigate: NavigateFunction,
	collections?: CollectionRef[],
): MultiStepAction[] {
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
						const res = await fetch("/api/modules/device-settings/appearance", {
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
						const res = await fetch("/api/modules/device-settings/locale", {
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
			id: "set-orientation",
			label: "Set Orientation",
			description: "Rotate device orientation (Android)",
			icon: <RotateCw size={18} />,
			steps: [
				{
					id: "pick-orientation",
					type: "parameter",
					label: "Orientation",
					placeholder: "portrait, landscape-left, landscape-right, portrait-upside-down",
					paramKey: "orientation",
				},
				{
					id: "pick-devices",
					type: "device-select",
					label: "Select Devices",
					multi: true,
					filter: (d) => d.platform === "android" && d.state === "booted",
				},
			],
			execute: async (ctx) => {
				const orientation = ctx.params.orientation as string;
				for (const deviceId of ctx.selectedDeviceIds) {
					try {
						const res = await fetch("/api/modules/device-settings/orientation", {
							method: "POST",
							headers: { "Content-Type": "application/json" },
							body: JSON.stringify({ deviceId, orientation }),
						});
						const name =
							ctx.selectedDeviceNames[ctx.selectedDeviceIds.indexOf(deviceId)] ?? deviceId;
						if (res.ok) toast.success(`Orientation set to ${orientation} on ${name}`);
						else toast.error(`Orientation change failed on ${name}`);
					} catch {
						toast.error("Orientation change failed");
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

		// --- Simulator lifecycle ---
		{
			id: "create-simulator",
			label: "Create Simulator",
			description: "Create a new iOS simulator",
			icon: <Plus size={18} />,
			steps: [
				{
					id: "configure",
					type: "create-simulator" as const,
					label: "Configure new simulator",
				},
				{
					id: "confirm-create",
					type: "confirm" as const,
					label: "Confirm",
					message: (ctx) => `Create "${ctx.params.name}" (${ctx.params.deviceTypeName})?`,
				},
			],
			execute: async (ctx) => {
				try {
					const res = await fetch("/api/modules/devices/create", {
						method: "POST",
						headers: { "Content-Type": "application/json" },
						body: JSON.stringify({
							name: ctx.params.name,
							deviceTypeId: ctx.params.deviceTypeId,
							runtimeId: ctx.params.runtimeId,
						}),
					});
					if (res.ok) toast.success("Simulator created");
					else toast.error("Create failed");
				} catch {
					toast.error("Create failed");
				}
			},
		},
		{
			id: "clone-simulator",
			label: "Clone Simulator",
			description: "Duplicate an existing iOS simulator",
			icon: <CopyPlus size={18} />,
			steps: [
				{
					id: "pick-device",
					type: "device-select",
					label: "Select simulator to clone",
					multi: false,
					filter: (d) => d.platform === "ios",
				},
				{
					id: "clone-name",
					type: "parameter",
					label: "Name for clone",
					placeholder: "Clone name",
					paramKey: "newName",
				},
				{
					id: "confirm-clone",
					type: "confirm",
					label: "Confirm",
					message: (ctx) => `Clone to "${ctx.params.newName}"?`,
				},
			],
			execute: async (ctx) => {
				try {
					const res = await fetch("/api/modules/devices/clone", {
						method: "POST",
						headers: { "Content-Type": "application/json" },
						body: JSON.stringify({
							deviceId: ctx.selectedDeviceIds[0],
							newName: ctx.params.newName,
						}),
					});
					if (res.ok) toast.success("Simulator cloned");
					else toast.error("Clone failed");
				} catch {
					toast.error("Clone failed");
				}
			},
		},
		{
			id: "rename-simulator",
			label: "Rename Simulator",
			description: "Change a simulator's name",
			icon: <Pencil size={18} />,
			steps: [
				{
					id: "pick-device",
					type: "device-select",
					label: "Select simulator to rename",
					multi: false,
					filter: (d) => d.platform === "ios",
				},
				{
					id: "new-name",
					type: "parameter",
					label: "New name",
					placeholder: "New simulator name",
					paramKey: "newName",
				},
				{
					id: "confirm-rename",
					type: "confirm",
					label: "Confirm",
					message: (ctx) => `Rename to "${ctx.params.newName}"?`,
				},
			],
			execute: async (ctx) => {
				try {
					const res = await fetch("/api/modules/devices/rename", {
						method: "POST",
						headers: { "Content-Type": "application/json" },
						body: JSON.stringify({
							deviceId: ctx.selectedDeviceIds[0],
							newName: ctx.params.newName,
						}),
					});
					if (res.ok) toast.success("Simulator renamed");
					else toast.error("Rename failed");
				} catch {
					toast.error("Rename failed");
				}
			},
		},
		{
			id: "delete-simulator",
			label: "Delete Simulator",
			description: "Permanently remove an iOS simulator",
			icon: <Trash2 size={18} />,
			steps: [
				{
					id: "pick-device",
					type: "device-select",
					label: "Select simulator to delete",
					multi: false,
					filter: (d) => d.platform === "ios" && d.state === "shutdown",
				},
				{
					id: "confirm-delete",
					type: "confirm",
					label: "Confirm",
					message: (ctx) =>
						`Permanently delete "${ctx.selectedDeviceNames[0]}"? This cannot be undone.`,
					destructive: true,
				},
			],
			execute: async (ctx) => {
				try {
					const res = await fetch("/api/modules/devices/delete", {
						method: "POST",
						headers: { "Content-Type": "application/json" },
						body: JSON.stringify({ deviceId: ctx.selectedDeviceIds[0] }),
					});
					if (res.ok) toast.success("Simulator deleted");
					else toast.error("Delete failed");
				} catch {
					toast.error("Delete failed");
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

		...(collections ?? []).map(
			(col): MultiStepAction => ({
				id: `collection:${col.id}`,
				label: `Apply: ${col.name}`,
				description: `Run ${col.steps.length} step collection`,
				icon: <Layers size={18} />,
				steps: [
					{ id: "pick-devices", type: "device-select", label: "Select Devices", multi: true },
				],
				execute: async (ctx) => {
					const res = await fetch(`/api/modules/collections/${col.id}/execute`, {
						method: "POST",
						headers: { "Content-Type": "application/json" },
						body: JSON.stringify({ deviceIds: ctx.selectedDeviceIds }),
					});
					if (res.ok) {
						toast.success(`Applying "${col.name}"...`);
					} else {
						const data = await res.json().catch(() => ({ error: "Apply failed" }));
						toast.error(data.error || "Apply failed");
					}
				},
			}),
		),
	];
}
