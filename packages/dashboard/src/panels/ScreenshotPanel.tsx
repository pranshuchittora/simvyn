import { Camera, Copy, Download, Square, Video } from "lucide-react";
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
}: {
	entry: CaptureEntry;
	onDownload: (filename: string) => void;
	onCopy: (filename: string) => void;
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
					className="rounded-[var(--radius-button)] bg-bg-surface/60 p-1.5 text-text-secondary hover:text-text-primary hover:bg-glass transition-colors"
					title="Download"
				>
					<Download size={14} strokeWidth={1.8} />
				</button>
				{isScreenshot && (
					<button
						type="button"
						onClick={() => onCopy(entry.filename)}
						className="rounded-[var(--radius-button)] bg-bg-surface/60 p-1.5 text-text-secondary hover:text-text-primary hover:bg-glass transition-colors"
						title="Copy to clipboard"
					>
						<Copy size={14} strokeWidth={1.8} />
					</button>
				)}
			</div>
		</div>
	);
}

function ScreenshotPanel() {
	const { send } = useWs();
	const devices = useDeviceStore((s) => s.devices);
	const [selectedDeviceId, setSelectedDeviceId] = useState<string | null>(null);
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
	} = useScreenshotStore();

	const bootedDevices = devices.filter((d) => d.state === "booted");

	useEffect(() => {
		if (!selectedDeviceId || !devices.find((d) => d.id === selectedDeviceId)) {
			const booted = bootedDevices[0];
			if (booted) setSelectedDeviceId(booted.id);
		}
	}, [devices, selectedDeviceId, bootedDevices]);

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
				<select
					value={selectedDeviceId ?? ""}
					onChange={(e) => setSelectedDeviceId(e.target.value || null)}
					className="rounded-[var(--radius-button)] bg-bg-surface/60 border border-border px-2 py-1.5 text-xs text-text-secondary max-w-[200px] truncate"
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
				<div className="glass-panel p-12 text-center">
					<p className="text-text-secondary">
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
						className="flex items-center gap-2 rounded-[var(--radius-button)] bg-accent-blue/20 border border-accent-blue/30 px-3 py-1.5 text-sm text-accent-blue hover:bg-accent-blue/30 transition-colors"
					>
						<Camera size={16} strokeWidth={1.8} />
						Capture Screenshot
					</button>
					<button
						type="button"
						onClick={handleToggleRecording}
						className={`flex items-center gap-2 rounded-[var(--radius-button)] px-3 py-1.5 text-sm transition-colors ${
							deviceRecording
								? "bg-red-500/20 border border-red-500/30 text-red-400 hover:bg-red-500/30"
								: "bg-bg-surface/60 border border-border text-text-secondary hover:text-text-primary hover:bg-glass"
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
						<div className="glass-panel p-8 text-center">
							<p className="text-sm text-text-muted">Loading captures...</p>
						</div>
					)}

					{!loading && captures.length === 0 && (
						<div className="glass-panel p-8 text-center">
							<p className="text-sm text-text-secondary">
								No captures yet — take a screenshot or start recording
							</p>
						</div>
					)}

					{!loading && captures.length > 0 && (
						<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
							{captures.map((entry) => (
								<CaptureCard
									key={`${entry.filename}-${entry.timestamp}`}
									entry={entry}
									onDownload={downloadFile}
									onCopy={copyToClipboard}
								/>
							))}
						</div>
					)}
				</>
			)}
		</div>
	);
}

registerPanel("screenshot", ScreenshotPanel);

export default ScreenshotPanel;
