import type { LogEntry } from "@simvyn/types";
import { useCallback, useEffect, useRef, useState } from "react";
import { useWs, useWsListener } from "../hooks/use-ws";
import { useDeviceStore } from "../stores/device-store";
import { registerPanel } from "../stores/panel-registry";
import LogList from "./logs/LogList";
import LogToolbar from "./logs/LogToolbar";
import { useLogStore } from "./logs/stores/log-store";

function LogPanel() {
	const { send } = useWs();
	const devices = useDeviceStore((s) => s.devices);
	const selectedDeviceIdRef = useRef<string | null>(null);
	const [selectedDeviceId, setSelectedDeviceId] = useState<string | null>(null);
	const addNewBatch = useLogStore((s) => s.addNewBatch);
	const prependHistory = useLogStore((s) => s.prependHistory);
	const setLoadingHistory = useLogStore((s) => s.setLoadingHistory);
	const clear = useLogStore((s) => s.clear);
	const reset = useLogStore((s) => s.reset);
	const setStreaming = useLogStore((s) => s.setStreaming);
	const hasMore = useLogStore((s) => s.hasMore);
	const isLoadingHistory = useLogStore((s) => s.isLoadingHistory);

	const bootedDevices = devices.filter((d) => d.state === "booted");

	useEffect(() => {
		selectedDeviceIdRef.current = selectedDeviceId;
	}, [selectedDeviceId]);

	// auto-select first booted device
	useEffect(() => {
		if (!selectedDeviceId || !devices.find((d) => d.id === selectedDeviceId)) {
			const booted = bootedDevices[0];
			if (booted) setSelectedDeviceId(booted.id);
		}
	}, [devices, selectedDeviceId, bootedDevices]);

	// subscribe to logs channel + cleanup on unmount
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
			reset();
		};
	}, [send, reset]);

	// start/stop stream + fetch initial history on device change
	const prevDeviceRef = useRef<string | null>(null);
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
			send({
				channel: "logs",
				type: "get-history",
				payload: { deviceId: selectedDeviceId, limit: 500 },
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

	const loadMoreHistory = useCallback(() => {
		if (!selectedDeviceId || !hasMore || isLoadingHistory) return;
		setLoadingHistory(true);
		const currentCursor = useLogStore.getState().cursor;
		send({
			channel: "logs",
			type: "get-history",
			payload: {
				deviceId: selectedDeviceId,
				before: currentCursor ?? undefined,
				limit: 500,
			},
		});
	}, [selectedDeviceId, hasMore, isLoadingHistory, send, setLoadingHistory]);

	// WS event handlers
	const handleLogBatch = useCallback(
		(payload: unknown) => {
			const data = payload as { deviceId: string; entries: LogEntry[] };
			if (data.deviceId === selectedDeviceIdRef.current) {
				addNewBatch(data.entries);
			}
		},
		[addNewBatch],
	);

	const handleHistoryPage = useCallback(
		(payload: unknown) => {
			const data = payload as {
				deviceId: string;
				entries: LogEntry[];
				cursor: number;
				hasMore: boolean;
			};
			if (data.deviceId === selectedDeviceIdRef.current) {
				prependHistory(data.entries, data.cursor, data.hasMore);
			}
		},
		[prependHistory],
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

	const handleDeviceCleared = useCallback(
		(payload: unknown) => {
			const data = payload as { deviceId: string };
			if (data.deviceId === selectedDeviceIdRef.current) {
				clear();
			}
		},
		[clear],
	);

	const handleError = useCallback((payload: unknown) => {
		const data = payload as { message: string };
		console.error("[logs]", data.message);
	}, []);

	useWsListener("logs", "log-batch", handleLogBatch);
	useWsListener("logs", "history-page", handleHistoryPage);
	useWsListener("logs", "stream-started", handleStreamStarted);
	useWsListener("logs", "stream-stopped", handleStreamStopped);
	useWsListener("logs", "device-cleared", handleDeviceCleared);
	useWsListener("logs", "error", handleError);

	return (
		<div className="flex flex-col h-full p-6 gap-4">
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

			{!selectedDeviceId && (
				<div className="glass-empty-state flex-1 flex items-center justify-center">
					<p>Select a booted device to stream logs</p>
				</div>
			)}

			{selectedDeviceId && (
				<>
					<LogToolbar selectedDeviceId={selectedDeviceId} />
					<div className="flex-1 min-h-0">
						<LogList onLoadMore={loadMoreHistory} />
					</div>
				</>
			)}
		</div>
	);
}

registerPanel("logs", LogPanel);
export default LogPanel;
