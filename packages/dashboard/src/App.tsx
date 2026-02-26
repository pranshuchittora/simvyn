import type { Device } from "@simvyn/types";
import { useCallback, useEffect } from "react";
import { Toaster } from "sonner";
import ModuleShell from "./components/ModuleShell";
import Sidebar from "./components/Sidebar";
import TopBar from "./components/TopBar";
import { useWsListener, WsProvider } from "./hooks/use-ws";
import { useDeviceStore } from "./stores/device-store";
import { useModuleStore } from "./stores/module-store";

// Module panel side-effect registrations
import "./panels/DevicePanel";
import "./panels/LocationPanel";
import "./panels/AppPanel";
import "./panels/LogPanel";
import "./panels/ScreenshotPanel";
import "./panels/DeepLinksPanel";
import "./panels/PushPanel";
import "./panels/FileSystemPanel";
import "./panels/DatabasePanel";
import "./panels/SettingsPanel";

function AppContent() {
	const setDevices = useDeviceStore((s) => s.setDevices);
	const fetchModules = useModuleStore((s) => s.fetchModules);

	const handleDeviceList = useCallback(
		(payload: unknown) => {
			setDevices(payload as Device[]);
		},
		[setDevices],
	);

	const handleDeviceUpdated = useCallback((payload: unknown) => {
		const updated = payload as Device;
		useDeviceStore.setState((s) => ({
			devices: s.devices.map((d) => (d.id === updated.id ? updated : d)),
		}));
	}, []);

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
			<Toaster
				position="bottom-right"
				toastOptions={{
					style: {
						background: "oklch(0.14 0.02 260 / 0.85)",
						backdropFilter: "blur(24px) saturate(1.3)",
						border: "1px solid oklch(0.35 0.02 260 / 0.15)",
						borderRadius: "12px",
						color: "oklch(0.92 0.01 260)",
						fontSize: "13px",
						fontFamily: "Inter, -apple-system, BlinkMacSystemFont, sans-serif",
					},
				}}
				theme="dark"
				richColors
			/>
		</WsProvider>
	);
}
