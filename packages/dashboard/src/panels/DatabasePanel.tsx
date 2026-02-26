import { useCallback, useEffect, useRef, useState } from "react";
import { useDeviceStore } from "../stores/device-store";
import { registerPanel } from "../stores/panel-registry";
import DatabaseBrowser from "./database/DatabaseBrowser";
import PrefsViewer from "./database/PrefsViewer";
import SqlEditor from "./database/SqlEditor";
import { useDbStore } from "./database/stores/db-store";
import TableViewer from "./database/TableViewer";

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
	const selectedDeviceId = useDeviceStore((s) => s.selectedDeviceIds[0] ?? null);
	const [selectedApp, setSelectedApp] = useState<string | null>(null);
	const [apps, setApps] = useState<AppOption[]>([]);
	const activeTab = useDbStore((s) => s.activeTab);
	const setActiveTab = useDbStore((s) => s.setActiveTab);
	const fetchDatabases = useDbStore((s) => s.fetchDatabases);
	const fetchPrefs = useDbStore((s) => s.fetchPrefs);

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

	// reset app selection when device changes
	const prevDeviceRef = useRef(selectedDeviceId);
	useEffect(() => {
		if (prevDeviceRef.current !== selectedDeviceId) {
			setSelectedApp(null);
			prevDeviceRef.current = selectedDeviceId;
		}
	}, [selectedDeviceId]);

	const handleAppChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
		setSelectedApp(e.target.value || null);
	}, []);

	return (
		<div className="p-6 flex flex-col h-full">
			{/* Header */}
			<div className="flex items-center justify-between shrink-0">
				<h1 className="text-base font-medium text-text-primary">Database Inspector</h1>
				<select
					value={selectedApp ?? ""}
					onChange={handleAppChange}
					className="glass-select max-w-[220px] truncate"
				>
					<option value="">No app</option>
					{apps.map((a) => (
						<option key={a.bundleId} value={a.bundleId}>
							{a.bundleId}
						</option>
					))}
				</select>
			</div>

			{/* No selection */}
			{(!selectedDeviceId || !selectedApp) && (
				<div className="glass-panel glass-empty-state mt-4">
					Select a device and app to inspect databases
				</div>
			)}

			{/* Content */}
			{selectedDeviceId && selectedApp && (
				<div className="flex flex-col flex-1 mt-4 min-h-0">
					{/* Tab bar */}
					<div className="glass-tab-bar shrink-0">
						{TABS.map((tab) => (
							<button
								key={tab.id}
								type="button"
								onClick={() => setActiveTab(tab.id)}
								className={`glass-tab${activeTab === tab.id ? " active" : ""}`}
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
								<div className="w-[70%] glass-panel overflow-auto">
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
