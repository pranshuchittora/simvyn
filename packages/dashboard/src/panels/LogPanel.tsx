import type { LogEntry } from "@simvyn/types";
import { useCallback, useEffect, useRef } from "react";
import { useWs, useWsListener } from "../hooks/use-ws";
import { useDeviceStore } from "../stores/device-store";
import { registerPanel } from "../stores/panel-registry";
import LogList from "./logs/LogList";
import LogToolbar from "./logs/LogToolbar";
import SearchOverlay from "./logs/SearchOverlay";
import { useLogStore } from "./logs/stores/log-store";
import { useSearchStore } from "./logs/stores/search-store";

function LogPanel() {
	const { send } = useWs();
	const selectedDeviceId = useDeviceStore((s) => s.selectedDeviceIds[0] ?? null);
	const selectedDeviceIdRef = useRef<string | null>(null);
	const addNewBatch = useLogStore((s) => s.addNewBatch);
	const prependHistory = useLogStore((s) => s.prependHistory);
	const setLoadingHistory = useLogStore((s) => s.setLoadingHistory);
	const clear = useLogStore((s) => s.clear);
	const reset = useLogStore((s) => s.reset);
	const setStreaming = useLogStore((s) => s.setStreaming);
	const isPaused = useLogStore((s) => s.isPaused);
	const hasMore = useLogStore((s) => s.hasMore);
	const isLoadingHistory = useLogStore((s) => s.isLoadingHistory);

	useEffect(() => {
		selectedDeviceIdRef.current = selectedDeviceId;
	}, [selectedDeviceId]);

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
			useLogStore.getState().resume();
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

	// pause/resume: stop or restart the WS stream
	const wasPausedRef = useRef(false);
	useEffect(() => {
		const deviceId = selectedDeviceIdRef.current;
		if (!deviceId) return;
		if (isPaused) {
			send({ channel: "logs", type: "stop-stream", payload: { deviceId } });
		} else if (wasPausedRef.current) {
			clear();
			send({ channel: "logs", type: "start-stream", payload: { deviceId } });
			send({ channel: "logs", type: "get-history", payload: { deviceId, limit: 500 } });
		}
		wasPausedRef.current = isPaused;
	}, [isPaused, send, clear]);

	// Cmd+F to open search overlay
	useEffect(() => {
		function handleKeyDown(e: KeyboardEvent) {
			if ((e.metaKey || e.ctrlKey) && e.key === "f") {
				e.preventDefault();
				useSearchStore.getState().open();
			}
		}
		window.addEventListener("keydown", handleKeyDown);
		return () => window.removeEventListener("keydown", handleKeyDown);
	}, []);

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
			if (!useLogStore.getState().isPaused) {
				setStreaming(data.deviceId);
			}
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
			</div>

			{!selectedDeviceId && (
				<div className="glass-empty-state flex-1 flex items-center justify-center">
					<p>Select a booted device to stream logs</p>
				</div>
			)}

			{selectedDeviceId && (
				<>
					<LogToolbar selectedDeviceId={selectedDeviceId} />
					<div className="flex-1 min-h-0 relative">
						<SearchOverlay />
						<LogList onLoadMore={loadMoreHistory} />
					</div>
				</>
			)}
		</div>
	);
}

registerPanel("logs", LogPanel);
export default LogPanel;
