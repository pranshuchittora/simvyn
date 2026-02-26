import { Download, File, FileText, Folder, Upload } from "lucide-react";
import { useRef } from "react";
import { type FileEntry, isTextFile, useFsStore } from "./stores/fs-store";

interface FileBrowserProps {
	deviceId: string;
	bundleId: string;
}

function formatSize(bytes: number) {
	if (bytes < 1024) return `${bytes} B`;
	if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
	return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(iso: string) {
	if (!iso) return "";
	const d = new Date(iso);
	if (isNaN(d.getTime())) return iso;
	return d.toLocaleDateString(undefined, {
		month: "short",
		day: "numeric",
		hour: "2-digit",
		minute: "2-digit",
	});
}

export default function FileBrowser({ deviceId, bundleId }: FileBrowserProps) {
	const entries = useFsStore((s) => s.entries);
	const currentPath = useFsStore((s) => s.currentPath);
	const loading = useFsStore((s) => s.loading);
	const error = useFsStore((s) => s.error);
	const fetchEntries = useFsStore((s) => s.fetchEntries);
	const downloadFile = useFsStore((s) => s.downloadFile);
	const uploadFile = useFsStore((s) => s.uploadFile);
	const openFile = useFsStore((s) => s.openFile);
	const fileInputRef = useRef<HTMLInputElement>(null);

	const sorted = [...entries].sort((a, b) => {
		if (a.isDirectory && !b.isDirectory) return -1;
		if (!a.isDirectory && b.isDirectory) return 1;
		return a.name.localeCompare(b.name);
	});

	const pathSegments = currentPath === "." ? [] : currentPath.split("/").filter(Boolean);

	const navigateTo = (path: string) => {
		fetchEntries(deviceId, bundleId, path);
	};

	const handleFileClick = (entry: FileEntry) => {
		if (entry.isDirectory) {
			navigateTo(entry.path);
		} else if (isTextFile(entry.name)) {
			openFile(deviceId, bundleId, entry.path);
		}
	};

	const handleUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
		const file = e.target.files?.[0];
		if (file) {
			uploadFile(deviceId, bundleId, currentPath, file);
		}
		e.target.value = "";
	};

	return (
		<div className="flex flex-col gap-3">
			{/* Breadcrumb + Upload */}
			<div className="flex items-center justify-between">
				<div className="flex items-center gap-1 text-xs text-text-secondary overflow-hidden">
					<button
						type="button"
						onClick={() => navigateTo(".")}
						className="hover:text-text-primary transition-colors shrink-0"
					>
						Root
					</button>
					{pathSegments.map((seg, i) => {
						const segPath = pathSegments.slice(0, i + 1).join("/");
						return (
							<span key={segPath} className="flex items-center gap-1">
								<span className="text-text-muted">/</span>
								<button
									type="button"
									onClick={() => navigateTo(segPath)}
									className="hover:text-text-primary transition-colors truncate max-w-[150px]"
								>
									{seg}
								</button>
							</span>
						);
					})}
				</div>
				<button
					type="button"
					onClick={() => fileInputRef.current?.click()}
					className="glass-button-primary flex items-center gap-1.5"
				>
					<Upload size={14} />
					Upload
				</button>
				<input ref={fileInputRef} type="file" className="hidden" onChange={handleUpload} />
			</div>

			{/* Error */}
			{error && (
				<div className="rounded-[var(--radius-button)] bg-red-900/40 border border-red-500/30 px-4 py-2 text-sm text-red-300">
					{error}
				</div>
			)}

			{/* Loading */}
			{loading && (
				<div className="flex items-center justify-center py-8 text-text-muted text-sm">
					<span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent mr-2" />
					Loading files...
				</div>
			)}

			{/* Empty */}
			{!loading && !error && sorted.length === 0 && (
				<div className="glass-panel glass-empty-state">No files found</div>
			)}

			{/* File table */}
			{!loading && sorted.length > 0 && (
				<div className="glass-panel overflow-hidden">
					<table className="glass-table">
						<thead>
							<tr>
								<th>Name</th>
								<th>Size</th>
								<th>Modified</th>
								<th className="text-right">Actions</th>
							</tr>
						</thead>
						<tbody>
							{sorted.map((entry) => (
								<tr key={entry.path}>
									<td>
										<button
											type="button"
											onClick={() => handleFileClick(entry)}
											className="flex items-center gap-2 text-text-primary hover:text-accent-blue transition-colors truncate max-w-[300px]"
										>
											{entry.isDirectory ? (
												<Folder size={16} className="text-accent-blue shrink-0" />
											) : isTextFile(entry.name) ? (
												<FileText size={16} className="text-text-secondary shrink-0" />
											) : (
												<File size={16} className="text-text-muted shrink-0" />
											)}
											{entry.name}
										</button>
									</td>
									<td className="text-text-secondary text-xs">
										{entry.isDirectory ? "--" : formatSize(entry.size)}
									</td>
									<td className="text-text-secondary text-xs">{formatDate(entry.modified)}</td>
									<td className="text-right">
										{!entry.isDirectory && (
											<button
												type="button"
												onClick={() => downloadFile(deviceId, bundleId, entry.path)}
												className="glass-button text-xs inline-flex items-center gap-1"
											>
												<Download size={12} />
												Download
											</button>
										)}
									</td>
								</tr>
							))}
						</tbody>
					</table>
				</div>
			)}
		</div>
	);
}
