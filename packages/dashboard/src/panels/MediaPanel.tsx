import { useCallback, useRef, useState } from "react";
import { toast } from "sonner";
import { useDeviceStore } from "../stores/device-store";
import { registerPanel } from "../stores/panel-registry";

const ACCEPTED_TYPES = [".jpg", ".jpeg", ".png", ".gif", ".mp4", ".mov", ".heic"];

function MediaPanel() {
	const selectedDeviceId = useDeviceStore((s) => s.selectedDeviceIds[0] ?? null);
	const selectedDevice = useDeviceStore((s) =>
		s.devices.find((d) => d.id === s.selectedDeviceIds[0]),
	);
	const [dragOver, setDragOver] = useState(false);
	const [uploading, setUploading] = useState(false);
	const [uploadStatus, setUploadStatus] = useState<string | null>(null);
	const fileInputRef = useRef<HTMLInputElement>(null);

	const uploadFile = useCallback(
		async (file: File) => {
			if (!selectedDeviceId) return;
			const ext = `.${file.name.split(".").pop()?.toLowerCase()}`;
			if (!ACCEPTED_TYPES.includes(ext)) {
				toast.error(`Unsupported file type: ${ext}`);
				return;
			}

			setUploading(true);
			setUploadStatus(`Uploading ${file.name}...`);

			const formData = new FormData();
			formData.append("file", file);

			try {
				const res = await fetch(`/api/modules/media/add/${selectedDeviceId}`, {
					method: "POST",
					body: formData,
				});
				if (!res.ok) {
					const data = await res.json().catch(() => ({ error: "Upload failed" }));
					throw new Error((data as { error?: string }).error || "Upload failed");
				}
				toast.success(`Added ${file.name} to ${selectedDevice?.name ?? "device"}`);
				setUploadStatus(null);
			} catch (err) {
				toast.error((err as Error).message);
				setUploadStatus(null);
			} finally {
				setUploading(false);
			}
		},
		[selectedDeviceId, selectedDevice?.name],
	);

	const handleDrop = useCallback(
		(e: React.DragEvent) => {
			e.preventDefault();
			setDragOver(false);
			const files = Array.from(e.dataTransfer.files);
			for (const file of files) {
				uploadFile(file);
			}
		},
		[uploadFile],
	);

	const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
		const files = e.target.files;
		if (files) {
			for (const file of Array.from(files)) {
				uploadFile(file);
			}
		}
		e.target.value = "";
	};

	return (
		<div className="p-6 space-y-4">
			{/* Header */}
			<div className="flex items-center justify-between">
				<h1 className="text-base font-medium text-text-primary">Media</h1>
			</div>

			{!selectedDeviceId && (
				<div className="glass-panel">
					<p className="glass-empty-state">Select a booted device to inject media</p>
				</div>
			)}

			{selectedDeviceId && (
				<div
					onDragOver={(e) => {
						e.preventDefault();
						setDragOver(true);
					}}
					onDragEnter={(e) => {
						e.preventDefault();
						setDragOver(true);
					}}
					onDragLeave={() => setDragOver(false)}
					onDrop={handleDrop}
					className={`glass-drop-zone ${dragOver ? "drag-over" : ""}`}
				>
					{uploading ? (
						<div className="flex flex-col items-center gap-2">
							<span className="inline-block h-5 w-5 animate-spin rounded-full border-2 border-accent-blue border-t-transparent" />
							<p className="text-sm text-text-secondary">{uploadStatus}</p>
						</div>
					) : (
						<div className="space-y-3">
							<p className="text-sm text-text-secondary">
								Drop photos or videos here to add to device
							</p>
							<p className="text-[11px] text-text-muted">{ACCEPTED_TYPES.join(", ")}</p>
							<button
								type="button"
								onClick={() => fileInputRef.current?.click()}
								className="glass-button-primary"
							>
								Browse files
							</button>
							<input
								ref={fileInputRef}
								type="file"
								accept={ACCEPTED_TYPES.join(",")}
								multiple
								onChange={handleFileInput}
								className="hidden"
							/>
						</div>
					)}
				</div>
			)}
		</div>
	);
}

registerPanel("media", MediaPanel);

export default MediaPanel;
