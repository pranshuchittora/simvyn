import { useCallback, useRef, useState } from "react";

interface InstallDropZoneProps {
	deviceId: string;
	onInstallComplete: () => void;
}

export default function InstallDropZone({ deviceId, onInstallComplete }: InstallDropZoneProps) {
	const [dragOver, setDragOver] = useState(false);
	const [uploading, setUploading] = useState(false);
	const [status, setStatus] = useState<string | null>(null);
	const fileInputRef = useRef<HTMLInputElement>(null);

	const handleFile = useCallback(
		async (file: File) => {
			const ext = file.name.split(".").pop()?.toLowerCase();
			if (ext !== "ipa" && ext !== "apk") {
				setStatus("Only .ipa and .apk files are accepted");
				return;
			}

			setUploading(true);
			setStatus(`Installing ${file.name}...`);

			const formData = new FormData();
			formData.append("file", file);

			try {
				const res = await fetch(`/api/modules/apps/install/${deviceId}`, {
					method: "POST",
					body: formData,
				});
				if (!res.ok) {
					const data = await res.json().catch(() => ({ error: "Install failed" }));
					setStatus(`Error: ${data.error || "Install failed"}`);
				} else {
					setStatus(`Installed ${file.name}`);
					onInstallComplete();
				}
			} catch {
				setStatus("Network error during upload");
			} finally {
				setUploading(false);
			}
		},
		[deviceId, onInstallComplete],
	);

	function handleDrop(e: React.DragEvent) {
		e.preventDefault();
		setDragOver(false);
		const file = e.dataTransfer.files[0];
		if (file) handleFile(file);
	}

	function handleFileInput(e: React.ChangeEvent<HTMLInputElement>) {
		const file = e.target.files?.[0];
		if (file) handleFile(file);
		e.target.value = "";
	}

	return (
		<div
			onDragOver={(e) => {
				e.preventDefault();
				setDragOver(true);
			}}
			onDragLeave={() => setDragOver(false)}
			onDrop={handleDrop}
			className={`glass-drop-zone p-4 ${dragOver ? "drag-over" : ""}`}
		>
			{uploading ? (
				<div className="flex items-center justify-center gap-2 text-sm text-text-secondary">
					<span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
					{status}
				</div>
			) : (
				<div className="space-y-1">
					<p className="text-sm text-text-secondary">Drop IPA or APK here to install</p>
					<button
						type="button"
						onClick={() => fileInputRef.current?.click()}
						className="glass-button-primary"
					>
						or click to browse
					</button>
					<input
						ref={fileInputRef}
						type="file"
						accept=".ipa,.apk"
						onChange={handleFileInput}
						className="hidden"
					/>
					{status && !uploading && (
						<p
							className={`text-xs mt-1 ${status.startsWith("Error") ? "text-red-400" : "text-green-400"}`}
						>
							{status}
						</p>
					)}
				</div>
			)}
		</div>
	);
}
