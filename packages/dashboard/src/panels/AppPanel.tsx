import { useCallback, useEffect } from "react";
import { useWs, useWsListener } from "../hooks/use-ws";
import { useDeviceStore } from "../stores/device-store";
import { registerPanel } from "../stores/panel-registry";
import AppList from "./apps/AppList";
import InstallDropZone from "./apps/InstallDropZone";
import { useAppStore } from "./apps/stores/app-store";

function AppPanel() {
	const { send } = useWs();
	const selectedDevice = useDeviceStore((s) =>
		s.devices.find((d) => d.id === s.selectedDeviceIds[0]),
	);
	const selectedDeviceId = selectedDevice?.id ?? null;
	const fetchApps = useAppStore((s) => s.fetchApps);

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
				<button type="button" onClick={handleRefresh} className="glass-button">
					Refresh
				</button>
			</div>

			{/* No device selected */}
			{!selectedDevice && (
				<div className="glass-empty-state">
					<p className="text-text-secondary">Select a booted device to manage apps</p>
				</div>
			)}

			{/* Device selected */}
			{selectedDevice && (
				<>
					<InstallDropZone
						deviceId={selectedDevice.id}
						devicePlatform={selectedDevice.platform}
						isPhysicalIos={
							selectedDevice.platform === "ios" && selectedDevice.id.startsWith("physical:")
						}
						onInstallComplete={handleRefresh}
					/>
					<AppList deviceId={selectedDevice.id} onRefresh={handleRefresh} />
				</>
			)}
		</div>
	);
}

registerPanel("apps", AppPanel);

export default AppPanel;
