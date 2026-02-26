import { RefreshCw } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { useDeviceStore } from "../stores/device-store";
import { registerPanel } from "../stores/panel-registry";

interface CrashLogEntry {
	id: string;
	process: string;
	timestamp: string;
	preview: string;
}

function CrashLogsPanel() {
	const selectedDeviceId = useDeviceStore((s) => s.selectedDeviceIds[0] ?? null);
	const [appFilter, setAppFilter] = useState("");
	const [sinceFilter, setSinceFilter] = useState("");
	const [logs, setLogs] = useState<CrashLogEntry[]>([]);
	const [loading, setLoading] = useState(false);
	const [viewingLog, setViewingLog] = useState<string | null>(null);
	const [logContent, setLogContent] = useState("");
	const [loadingContent, setLoadingContent] = useState(false);

	const fetchLogs = useCallback(async () => {
		if (!selectedDeviceId) return;
		setLoading(true);
		try {
			const params = new URLSearchParams();
			if (appFilter.trim()) params.set("app", appFilter.trim());
			if (sinceFilter.trim()) params.set("since", sinceFilter.trim());
			const qs = params.toString();
			const res = await fetch(
				`/api/modules/crash-logs/list/${selectedDeviceId}${qs ? `?${qs}` : ""}`,
			);
			if (!res.ok) throw new Error("Failed to fetch crash logs");
			const data = await res.json();
			const list = Array.isArray(data) ? data : ((data as { logs: CrashLogEntry[] }).logs ?? []);
			setLogs(list);
		} catch (err) {
			toast.error((err as Error).message);
			setLogs([]);
		} finally {
			setLoading(false);
		}
	}, [selectedDeviceId, appFilter, sinceFilter]);

	useEffect(() => {
		if (selectedDeviceId) fetchLogs();
	}, [selectedDeviceId, fetchLogs]);

	const viewLog = async (logId: string) => {
		if (!selectedDeviceId) return;
		setLoadingContent(true);
		setViewingLog(logId);
		try {
			const res = await fetch(`/api/modules/crash-logs/view/${selectedDeviceId}/${logId}`);
			if (!res.ok) throw new Error("Failed to load crash log");
			const data = await res.json();
			setLogContent((data as { content: string }).content ?? "");
		} catch (err) {
			toast.error((err as Error).message);
			setViewingLog(null);
		} finally {
			setLoadingContent(false);
		}
	};

	const formatTimestamp = (ts: string) => {
		try {
			return new Date(ts).toLocaleString();
		} catch {
			return ts;
		}
	};

	if (viewingLog) {
		return (
			<div className="p-6 space-y-4">
				<div className="flex items-center justify-between">
					<h1 className="text-base font-medium text-text-primary">Crash Log Detail</h1>
					<button
						type="button"
						onClick={() => {
							setViewingLog(null);
							setLogContent("");
						}}
						className="text-xs text-accent-blue hover:text-accent-blue/80 transition-colors"
					>
						Back to list
					</button>
				</div>
				<div className="glass-panel p-4">
					{loadingContent ? (
						<div className="flex items-center gap-2 text-sm text-text-secondary">
							<span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
							Loading...
						</div>
					) : (
						<pre className="text-xs text-text-secondary font-mono whitespace-pre-wrap break-words max-h-[70vh] overflow-auto">
							<code>{logContent}</code>
						</pre>
					)}
				</div>
			</div>
		);
	}

	return (
		<div className="p-6 space-y-4">
			{/* Header */}
			<div className="flex items-center justify-between">
				<h1 className="text-base font-medium text-text-primary">Crash Logs</h1>
			</div>

			{!selectedDeviceId && (
				<div className="glass-panel">
					<p className="glass-empty-state">Select a booted device to view crash logs</p>
				</div>
			)}

			{selectedDeviceId && (
				<>
					{/* Filters */}
					<div className="glass-panel p-4 space-y-3">
						<div className="flex items-center gap-2 flex-wrap">
							<input
								type="text"
								value={appFilter}
								onChange={(e) => setAppFilter(e.target.value)}
								placeholder="Filter by app name..."
								className="glass-input flex-1 min-w-[140px] text-xs"
							/>
							<input
								type="text"
								value={sinceFilter}
								onChange={(e) => setSinceFilter(e.target.value)}
								placeholder="Since (ISO date)..."
								className="glass-input flex-1 min-w-[140px] text-xs"
							/>
							<button
								type="button"
								onClick={fetchLogs}
								disabled={loading}
								className="glass-button-primary flex items-center gap-1.5"
							>
								<RefreshCw size={12} strokeWidth={1.8} className={loading ? "animate-spin" : ""} />
								Refresh
							</button>
						</div>
					</div>

					{/* Log list */}
					<div className="glass-panel divide-y divide-border/30">
						{loading && logs.length === 0 && (
							<div className="p-8 text-center">
								<span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-text-secondary border-t-transparent" />
							</div>
						)}
						{!loading && logs.length === 0 && (
							<div className="glass-empty-state">No crash logs found</div>
						)}
						{logs.map((log) => (
							<button
								key={log.id}
								type="button"
								onClick={() => viewLog(log.id)}
								className="w-full text-left p-3 hover:bg-bg-surface/30 transition-colors"
							>
								<div className="flex items-center justify-between mb-1">
									<span className="text-sm font-medium text-text-primary">{log.process}</span>
									<span className="text-[11px] text-text-muted">
										{formatTimestamp(log.timestamp)}
									</span>
								</div>
								<p className="text-xs text-text-secondary line-clamp-2">{log.preview}</p>
							</button>
						))}
					</div>
				</>
			)}
		</div>
	);
}

registerPanel("crash-logs", CrashLogsPanel);

export default CrashLogsPanel;
