import { Moon, Sun } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { useDeviceStore } from "../stores/device-store";
import { registerPanel } from "../stores/panel-registry";
import AccessibilitySection from "./settings/AccessibilitySection";
import PermissionsSection from "./settings/PermissionsSection";
import StatusBarSection from "./settings/StatusBarSection";

interface Capabilities {
	appearance: boolean;
	statusBar: boolean;
	permissions: boolean;
	resetPermissions: boolean;
	locale: boolean;
	contentSize: boolean;
	increaseContrast: boolean;
	talkBack: boolean;
}

const DEFAULT_CAPS: Capabilities = {
	appearance: false,
	statusBar: false,
	permissions: false,
	resetPermissions: false,
	locale: false,
	contentSize: false,
	increaseContrast: false,
	talkBack: false,
};

function SettingsPanel() {
	const devices = useDeviceStore((s) => s.devices);
	const [selectedDeviceId, setSelectedDeviceId] = useState<string | null>(null);
	const [capabilities, setCapabilities] = useState<Capabilities>(DEFAULT_CAPS);
	const [activeMode, setActiveMode] = useState<"light" | "dark">("dark");
	const [locale, setLocale] = useState("");

	const bootedDevices = devices.filter((d) => d.state === "booted");
	const selectedDevice = devices.find((d) => d.id === selectedDeviceId);

	useEffect(() => {
		if (!selectedDeviceId || !devices.find((d) => d.id === selectedDeviceId)) {
			const booted = bootedDevices[0];
			if (booted) setSelectedDeviceId(booted.id);
		}
	}, [devices, selectedDeviceId, bootedDevices]);

	useEffect(() => {
		if (!selectedDeviceId) {
			setCapabilities(DEFAULT_CAPS);
			return;
		}
		fetch(`/api/modules/settings/capabilities?deviceId=${selectedDeviceId}`)
			.then((r) => r.json())
			.then((data) => setCapabilities(data as Capabilities))
			.catch(() => setCapabilities(DEFAULT_CAPS));
	}, [selectedDeviceId]);

	const setAppearance = async (mode: "light" | "dark") => {
		if (!selectedDeviceId) return;
		setActiveMode(mode);
		try {
			const res = await fetch("/api/modules/settings/appearance", {
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
			const res = await fetch("/api/modules/settings/locale", {
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

	const hasAccessibility =
		capabilities.contentSize || capabilities.increaseContrast || capabilities.talkBack;

	return (
		<div className="p-6 space-y-4">
			{/* Header */}
			<div className="flex items-center justify-between">
				<h1 className="text-base font-medium text-text-primary">Settings</h1>
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
			</div>

			{/* No device */}
			{!selectedDeviceId && (
				<div className="glass-empty-state">
					<p>Select a booted device to manage settings</p>
				</div>
			)}

			{selectedDeviceId && (
				<div className="space-y-4">
					{/* Appearance */}
					{capabilities.appearance && (
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

					{/* Status Bar (iOS only) */}
					{capabilities.statusBar && <StatusBarSection deviceId={selectedDeviceId} />}

					{/* Permissions */}
					{capabilities.permissions && selectedDevice && (
						<PermissionsSection
							deviceId={selectedDeviceId}
							platform={selectedDevice.platform as "ios" | "android"}
							canReset={capabilities.resetPermissions}
						/>
					)}

					{/* Locale */}
					{capabilities.locale && (
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
						<AccessibilitySection deviceId={selectedDeviceId} capabilities={capabilities} />
					)}
				</div>
			)}
		</div>
	);
}

registerPanel("settings", SettingsPanel);

export default SettingsPanel;
