import type { Device } from "@simvyn/types";
import { useCallback, useEffect } from "react";
import { BrowserRouter, Navigate, Route, Routes, useNavigate, useParams } from "react-router";
import { Toaster } from "sonner";
import CommandPalette from "./components/CommandPalette";
import ModuleShell from "./components/ModuleShell";
import Sidebar from "./components/Sidebar";
import TopBar from "./components/TopBar";
import UpdateBanner from "./components/UpdateBanner";
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
import "./panels/DeviceSettingsPanel";
import "./panels/CrashLogsPanel";
import "./panels/MediaPanel";
import "./panels/ClipboardPanel";
import "./panels/ToolSettingsPanel";
import "./panels/CollectionsPanel";

function RouterSync() {
	const { moduleName } = useParams<{ moduleName: string }>();
	const navigate = useNavigate();
	const modules = useModuleStore((s) => s.modules);
	const setActiveModule = useModuleStore((s) => s.setActiveModule);
	const clearActiveModule = useModuleStore((s) => s.clearActiveModule);

	useEffect(() => {
		if (!moduleName) {
			clearActiveModule();
			return;
		}

		// Don't validate until modules have loaded
		if (modules.length === 0) return;

		const exists = modules.some((m) => m.name === moduleName);
		if (exists) {
			setActiveModule(moduleName);
		} else {
			navigate("/", { replace: true });
		}
	}, [moduleName, modules, setActiveModule, clearActiveModule, navigate]);

	return null;
}

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
		<>
			<RouterSync />
			<div className="flex h-screen flex-col bg-bg-base">
				<TopBar />
				<UpdateBanner />
				<div className="flex flex-1 overflow-hidden">
					<div className="relative flex-shrink-0 w-[76px]">
						<Sidebar />
					</div>
					<ModuleShell />
				</div>
			</div>
		</>
	);
}

export default function App() {
	return (
		<BrowserRouter>
			<WsProvider>
				<Routes>
					<Route path="/:moduleName" element={<AppContent />} />
					<Route path="/" element={<AppContent />} />
					<Route path="*" element={<Navigate to="/" replace />} />
				</Routes>
				<Toaster
					position="bottom-right"
					toastOptions={{
						style: {
							background: "rgba(30, 30, 40, 0.7)",
							backdropFilter: "blur(20px) saturate(1.4)",
							WebkitBackdropFilter: "blur(20px) saturate(1.4)",
							border: "1px solid rgba(255, 255, 255, 0.08)",
							borderRadius: "12px",
							color: "#e8e8ed",
							fontSize: "13px",
							fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Display', Inter, sans-serif",
							boxShadow: "0 4px 24px rgba(0, 0, 0, 0.3), inset 0 0.5px 0 rgba(255, 255, 255, 0.06)",
						},
					}}
					theme="dark"
					richColors
				/>
				<CommandPalette />
			</WsProvider>
		</BrowserRouter>
	);
}
