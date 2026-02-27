import { Moon, Sun } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { useDeviceStore } from "../stores/device-store";
import { registerPanel } from "../stores/panel-registry";
import BatterySimulationSection from "./device-settings/BatterySimulationSection";
import BugReportsSection from "./device-settings/BugReportsSection";
import DisplayOverridesSection from "./device-settings/DisplayOverridesSection";
import InputInjectionSection from "./device-settings/InputInjectionSection";
import PortForwardingSection from "./device-settings/PortForwardingSection";
import AccessibilitySection from "./settings/AccessibilitySection";
import PermissionsSection from "./settings/PermissionsSection";
import StatusBarSection from "./settings/StatusBarSection";

interface SettingsCaps {
	appearance: boolean;
	statusBar: boolean;
	permissions: boolean;
	resetPermissions: boolean;
	locale: boolean;
	contentSize: boolean;
	increaseContrast: boolean;
	talkBack: boolean;
}

interface DevUtilsCaps {
	portForward: boolean;
	displayOverride: boolean;
	batterySimulation: boolean;
	inputInjection: boolean;
	bugReport: boolean;
}

interface AllCaps extends SettingsCaps, DevUtilsCaps {}

const DEFAULT_CAPS: AllCaps = {
	appearance: false,
	statusBar: false,
	permissions: false,
	resetPermissions: false,
	locale: false,
	contentSize: false,
	increaseContrast: false,
	talkBack: false,
	portForward: false,
	displayOverride: false,
	batterySimulation: false,
	inputInjection: false,
	bugReport: false,
};

function DeviceSettingsPanel() {
	const selectedDeviceId = useDeviceStore((s) => s.selectedDeviceIds[0] ?? null);
	const selectedDevice = useDeviceStore((s) =>
		s.devices.find((d) => d.id === s.selectedDeviceIds[0]),
	);
	const [caps, setCaps] = useState<AllCaps>(DEFAULT_CAPS);
	const [activeMode, setActiveMode] = useState<"light" | "dark">("dark");
	const [locale, setLocale] = useState("");

	useEffect(() => {
		if (!selectedDeviceId) {
			setCaps(DEFAULT_CAPS);
			return;
		}
		fetch(`/api/modules/device-settings/capabilities?deviceId=${selectedDeviceId}`)
			.then((r) => r.json())
			.then((data) => setCaps({ ...DEFAULT_CAPS, ...data }))
			.catch(() => {});
	}, [selectedDeviceId]);

	const setAppearance = async (mode: "light" | "dark") => {
		if (!selectedDeviceId) return;
		setActiveMode(mode);
		try {
			const res = await fetch("/api/modules/device-settings/appearance", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ deviceId: selectedDeviceId, mode }),
			});
			if (!res.ok) {
				const data = await res.json();
				throw new Error(data.error || "Failed to set appearance");
			}
			toast.success(`${mode === "dark" ? "Dark" : "Light"} mode enabled`);
		} catch (err) {
			toast.error((err as Error).message);
		}
	};

	const applyLocale = async () => {
		if (!selectedDeviceId || !locale.trim()) return;
		try {
			const res = await fetch("/api/modules/device-settings/locale", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ deviceId: selectedDeviceId, locale: locale.trim() }),
			});
			if (!res.ok) {
				const data = await res.json();
				throw new Error(data.error || "Failed to set locale");
			}
			toast.success(`Locale set to ${locale.trim()} (reboot may be required)`);
		} catch (err) {
			toast.error((err as Error).message);
		}
	};

	const hasAccessibility = caps.contentSize || caps.increaseContrast || caps.talkBack;

	return (
		<div className="p-6 space-y-4">
			<div className="flex items-center justify-between">
				<h1 className="text-base font-medium text-text-primary">Device Settings</h1>
			</div>

			{!selectedDeviceId && (
				<div className="glass-empty-state">
					<p>Select a booted device to manage settings</p>
				</div>
			)}

			{selectedDeviceId && (
				<div className="space-y-4">
					{/* Appearance */}
					{caps.appearance && (
						<div className="rounded-xl bg-bg-surface/10 border-b border-border p-4 space-y-3">
							<h2 className="text-sm font-medium text-text-secondary uppercase tracking-wide">
								Appearance
							</h2>
							<div className="glass-tab-bar">
								<button
									type="button"
									onClick={() => setAppearance("light")}
									className={`glass-tab flex items-center gap-1.5 ${activeMode === "light" ? "active" : ""}`}
								>
									<Sun size={13} strokeWidth={1.8} />
									Light
								</button>
								<button
									type="button"
									onClick={() => setAppearance("dark")}
									className={`glass-tab flex items-center gap-1.5 ${activeMode === "dark" ? "active" : ""}`}
								>
									<Moon size={13} strokeWidth={1.8} />
									Dark
								</button>
							</div>
						</div>
					)}

					{/* Status Bar (iOS) */}
					{caps.statusBar && <StatusBarSection deviceId={selectedDeviceId} />}

					{/* Permissions */}
					{caps.permissions && selectedDevice && (
						<PermissionsSection
							deviceId={selectedDeviceId}
							platform={selectedDevice.platform as "ios" | "android"}
							canReset={caps.resetPermissions}
						/>
					)}

					{/* Locale */}
					{caps.locale && (
						<div className="rounded-xl bg-bg-surface/10 border-b border-border p-4 space-y-3">
							<h2 className="text-sm font-medium text-text-secondary uppercase tracking-wide">
								Locale
							</h2>
							<div className="flex items-center gap-2">
								<input
									type="text"
									value={locale}
									onChange={(e) => setLocale(e.target.value)}
									placeholder="en_US, ja_JP, fr_FR..."
									className="glass-input flex-1 text-xs"
								/>
								<button
									type="button"
									onClick={applyLocale}
									disabled={!locale.trim()}
									className="glass-button-primary"
								>
									Apply
								</button>
							</div>
						</div>
					)}

					{/* Accessibility */}
					{hasAccessibility && (
						<AccessibilitySection deviceId={selectedDeviceId} capabilities={caps} />
					)}

					{/* Port Forwarding */}
					{caps.portForward && <PortForwardingSection deviceId={selectedDeviceId} />}

					{/* Display Overrides */}
					{caps.displayOverride && <DisplayOverridesSection deviceId={selectedDeviceId} />}

					{/* Battery Simulation */}
					{caps.batterySimulation && <BatterySimulationSection deviceId={selectedDeviceId} />}

					{/* Input Injection */}
					{caps.inputInjection && <InputInjectionSection deviceId={selectedDeviceId} />}

					{/* Bug Reports */}
					{caps.bugReport && <BugReportsSection deviceId={selectedDeviceId} />}
				</div>
			)}
		</div>
	);
}

registerPanel("device-settings", DeviceSettingsPanel);

export default DeviceSettingsPanel;
