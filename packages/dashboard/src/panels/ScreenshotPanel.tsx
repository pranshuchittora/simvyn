import { Camera, Copy, Download, Square, Trash2, Video } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { useWs, useWsListener } from "../hooks/use-ws";
import { useDeviceStore } from "../stores/device-store";
import { registerPanel } from "../stores/panel-registry";
import { type CaptureEntry, useScreenshotStore } from "./screenshot/stores/screenshot-store";

function RecordingTimer({ startTime }: { startTime: number }) {
	const [elapsed, setElapsed] = useState(0);

	useEffect(() => {
		const interval = setInterval(() => {
			setElapsed(Math.floor((Date.now() - startTime) / 1000));
		}, 1000);
		return () => clearInterval(interval);
	}, [startTime]);

	const mins = Math.floor(elapsed / 60);
	const secs = elapsed % 60;
	return (
		<span className="text-xs tabular-nums text-red-400">
			{String(mins).padStart(2, "0")}:{String(secs).padStart(2, "0")}
		</span>
	);
}

function CaptureCard({
	entry,
	onDownload,
	onCopy,
	onDelete,
}: {
	entry: CaptureEntry;
	onDownload: (filename: string) => void;
	onCopy: (filename: string) => void;
	onDelete: (filename: string) => void;
}) {
	const isScreenshot = entry.type === "screenshot";
	const time = new Date(entry.timestamp).toLocaleString();

	return (
		<div className="glass-panel p-3 space-y-2">
			{isScreenshot ? (
				<div className="w-full aspect-video rounded-lg bg-bg-surface/40 overflow-hidden">
					<img
						src={`/api/modules/screenshot/download/${entry.filename}`}
						alt={entry.filename}
						className="w-full h-full object-cover"
						loading="lazy"
					/>
				</div>
			) : (
				<div className="w-full aspect-video rounded-lg bg-bg-surface/40 flex items-center justify-center gap-2">
					<Video size={24} strokeWidth={1.5} className="text-text-muted" />
					{entry.duration != null && (
						<span className="text-xs text-text-muted">{Math.round(entry.duration)}s</span>
					)}
				</div>
			)}

			<div className="space-y-1">
				<p className="text-xs text-text-primary truncate" title={entry.filename}>
					{entry.filename}
				</p>
				<p className="text-[10px] text-text-muted">
					{time} — {entry.deviceName}
				</p>
			</div>

			<div className="flex items-center gap-1.5">
				<button
					type="button"
					onClick={() => onDownload(entry.filename)}
					className="glass-button p-1.5"
					title="Download"
				>
					<Download size={14} strokeWidth={1.8} />
				</button>
				{isScreenshot && (
					<button
						type="button"
						onClick={() => onCopy(entry.filename)}
						className="glass-button p-1.5"
						title="Copy to clipboard"
					>
						<Copy size={14} strokeWidth={1.8} />
					</button>
				)}
				<button
					type="button"
					onClick={() => onDelete(entry.filename)}
					className="glass-button-destructive p-1.5"
					title="Delete"
				>
					<Trash2 size={14} strokeWidth={1.8} />
				</button>
			</div>
		</div>
	);
}

