import { useEffect, useCallback } from "react";
import { WsProvider, useWsListener } from "./hooks/use-ws";
import { useDeviceStore } from "./stores/device-store";
import { useModuleStore } from "./stores/module-store";
import TopBar from "./components/TopBar";
import Sidebar from "./components/Sidebar";
import ModuleShell from "./components/ModuleShell";
import type { Device } from "@simvyn/types";

function AppContent() {
	const setDevices = useDeviceStore((s) => s.setDevices);
	const fetchModules = useModuleStore((s) => s.fetchModules);

	const handleDeviceList = useCallback(
		(payload: unknown) => {
			setDevices(payload as Device[]);
		},
		[setDevices],
	);

	const handleDeviceUpdated = useCallback(
		(payload: unknown) => {
			const updated = payload as Device;
			useDeviceStore.setState((s) => ({
				devices: s.devices.map((d) => (d.id === updated.id ? updated : d)),
			}));
		},
		[],
	);

	useWsListener("devices", "device-list", handleDeviceList);
	useWsListener("devices", "device-updated", handleDeviceUpdated);

	useEffect(() => {
		fetchModules();
	}, [fetchModules]);

	return (
		<div className="flex h-screen flex-col bg-bg-base">
			<TopBar />
			<div className="flex flex-1 overflow-hidden">
				<Sidebar />
				<ModuleShell />
			</div>
		</div>
	);
}

export default function App() {
	return (
		<WsProvider>
			<AppContent />
		</WsProvider>
	);
}
