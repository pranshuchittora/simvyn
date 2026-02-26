import { useCallback, useEffect, useState } from "react";
import { useDeviceStore } from "../stores/device-store";
import { registerPanel } from "../stores/panel-registry";
import DatabaseBrowser from "./database/DatabaseBrowser";
import PrefsViewer from "./database/PrefsViewer";
import SqlEditor from "./database/SqlEditor";
import TableViewer from "./database/TableViewer";
import { useDbStore } from "./database/stores/db-store";

interface AppOption {
	bundleId: string;
	name: string;
}

const TABS = [
	{ id: "tables" as const, label: "Tables" },
	{ id: "query" as const, label: "Query" },
	{ id: "prefs" as const, label: "Preferences" },
];

function DatabasePanel() {
	const devices = useDeviceStore((s) => s.devices);
	const [selectedDeviceId, setSelectedDeviceId] = useState<string | null>(null);
	const [selectedApp, setSelectedApp] = useState<string | null>(null);
	const [apps, setApps] = useState<AppOption[]>([]);
	const activeTab = useDbStore((s) => s.activeTab);
	const setActiveTab = useDbStore((s) => s.setActiveTab);
	const fetchDatabases = useDbStore((s) => s.fetchDatabases);
	const fetchPrefs = useDbStore((s) => s.fetchPrefs);

	const bootedDevices = devices.filter((d) => d.state === "booted");

	useEffect(() => {
		if (!selectedDeviceId || !devices.find((d) => d.id === selectedDeviceId)) {
			const booted = bootedDevices[0];
			if (booted) setSelectedDeviceId(booted.id);
		}
	}, [devices, selectedDeviceId, bootedDevices]);

	useEffect(() => {
		if (!selectedDeviceId) {
			setApps([]);
			setSelectedApp(null);
			return;
		}
		fetch(`/api/modules/apps/list/${selectedDeviceId}`)
			.then((r) => r.json())
			.then((data) => {
				const appList = (data.apps || [])
					.filter((a: AppOption & { type: string }) => a.type === "user")
					.map((a: AppOption) => ({ bundleId: a.bundleId, name: a.name }));
				setApps(appList);
				if (appList.length > 0 && !selectedApp) setSelectedApp(appList[0].bundleId);
			})
			.catch(() => setApps([]));
	}, [selectedDeviceId]);

	useEffect(() => {
		if (selectedDeviceId && selectedApp) {
			fetchDatabases(selectedDeviceId, selectedApp);
			fetchPrefs(selectedDeviceId, selectedApp);
		}
	}, [selectedDeviceId, selectedApp, fetchDatabases, fetchPrefs]);

	const handleDeviceChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
		setSelectedDeviceId(e.target.value || null);
		setSelectedApp(null);
	}, []);

	const handleAppChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
		setSelectedApp(e.target.value || null);
	}, []);

	return (
		<div className="p-6 flex flex-col h-full">
			{/* Header */}
			<div className="flex items-center justify-between shrink-0">
				<h1 className="text-base font-medium text-text-primary">Database Inspector</h1>
				<div className="flex items-center gap-3">
					<select
						value={selectedDeviceId ?? ""}
						onChange={handleDeviceChange}
						className="rounded-[var(--radius-button)] bg-bg-surface/60 border border-border px-2 py-1.5 text-xs text-text-secondary max-w-[200px] truncate"
					>
						<option value="">No device</option>
						{devices.map((d) => (
							<option key={d.id} value={d.id}>
								{d.name} {d.state === "booted" ? "" : `(${d.state})`}
							</option>
						))}
					</select>
					<select
						value={selectedApp ?? ""}
						onChange={handleAppChange}
						className="rounded-[var(--radius-button)] bg-bg-surface/60 border border-border px-2 py-1.5 text-xs text-text-secondary max-w-[220px] truncate"
					>
						<option value="">No app</option>
						{apps.map((a) => (
							<option key={a.bundleId} value={a.bundleId}>
								{a.bundleId}
							</option>
						))}
					</select>
				</div>
			</div>

			{/* No selection */}
			{(!selectedDeviceId || !selectedApp) && (
				<div className="glass-panel p-12 text-center mt-4">
					<p className="text-text-secondary">Select a device and app to inspect databases</p>
				</div>
			)}

			{/* Content */}
			{selectedDeviceId && selectedApp && (
				<div className="flex flex-col flex-1 mt-4 min-h-0">
					{/* Tab bar */}
					<div className="flex items-center gap-1 p-1 rounded-xl bg-bg-surface/40 border border-border/50 w-fit shrink-0">
						{TABS.map((tab) => (
							<button
								key={tab.id}
								type="button"
								onClick={() => setActiveTab(tab.id)}
								className={`px-4 py-1.5 rounded-lg text-xs font-medium transition-colors ${
									activeTab === tab.id
										? "bg-glass text-text-primary shadow-sm"
										: "text-text-secondary hover:text-text-primary"
								}`}
							>
								{tab.label}
							</button>
						))}
					</div>

					{/* Tab content */}
					<div className="flex-1 mt-3 min-h-0">
						{activeTab === "tables" && (
							<div className="flex gap-3 h-full">
								<div className="w-[30%] glass-panel p-2 overflow-hidden">
									<DatabaseBrowser deviceId={selectedDeviceId} bundleId={selectedApp} />
								</div>
								<div className="w-[70%] glass-panel overflow-hidden">
									<TableViewer deviceId={selectedDeviceId} bundleId={selectedApp} />
								</div>
							</div>
						)}
						{activeTab === "query" && (
							<SqlEditor deviceId={selectedDeviceId} bundleId={selectedApp} />
						)}
						{activeTab === "prefs" && <PrefsViewer />}
					</div>
				</div>
			)}
		</div>
	);
}

registerPanel("database", DatabasePanel);

export default DatabasePanel;
