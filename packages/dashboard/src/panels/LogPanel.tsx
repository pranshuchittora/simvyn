import type { LogEntry } from "@simvyn/types";
import { useCallback, useEffect, useRef, useState } from "react";
import { useWs, useWsListener } from "../hooks/use-ws";
import { useDeviceStore } from "../stores/device-store";
import { registerPanel } from "../stores/panel-registry";
import LogList from "./logs/LogList";
import LogToolbar from "./logs/LogToolbar";
import { selectFilteredEntries, useLogStore } from "./logs/stores/log-store";

function LogPanel() {
	const { send } = useWs();
	const devices = useDeviceStore((s) => s.devices);
	const [selectedDeviceId, setSelectedDeviceId] = useState<string | null>(null);
	const addBatch = useLogStore((s) => s.addBatch);
	const clear = useLogStore((s) => s.clear);
	const setStreaming = useLogStore((s) => s.setStreaming);
	const filteredEntries = useLogStore(selectFilteredEntries);
	const prevDeviceRef = useRef<string | null>(null);

	const bootedDevices = devices.filter((d) => d.state === "booted");

	// auto-select first booted device
	useEffect(() => {
		if (!selectedDeviceId || !devices.find((d) => d.id === selectedDeviceId)) {
			const booted = bootedDevices[0];
			if (booted) setSelectedDeviceId(booted.id);
		}
	}, [devices, selectedDeviceId, bootedDevices]);

	// subscribe to logs channel
	useEffect(() => {
		send({
			channel: "system",
			type: "subscribe",
			payload: { channel: "logs" },
		});
		return () => {
			send({
				channel: "system",
				type: "unsubscribe",
				payload: { channel: "logs" },
			});
		};
	}, [send]);

	// start/stop stream on device change
	useEffect(() => {
		if (prevDeviceRef.current && prevDeviceRef.current !== selectedDeviceId) {
			send({
				channel: "logs",
				type: "stop-stream",
				payload: { deviceId: prevDeviceRef.current },
			});
			clear();
		}

		if (selectedDeviceId) {
			send({
				channel: "logs",
				type: "start-stream",
				payload: { deviceId: selectedDeviceId },
			});
		}

		prevDeviceRef.current = selectedDeviceId;

		return () => {
			if (selectedDeviceId) {
				send({
					channel: "logs",
					type: "stop-stream",
					payload: { deviceId: selectedDeviceId },
				});
			}
		};
	}, [selectedDeviceId, send, clear]);

	// WS event handlers
	const handleLogBatch = useCallback(
		(payload: unknown) => {
			const data = payload as { deviceId: string; entries: LogEntry[] };
			if (data.deviceId === selectedDeviceId) {
				addBatch(data.entries);
			}
		},
		[selectedDeviceId, addBatch],
	);

	const handleStreamStarted = useCallback(
		(payload: unknown) => {
			const data = payload as { deviceId: string };
			setStreaming(data.deviceId);
		},
		[setStreaming],
	);

	const handleStreamStopped = useCallback(
		(_payload: unknown) => {
			setStreaming(null);
		},
		[setStreaming],
	);

	const handleError = useCallback((payload: unknown) => {
		const data = payload as { message: string };
		console.error("[logs]", data.message);
	}, []);

	useWsListener("logs", "log-batch", handleLogBatch);
	useWsListener("logs", "stream-started", handleStreamStarted);
	useWsListener("logs", "stream-stopped", handleStreamStopped);
	useWsListener("logs", "error", handleError);

	return (
		<div className="flex flex-col h-full p-6 gap-4">
			{/* Header */}
			<div className="flex items-center justify-between">
				<h1 className="text-base font-medium text-text-primary">Log Viewer</h1>
				<select
					value={selectedDeviceId ?? ""}
					onChange={(e) => setSelectedDeviceId(e.target.value || null)}
					className="glass-select max-w-[200px] truncate"
				>
					<option value="">No device</option>
					{devices.map((d) => (
						<option key={d.id} value={d.id}>
							{d.name} {d.state === "booted" ? "" : `(${d.state})`}
						</option>
					))}
				</select>
			</div>

			{/* No device selected */}
			{!selectedDeviceId && (
				<div className="glass-empty-state flex-1 flex items-center justify-center">
					<p>Select a booted device to stream logs</p>
				</div>
			)}

			{/* Device selected */}
			{selectedDeviceId && (
				<>
					<LogToolbar />
					<div className="flex-1 min-h-0">
						<LogList entries={filteredEntries} />
					</div>
				</>
			)}
		</div>
	);
}

registerPanel("logs", LogPanel);

export default LogPanel;
