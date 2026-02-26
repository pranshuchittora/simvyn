import { useState } from "react";
import { toast } from "sonner";
import { useDeviceStore } from "../stores/device-store";
import { registerPanel } from "../stores/panel-registry";

function ClipboardPanel() {
	const selectedDeviceId = useDeviceStore((s) => s.selectedDeviceIds[0] ?? null);
	const selectedDevice = useDeviceStore((s) =>
		s.devices.find((d) => d.id === s.selectedDeviceIds[0]),
	);
	const [clipboardContent, setClipboardContent] = useState("");
	const [readLoading, setReadLoading] = useState(false);
	const [writeText, setWriteText] = useState("");
	const [writeLoading, setWriteLoading] = useState(false);

	const readClipboard = async () => {
		if (!selectedDeviceId) return;
		setReadLoading(true);
		try {
			const res = await fetch(`/api/modules/clipboard/get/${selectedDeviceId}`);
			if (res.status === 400) {
				toast.error("Clipboard read not supported for this platform");
				setReadLoading(false);
				return;
			}
			if (!res.ok) throw new Error("Failed to read clipboard");
			const data = await res.json();
			setClipboardContent((data as { text: string }).text ?? "");
		} catch (err) {
			toast.error((err as Error).message);
		} finally {
			setReadLoading(false);
		}
	};

	const copyToHost = async () => {
		try {
			await navigator.clipboard.writeText(clipboardContent);
			toast.success("Copied to host clipboard");
		} catch {
			toast.error("Failed to copy to host clipboard");
		}
	};

	const writeClipboard = async (text: string) => {
		if (!selectedDeviceId || !text.trim()) return;
		setWriteLoading(true);
		try {
			const res = await fetch(`/api/modules/clipboard/set/${selectedDeviceId}`, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ text: text.trim() }),
			});
			if (!res.ok) throw new Error("Failed to set clipboard");
			toast.success(`Clipboard set on ${selectedDevice?.name ?? "device"}`);
		} catch (err) {
			toast.error((err as Error).message);
		} finally {
			setWriteLoading(false);
		}
	};

	const pasteFromHost = async () => {
		try {
			const text = await navigator.clipboard.readText();
			setWriteText(text);
			if (text.trim()) await writeClipboard(text);
		} catch {
			toast.error("Failed to read host clipboard (permission denied?)");
		}
	};

	return (
		<div className="p-6 space-y-4">
			{/* Header */}
			<div className="flex items-center justify-between">
				<h1 className="text-base font-medium text-text-primary">Clipboard</h1>
			</div>

			{!selectedDeviceId && (
				<div className="glass-panel">
					<p className="glass-empty-state">Select a booted device to bridge clipboard</p>
				</div>
			)}

			{selectedDeviceId && (
				<div className="glass-panel p-4 space-y-6">
					{/* Read Clipboard */}
					<div className="space-y-3">
						<div className="flex items-center justify-between">
							<h2 className="text-sm font-medium text-text-primary">Read Clipboard</h2>
							<button
								type="button"
								onClick={readClipboard}
								disabled={readLoading}
								className="glass-button-primary"
							>
								{readLoading ? "Reading..." : "Read Clipboard"}
							</button>
						</div>
						<textarea
							readOnly
							value={clipboardContent}
							placeholder="Device clipboard content will appear here..."
							className="glass-textarea h-24 text-xs"
						/>
						{clipboardContent && (
							<button
								type="button"
								onClick={copyToHost}
								className="text-xs text-accent-blue hover:text-accent-blue/80 transition-colors"
							>
								Copy to Host
							</button>
						)}
					</div>

					<div className="border-t border-border/30" />

					{/* Write Clipboard */}
					<div className="space-y-3">
						<h2 className="text-sm font-medium text-text-primary">Write Clipboard</h2>
						<textarea
							value={writeText}
							onChange={(e) => setWriteText(e.target.value)}
							placeholder="Enter text to write to device clipboard..."
							className="glass-textarea h-24 text-xs"
						/>
						<div className="flex items-center gap-2">
							<button
								type="button"
								onClick={() => writeClipboard(writeText)}
								disabled={writeLoading || !writeText.trim()}
								className="glass-button-primary"
							>
								{writeLoading ? "Writing..." : "Write to Device"}
							</button>
							<button
								type="button"
								onClick={pasteFromHost}
								className="text-xs text-accent-blue hover:text-accent-blue/80 transition-colors"
							>
								Paste from Host
							</button>
						</div>
					</div>
				</div>
			)}
		</div>
	);
}

registerPanel("clipboard", ClipboardPanel);

export default ClipboardPanel;
