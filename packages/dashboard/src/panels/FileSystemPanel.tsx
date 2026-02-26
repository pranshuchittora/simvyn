import { useCallback, useEffect, useState } from "react";
import { useDeviceStore } from "../stores/device-store";
import { registerPanel } from "../stores/panel-registry";
import FileBrowser from "./file-system/FileBrowser";
import FileEditor from "./file-system/FileEditor";
import { useFsStore } from "./file-system/stores/fs-store";

interface AppOption {
	bundleId: string;
	name: string;
}

function FileSystemPanel() {
	const devices = useDeviceStore((s) => s.devices);
	const [selectedDeviceId, setSelectedDeviceId] = useState<string | null>(null);
	const [selectedApp, setSelectedApp] = useState<string | null>(null);
	const [apps, setApps] = useState<AppOption[]>([]);
	const editingFile = useFsStore((s) => s.editingFile);
	const fetchEntries = useFsStore((s) => s.fetchEntries);

	const bootedDevices = devices.filter((d) => d.state === "booted");

	useEffect(() => {
		if (!selectedDeviceId || !devices.find((d) => d.id === selectedDeviceId)) {
			const booted = bootedDevices[0];
			if (booted) setSelectedDeviceId(booted.id);
		}
	}, [devices, selectedDeviceId, bootedDevices]);

	// Fetch apps when device changes
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

	// Fetch entries when app changes
	useEffect(() => {
		if (selectedDeviceId && selectedApp) {
			fetchEntries(selectedDeviceId, selectedApp, ".");
		}
	}, [selectedDeviceId, selectedApp, fetchEntries]);

	const handleDeviceChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
		setSelectedDeviceId(e.target.value || null);
		setSelectedApp(null);
	}, []);

	const handleAppChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
		setSelectedApp(e.target.value || null);
	}, []);

	return (
		<div className="p-6 space-y-4">
			{/* Header */}
			<div className="flex items-center justify-between">
				<h1 className="text-base font-medium text-text-primary">File System</h1>
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
				<div className="glass-panel p-12 text-center">
					<p className="text-text-secondary">Select a device and app to browse files</p>
				</div>
			)}

			{/* Content */}
			{selectedDeviceId && selectedApp && (
				editingFile ? (
					<FileEditor deviceId={selectedDeviceId} bundleId={selectedApp} />
				) : (
					<FileBrowser deviceId={selectedDeviceId} bundleId={selectedApp} />
				)
			)}
		</div>
	);
}

registerPanel("fs", FileSystemPanel);

export default FileSystemPanel;