function ScreenshotPanel() {
	const { send } = useWs();
	const selectedDeviceId = useDeviceStore((s) => s.selectedDeviceIds[0] ?? null);
	const recordStartRef = useRef<Record<string, number>>({});

	const {
		captures,
		isRecording,
		loading,
		captureScreenshot,
		startRecording,
		stopRecording,
		fetchHistory,
		downloadFile,
		copyToClipboard,
		deleteCapture,
		clearAllCaptures,
	} = useScreenshotStore();

	useEffect(() => {
		fetchHistory();
	}, [fetchHistory]);

	// subscribe to screenshot WS channel
	useEffect(() => {
		send({
			channel: "system",
			type: "subscribe",
			payload: { channel: "screenshot" },
		});
		return () => {
			send({
				channel: "system",
				type: "unsubscribe",
				payload: { channel: "screenshot" },
			});
		};
	}, [send]);

	const handleRecordingStarted = useCallback((payload: unknown) => {
		const data = payload as { deviceId: string };
		useScreenshotStore.setState((s) => ({
			isRecording: { ...s.isRecording, [data.deviceId]: true },
		}));
		recordStartRef.current[data.deviceId] = Date.now();
	}, []);

	const handleRecordingStopped = useCallback(
		(payload: unknown) => {
			const data = payload as { deviceId: string };
			useScreenshotStore.setState((s) => ({
				isRecording: { ...s.isRecording, [data.deviceId]: false },
			}));
			delete recordStartRef.current[data.deviceId];
			fetchHistory();
		},
		[fetchHistory],
	);

	useWsListener("screenshot", "recording-started", handleRecordingStarted);
	useWsListener("screenshot", "recording-stopped", handleRecordingStopped);

	const deviceRecording = selectedDeviceId ? isRecording[selectedDeviceId] : false;

	const handleCapture = () => {
		if (selectedDeviceId) captureScreenshot(selectedDeviceId);
	};

	const handleToggleRecording = () => {
		if (!selectedDeviceId) return;
		if (deviceRecording) {
			stopRecording(selectedDeviceId);
		} else {
			recordStartRef.current[selectedDeviceId] = Date.now();
			startRecording(selectedDeviceId);
		}
	};

	return (
		<div className="p-6 space-y-4">
			{/* Header */}
			<div className="flex items-center justify-between">
				<h1 className="text-base font-medium text-text-primary">Screenshots & Recording</h1>
			</div>

			{/* No device */}
			{!selectedDeviceId && (
				<div className="glass-panel">
					<p className="glass-empty-state">
						Select a booted device to capture screenshots or record
					</p>
				</div>
			)}

			{/* Action bar */}
			{selectedDeviceId && (
				<div className="flex items-center gap-3">
					<button
						type="button"
						onClick={handleCapture}
						className="glass-button-primary flex items-center gap-2"
					>
						<Camera size={16} strokeWidth={1.8} />
						Capture Screenshot
					</button>
					<button
						type="button"
						onClick={handleToggleRecording}
						className={`flex items-center gap-2 ${
							deviceRecording ? "glass-button-destructive" : "glass-button"
						}`}
					>
						{deviceRecording ? (
							<>
								<Square size={14} strokeWidth={2} />
								Stop Recording
							</>
						) : (
							<>
								<Video size={16} strokeWidth={1.8} />
								Start Recording
							</>
						)}
					</button>
					{deviceRecording && selectedDeviceId && recordStartRef.current[selectedDeviceId] && (
						<RecordingTimer startTime={recordStartRef.current[selectedDeviceId]} />
					)}
				</div>
			)}

			{/* History grid */}
			{selectedDeviceId && (
				<>
					{loading && (
						<div className="glass-panel">
							<p className="glass-empty-state">Loading captures...</p>
						</div>
					)}

					{!loading && captures.length === 0 && (
						<div className="glass-panel">
							<p className="glass-empty-state">
								No captures yet — take a screenshot or start recording
							</p>
						</div>
					)}

					{!loading && captures.length > 0 && (
						<div className="space-y-3">
							<div className="flex items-center justify-between">
								<p className="text-xs text-text-muted">
									{captures.length} capture{captures.length !== 1 ? "s" : ""}
								</p>
								<button
									type="button"
									onClick={() => {
										if (window.confirm("Delete all captures?")) clearAllCaptures();
									}}
									className="glass-button-destructive text-xs flex items-center gap-1.5 px-2 py-1"
								>
									<Trash2 size={12} strokeWidth={1.8} />
									Clear All
								</button>
							</div>
							<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
								{captures.map((entry) => (
									<CaptureCard
										key={`${entry.filename}-${entry.timestamp}`}
										entry={entry}
										onDownload={downloadFile}
										onCopy={copyToClipboard}
										onDelete={deleteCapture}
									/>
								))}
							</div>
						</div>
					)}
				</>
			)}
		</div>
	);
}

registerPanel("screenshot", ScreenshotPanel);

export default ScreenshotPanel;
