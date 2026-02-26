import type { Device } from "@simvyn/types";
import { useCallback, useEffect, useState } from "react";
import { useWsListener } from "../hooks/use-ws";
import { useDeviceStore } from "../stores/device-store";
import { registerPanel } from "../stores/panel-registry";

type ActionState = { deviceId: string; action: string } | null;

function DevicePanel() {
	const devices = useDeviceStore((s) => s.devices);
	const setDevices = useDeviceStore((s) => s.setDevices);
	const [actionInFlight, setActionInFlight] = useState<ActionState>(null);
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		fetch("/api/modules/devices/list")
			.then((res) => res.json())
			.then((data: { devices: Device[] }) => setDevices(data.devices))
			.catch(() => {});
	}, [setDevices]);

	const handleDeviceList = useCallback(
		(payload: unknown) => setDevices(payload as Device[]),
		[setDevices],
	);
	useWsListener("devices", "device-list", handleDeviceList);

	async function doAction(deviceId: string, action: "boot" | "shutdown" | "erase") {
		if (
			action === "erase" &&
			!confirm("Are you sure you want to erase this device? All data will be lost.")
		) {
			return;
		}
		setActionInFlight({ deviceId, action });
		setError(null);
		try {
			const res = await fetch(`/api/modules/devices/${action}`, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ deviceId }),
			});
			if (!res.ok) {
				const data = await res.json().catch(() => ({ error: "Unknown error" }));
				setError(data.error || "Action failed");
			}
		} catch {
			setError("Network error");
		} finally {
			setActionInFlight(null);
		}
	}

	async function handleRefresh() {
		try {
			const res = await fetch("/api/modules/devices/refresh", { method: "POST" });
			if (res.ok) {
				const data = await res.json();
				setDevices(data.devices);
			}
		} catch {}
	}

	const iosDevices = devices.filter((d) => d.platform === "ios");
	const androidDevices = devices.filter((d) => d.platform === "android");

	return (
		<div className="p-6 space-y-6">
			<div className="flex items-center justify-between">
				<h1 className="text-base font-medium text-text-primary">Device Management</h1>
				<button type="button" onClick={handleRefresh} className="glass-button">
					Refresh
				</button>
			</div>

			{error && (
				<div className="rounded-[var(--radius-button)] bg-red-900/40 border border-red-500/30 px-4 py-2 text-sm text-red-300">
					{error}
					<button
						type="button"
						onClick={() => setError(null)}
						className="ml-2 text-red-400 hover:text-red-200"
					>
						&times;
					</button>
				</div>
			)}

			{devices.length === 0 && (
				<div className="glass-empty-state">
					<p className="text-base font-medium text-text-primary mb-2">No Devices Detected</p>
					<p className="text-sm text-text-secondary">
						Make sure Xcode Simulator or Android Emulator tools are installed.
					</p>
				</div>
			)}

			{iosDevices.length > 0 && (
				<DeviceSection
					title="iOS Simulators"
					devices={iosDevices}
					actionInFlight={actionInFlight}
					onAction={doAction}
				/>
			)}

			{androidDevices.length > 0 && (
				<DeviceSection
					title="Android Emulators"
					devices={androidDevices}
					actionInFlight={actionInFlight}
					onAction={doAction}
				/>
			)}
		</div>
	);
}

function DeviceSection({
	title,
	devices,
	actionInFlight,
	onAction,
}: {
	title: string;
	devices: Device[];
	actionInFlight: ActionState;
	onAction: (deviceId: string, action: "boot" | "shutdown" | "erase") => void;
}) {
	return (
		<div>
			<h2 className="text-sm font-medium text-text-muted uppercase tracking-wider mb-3">{title}</h2>
			<div className="grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
				{devices.map((device) => (
					<DeviceCard
						key={device.id}
						device={device}
						isLoading={actionInFlight?.deviceId === device.id}
						loadingAction={
							actionInFlight?.deviceId === device.id ? actionInFlight.action : undefined
						}
						onAction={onAction}
					/>
				))}
			</div>
		</div>
	);
}

