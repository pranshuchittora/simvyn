import { useCallback, useEffect, useState } from "react";
import { useWs, useWsListener } from "../hooks/use-ws";
import { useDeviceStore } from "../stores/device-store";
import { registerPanel } from "../stores/panel-registry";
import AppList from "./apps/AppList";
import InstallDropZone from "./apps/InstallDropZone";
import { useAppStore } from "./apps/stores/app-store";

function AppPanel() {
	const { send } = useWs();
	const devices = useDeviceStore((s) => s.devices);
	const [selectedDeviceId, setSelectedDeviceId] = useState<string | null>(null);
	const fetchApps = useAppStore((s) => s.fetchApps);

	const bootedDevices = devices.filter((d) => d.state === "booted");

	// auto-select first booted device
	useEffect(() => {
		if (!selectedDeviceId || !devices.find((d) => d.id === selectedDeviceId)) {
			const booted = bootedDevices[0];
			if (booted) setSelectedDeviceId(booted.id);
		}
	}, [devices, selectedDeviceId, bootedDevices]);

	// fetch apps when device changes
	useEffect(() => {
		if (selectedDeviceId) {
			fetchApps(selectedDeviceId);
		}
	}, [selectedDeviceId, fetchApps]);

	// subscribe to apps channel
	useEffect(() => {
		send({
			channel: "system",
			type: "subscribe",
			payload: { channel: "apps" },
		});
		return () => {
			send({
				channel: "system",
				type: "unsubscribe",
				payload: { channel: "apps" },
			});
		};
	}, [send]);

	// auto-refresh on WS events
	const handleRefresh = useCallback(() => {
		if (selectedDeviceId) fetchApps(selectedDeviceId);
	}, [selectedDeviceId, fetchApps]);

	useWsListener("apps", "app-installed", handleRefresh);
	useWsListener("apps", "app-uninstalled", handleRefresh);
	useWsListener("apps", "data-cleared", handleRefresh);

	return (
		<div className="p-6 space-y-4">
			{/* Header */}
			<div className="flex items-center justify-between">
				<h1 className="text-base font-medium text-text-primary">App Management</h1>
				<div className="flex items-center gap-3">
					<select
						value={selectedDeviceId ?? ""}
						onChange={(e) => setSelectedDeviceId(e.target.value || null)}
						className="glass-select max-w-[200px] truncate"
					>
						<option value="">No device</option>
						{devices.map((d) => (
							<option key={d.id} value={d.id}>
								{d.name} {d.state === "booted" ? "" : `(${d.state})`}
							</option>
						))}
					</select>
					<button type="button" onClick={handleRefresh} className="glass-button">
						Refresh
					</button>
				</div>
			</div>

			{/* No device selected */}
			{!selectedDeviceId && (
				<div className="glass-empty-state">
					<p className="text-text-secondary">Select a booted device to manage apps</p>
				</div>
			)}

			{/* Device selected */}
			{selectedDeviceId && (
				<>
					<InstallDropZone deviceId={selectedDeviceId} onInstallComplete={handleRefresh} />
					<AppList deviceId={selectedDeviceId} onRefresh={handleRefresh} />
				</>
			)}
		</div>
	);
}

registerPanel("apps", AppPanel);

export default AppPanel;
