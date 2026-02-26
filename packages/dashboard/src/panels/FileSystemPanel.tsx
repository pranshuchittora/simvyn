import { useCallback, useEffect, useRef, useState } from "react";
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
	const selectedDeviceId = useDeviceStore((s) => s.selectedDeviceIds[0] ?? null);
	const [selectedApp, setSelectedApp] = useState<string | null>(null);
	const [apps, setApps] = useState<AppOption[]>([]);
	const editingFile = useFsStore((s) => s.editingFile);
	const fetchEntries = useFsStore((s) => s.fetchEntries);

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
		<div className="p-6 space-y-4">
			{/* Header */}
			<div className="flex items-center justify-between">
				<h1 className="text-base font-medium text-text-primary">File System</h1>
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
				<div className="glass-panel glass-empty-state">Select a device and app to browse files</div>
			)}

			{/* Content */}
			{selectedDeviceId &&
				selectedApp &&
				(editingFile ? (
					<FileEditor deviceId={selectedDeviceId} bundleId={selectedApp} />
				) : (
					<FileBrowser deviceId={selectedDeviceId} bundleId={selectedApp} />
				))}
		</div>
	);
}

registerPanel("fs", FileSystemPanel);

export default FileSystemPanel;