function StateBadge({ state }: { state: Device["state"] }) {
	const styles: Record<string, { color: string; borderColor: string; bg: string }> = {
		booted: {
			color: "rgb(74, 222, 128)",
			borderColor: "rgba(34, 197, 94, 0.3)",
			bg: "rgba(34, 197, 94, 0.2)",
		},
		shutdown: {
			color: "rgb(163, 163, 163)",
			borderColor: "rgba(115, 115, 115, 0.3)",
			bg: "rgba(115, 115, 115, 0.2)",
		},
		"shutting-down": {
			color: "rgb(250, 204, 21)",
			borderColor: "rgba(234, 179, 8, 0.3)",
			bg: "rgba(234, 179, 8, 0.2)",
		},
		creating: {
			color: "rgb(96, 165, 250)",
			borderColor: "rgba(59, 130, 246, 0.3)",
			bg: "rgba(59, 130, 246, 0.2)",
		},
	};
	const label: Record<string, string> = {
		booted: "Booted",
		shutdown: "Shutdown",
		"shutting-down": "Shutting Down",
		creating: "Creating",
	};

	const s = styles[state] ?? styles.shutdown;

	return (
		<span
			className="glass-badge"
			style={{ color: s.color, borderColor: s.borderColor, background: s.bg }}
		>
			{label[state] ?? state}
		</span>
	);
}

function DeviceCard({
	device,
	isLoading,
	loadingAction,
	onAction,
}: {
	device: Device;
	isLoading: boolean;
	loadingAction?: string;
	onAction: (deviceId: string, action: "boot" | "shutdown" | "erase") => void;
}) {
	const truncatedId =
		device.id.length > 16 ? `${device.id.slice(0, 8)}…${device.id.slice(-6)}` : device.id;

	return (
		<div className="glass-panel p-4 flex flex-col gap-3 hover:border-glass-border-hover transition-all duration-150">
			<div className="flex items-start justify-between">
				<div className="min-w-0 flex-1">
					<div className="font-medium text-text-primary truncate">{device.name}</div>
					<div className="text-xs text-text-muted mt-0.5 font-mono">{truncatedId}</div>
				</div>
				<StateBadge state={device.state} />
			</div>

			<div className="flex items-center gap-3 text-xs text-text-secondary">
				<span>
					{device.platform === "ios" ? "iOS" : "Android"} {device.osVersion}
				</span>
				<span className="text-text-muted">{device.deviceType}</span>
			</div>

			<div className="flex items-center gap-2 pt-1 border-t border-border">
				{device.state === "shutdown" && (
					<ActionButton
						label="Boot"
						loading={isLoading && loadingAction === "boot"}
						disabled={isLoading}
						onClick={() => onAction(device.id, "boot")}
						variant="primary"
					/>
				)}
				{device.state === "booted" && (
					<ActionButton
						label="Shutdown"
						loading={isLoading && loadingAction === "shutdown"}
						disabled={isLoading}
						onClick={() => onAction(device.id, "shutdown")}
						variant="default"
					/>
				)}
				{device.platform === "ios" && (
					<ActionButton
						label="Erase"
						loading={isLoading && loadingAction === "erase"}
						disabled={isLoading}
						onClick={() => onAction(device.id, "erase")}
						variant="destructive"
					/>
				)}
			</div>
		</div>
	);
}

function ActionButton({
	label,
	loading,
	disabled,
	onClick,
	variant,
}: {
	label: string;
	loading: boolean;
	disabled: boolean;
	onClick: () => void;
	variant: "primary" | "default" | "destructive";
}) {
	const variants: Record<string, string> = {
		primary: "glass-button-primary",
		default: "glass-button",
		destructive: "glass-button-destructive",
	};

	return (
		<button type="button" onClick={onClick} disabled={disabled} className={variants[variant]}>
			{loading ? (
				<span className="inline-flex items-center gap-1">
					<span className="h-3 w-3 animate-spin rounded-full border-2 border-current border-t-transparent" />
					{label}
				</span>
			) : (
				label
			)}
		</button>
	);
}

registerPanel("devices", DevicePanel);

export default DevicePanel;
