import { Bug, Check, ChevronDown, Copy, ExternalLink, Github, Heart } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import type { ConsoleEntry } from "../stores/console-capture";
import { getConsoleLogs } from "../stores/console-capture";
import { useDeviceStore } from "../stores/device-store";
import { useModuleStore } from "../stores/module-store";
import { registerPanel } from "../stores/panel-registry";

interface ToolConfig {
	port: number;
	autoOpen: boolean;
	pollInterval: number;
}

interface StorageInfo {
	totalBytes: number;
	humanReadable: string;
}

interface DiagnosticsInfo {
	devicectl: { available: boolean; version?: string; error?: string };
	xcodeVersion?: string;
	adbVersion?: string;
	platform: string;
}

function ToolSettingsPanel() {
	const [config, setConfig] = useState<ToolConfig>({
		port: 3847,
		autoOpen: true,
		pollInterval: 5000,
	});
	const [storage, setStorage] = useState<StorageInfo | null>(null);
	const [diagnostics, setDiagnostics] = useState<DiagnosticsInfo | null>(null);
	const [saving, setSaving] = useState(false);
	const [debugOpen, setDebugOpen] = useState(false);
	const [consoleLogs, setConsoleLogs] = useState<ConsoleEntry[]>([]);
	const [copied, setCopied] = useState(false);

	const devices = useDeviceStore((s) => s.devices);
	const modules = useModuleStore((s) => s.modules);
	const version: string = __APP_VERSION__;

	const fetchStorage = useCallback(() => {
		fetch("/api/tool-settings/storage")
			.then((r) => r.json())
			.then((data) => setStorage(data as StorageInfo))
			.catch(() => {});
	}, []);

	useEffect(() => {
		fetch("/api/tool-settings/config")
			.then((r) => r.json())
			.then((data) => setConfig(data as ToolConfig))
			.catch(() => {});

		fetchStorage();

		fetch("/api/tool-settings/diagnostics")
			.then((r) => r.json())
			.then((data) => setDiagnostics(data as DiagnosticsInfo))
			.catch(() => {});
	}, [fetchStorage]);

	useEffect(() => {
		if (!debugOpen) return;
		setConsoleLogs(getConsoleLogs());
		const interval = setInterval(() => setConsoleLogs(getConsoleLogs()), 2000);
		return () => clearInterval(interval);
	}, [debugOpen]);

	const saveConfig = async () => {
		setSaving(true);
		try {
			const res = await fetch("/api/tool-settings/config", {
				method: "PUT",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify(config),
			});
			if (!res.ok) throw new Error("Failed to save");
			const updated = await res.json();
			setConfig(updated as ToolConfig);
			toast.success("Configuration saved");
		} catch (err) {
			toast.error((err as Error).message);
		} finally {
			setSaving(false);
		}
	};

	const wipeData = async () => {
		if (!window.confirm("This will permanently delete all simvyn data. Are you sure?")) return;
		try {
			const res = await fetch("/api/tool-settings/data", { method: "DELETE" });
			if (!res.ok) throw new Error("Failed to wipe data");
			toast.success("All data wiped");
			fetchStorage();
		} catch (err) {
			toast.error((err as Error).message);
		}
	};

	const debugReport = useMemo(() => {
		const ua = navigator.userAgent;
		const lines = [
			"## simvyn Debug Report",
			"",
			"### Environment",
			`- **simvyn version**: ${version}`,
			`- **Dashboard URL**: ${window.location.href}`,
			`- **User Agent**: ${ua}`,
			`- **Viewport**: ${window.innerWidth}x${window.innerHeight}`,
			`- **Server port**: ${config.port}`,
			`- **Polling interval**: ${config.pollInterval / 1000}s`,
			"",
			"### Connected Devices",
		];

		if (devices.length === 0) {
			lines.push("_No devices connected_");
		} else {
			lines.push("| Name | Platform | OS | State | Type |");
			lines.push("|------|----------|----|-------|------|");
			for (const d of devices) {
				lines.push(`| ${d.name} | ${d.platform} | ${d.osVersion} | ${d.state} | ${d.deviceType} |`);
			}
		}

		lines.push("", "### Loaded Modules");
		lines.push(modules.map((m) => m.name).join(", ") || "_None_");

		lines.push("", "### Console Logs (last 50)");
		lines.push("```");
		const recent = consoleLogs.slice(-50);
		for (const entry of recent) {
			const ts = entry.timestamp.split("T")[1]?.slice(0, 12) ?? entry.timestamp;
			lines.push(`[${ts}] [${entry.level.toUpperCase()}] ${entry.message}`);
		}
		if (recent.length === 0) lines.push("(no logs captured)");
		lines.push("```");

		return lines.join("\n");
	}, [version, config, devices, modules, consoleLogs]);

	const copyDebugReport = () => {
		navigator.clipboard.writeText(debugReport).then(() => {
			setCopied(true);
			toast.success("Debug report copied to clipboard");
			setTimeout(() => setCopied(false), 2000);
		});
	};

	const logLevelColor: Record<string, string> = {
		error: "text-red-400",
		warn: "text-yellow-400",
		info: "text-blue-400",
		log: "text-text-muted",
	};

	return (
		<div className="p-6 space-y-4 overflow-y-auto max-h-full">
			<div className="flex items-center justify-between">
				<h1 className="text-base font-medium text-text-primary">Tool Settings</h1>
			</div>

			{/* Server Configuration */}
			<div className="glass-panel rounded-xl p-4 space-y-3">
				<h2 className="text-sm font-medium text-text-secondary uppercase tracking-wide">
					Server Configuration
				</h2>
				<div className="space-y-3">
					<div className="flex items-center gap-3">
						<label htmlFor="ts-port" className="text-xs text-text-secondary w-20">
							Port
						</label>
						<input
							id="ts-port"
							type="number"
							value={config.port}
							onChange={(e) => setConfig((c) => ({ ...c, port: Number(e.target.value) }))}
							className="glass-textarea w-28 px-2 py-1 text-xs"
							min={1024}
							max={65535}
						/>
					</div>
					<div className="flex items-center gap-3">
						<label htmlFor="ts-autoopen" className="text-xs text-text-secondary w-20">
							Auto-open
						</label>
						<button
							id="ts-autoopen"
							type="button"
							onClick={() => setConfig((c) => ({ ...c, autoOpen: !c.autoOpen }))}
							className={`relative w-9 h-5 rounded-full transition-colors ${
								config.autoOpen ? "bg-accent" : "bg-bg-surface/40"
							}`}
						>
							<span
								className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white transition-transform ${
									config.autoOpen ? "translate-x-4" : ""
								}`}
							/>
						</button>
						<span className="text-xs text-text-muted">
							{config.autoOpen ? "Opens browser on launch" : "No auto-open"}
						</span>
					</div>
					<div className="flex items-center gap-3">
						<label htmlFor="ts-poll" className="text-xs text-text-secondary w-20">
							Polling
						</label>
						<input
							id="ts-poll"
							type="range"
							min={1}
							max={30}
							step={1}
							value={config.pollInterval / 1000}
							onChange={(e) =>
								setConfig((c) => ({
									...c,
									pollInterval: Number(e.target.value) * 1000,
								}))
							}
							className="w-28 accent-accent"
						/>
						<span className="text-xs text-text-muted tabular-nums w-8">
							{config.pollInterval / 1000}s
						</span>
					</div>
					<div className="flex items-center gap-2 pt-1">
						<button
							type="button"
							onClick={saveConfig}
							disabled={saving}
							className="glass-button-primary"
						>
							{saving ? "Saving..." : "Save"}
						</button>
					</div>
					<p className="text-[11px] text-text-muted">
						Port and auto-open take effect on next restart. Polling applies immediately.
					</p>
				</div>
			</div>

			{/* Storage */}
			<div className="glass-panel rounded-xl p-4 space-y-3">
				<h2 className="text-sm font-medium text-text-secondary uppercase tracking-wide">Storage</h2>
				<div className="flex items-center gap-3">
					<span className="text-2xl font-semibold text-text-primary">
						{storage?.humanReadable ?? "..."}
					</span>
					<span className="text-xs text-text-muted">Data stored in ~/.simvyn/</span>
				</div>
				<button type="button" onClick={fetchStorage} className="glass-button-primary text-xs">
					Refresh
				</button>
			</div>

			{/* Data Management */}
			<div className="glass-panel rounded-xl p-4 space-y-3">
				<h2 className="text-sm font-medium text-text-secondary uppercase tracking-wide">
					Data Management
				</h2>
				<p className="text-xs text-text-muted">
					Delete all saved favorites, history, preferences, and captures
				</p>
				<button type="button" onClick={wipeData} className="glass-button-destructive">
					Wipe All Data
				</button>
			</div>

			{/* Diagnostics */}
			<div className="glass-panel rounded-xl p-4 space-y-3">
				<h2 className="text-sm font-medium text-text-secondary uppercase tracking-wide">
					Diagnostics
				</h2>
				<div className="space-y-2 text-sm">
					<div className="flex justify-between">
						<span className="text-text-secondary">Platform</span>
						<span className="text-text-primary">{diagnostics?.platform ?? "..."}</span>
					</div>
					{diagnostics?.xcodeVersion && (
						<div className="flex justify-between">
							<span className="text-text-secondary">Xcode</span>
							<span className="text-text-primary">{diagnostics.xcodeVersion}</span>
						</div>
					)}
					<div className="flex justify-between">
						<span className="text-text-secondary">devicectl (iOS devices)</span>
						<span
							className={diagnostics?.devicectl.available ? "text-green-400" : "text-amber-400"}
						>
							{diagnostics?.devicectl.available
								? `Available${diagnostics.devicectl.version ? ` (${diagnostics.devicectl.version})` : ""}`
								: diagnostics
									? "Not available — Xcode 15+ required for physical iOS devices"
									: "..."}
						</span>
					</div>
					{diagnostics?.adbVersion && (
						<div className="flex justify-between">
							<span className="text-text-secondary">adb</span>
							<span className="text-text-primary">{diagnostics.adbVersion}</span>
						</div>
					)}
				</div>
			</div>

			{/* About */}
			<div className="glass-panel rounded-xl p-4 space-y-3">
				<h2 className="text-sm font-medium text-text-secondary uppercase tracking-wide">About</h2>
				<div className="flex items-center gap-3">
					<img src="/icon-512.png" alt="" className="w-10 h-10 rounded-lg" draggable={false} />
					<div>
						<p className="text-sm font-medium text-text-primary">simvyn</p>
						<p className="text-xs text-text-muted">v{version} &middot; MIT License</p>
					</div>
				</div>
				<p className="text-xs text-text-secondary">
					Universal devtool for iOS Simulators & Android Emulators.
				</p>
				<p className="text-xs text-text-muted">
					Built by{" "}
					<a
						href="https://github.com/pranshuchittora"
						target="_blank"
						rel="noopener noreferrer"
						className="text-accent-blue hover:underline"
					>
						Pranshu Chittora
					</a>
				</p>
				<div className="flex items-center gap-2 pt-1 flex-wrap">
					<a
						href="https://github.com/pranshuchittora/simvyn"
						target="_blank"
						rel="noopener noreferrer"
						className="glass-button inline-flex items-center gap-1.5"
					>
						<Github size={12} />
						GitHub
						<ExternalLink size={10} className="opacity-50" />
					</a>
					<a
						href="https://github.com/pranshuchittora/simvyn/issues/new"
						target="_blank"
						rel="noopener noreferrer"
						className="glass-button inline-flex items-center gap-1.5"
					>
						<Bug size={12} />
						File an Issue
						<ExternalLink size={10} className="opacity-50" />
					</a>
					<a
						href="https://github.com/pranshuchittora/simvyn"
						target="_blank"
						rel="noopener noreferrer"
						className="glass-button inline-flex items-center gap-1.5"
					>
						<Heart size={12} />
						Star on GitHub
						<ExternalLink size={10} className="opacity-50" />
					</a>
				</div>
			</div>

			{/* Debug Information (collapsible) */}
			<div className="glass-panel rounded-xl overflow-hidden">
				<button
					type="button"
					onClick={() => setDebugOpen((o) => !o)}
					className="w-full flex items-center justify-between p-4 hover:bg-white/[0.02] transition-colors cursor-pointer bg-transparent border-none text-left"
				>
					<h2 className="text-sm font-medium text-text-secondary uppercase tracking-wide">
						Debug Information
					</h2>
					<ChevronDown
						size={14}
						className={`text-text-muted transition-transform duration-200 ${debugOpen ? "rotate-180" : ""}`}
					/>
				</button>

				{debugOpen && (
					<div className="px-4 pb-4 space-y-4 border-t border-glass-border">
						<p className="text-[11px] text-text-muted pt-3">
							Useful when filing a bug report. Copy and paste into the issue.
						</p>

						{/* Environment */}
						<div className="space-y-1.5">
							<h3 className="text-xs font-medium text-text-secondary">Environment</h3>
							<div className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-xs">
								<span className="text-text-muted">Version</span>
								<span className="text-text-primary font-mono">v{version}</span>
								<span className="text-text-muted">Browser</span>
								<span className="text-text-primary font-mono truncate">{navigator.userAgent}</span>
								<span className="text-text-muted">Viewport</span>
								<span className="text-text-primary font-mono">
									{window.innerWidth}x{window.innerHeight}
								</span>
								<span className="text-text-muted">Server</span>
								<span className="text-text-primary font-mono">
									:{config.port} (poll: {config.pollInterval / 1000}s)
								</span>
							</div>
						</div>

						{/* Devices */}
						<div className="space-y-1.5">
							<h3 className="text-xs font-medium text-text-secondary">
								Connected Devices ({devices.length})
							</h3>
							{devices.length === 0 ? (
								<p className="text-xs text-text-muted italic">No devices connected</p>
							) : (
								<div className="space-y-1">
									{devices.map((d) => (
										<div
											key={d.id}
											className="flex items-center gap-2 text-xs bg-white/[0.02] rounded-lg px-2.5 py-1.5"
										>
											<span
												className={`h-1.5 w-1.5 rounded-full ${d.state === "booted" ? "bg-green-500" : "bg-text-muted"}`}
											/>
											<span className="text-text-primary font-medium">{d.name}</span>
											<span className="text-text-muted">
												{d.platform} {d.osVersion}
											</span>
											<span className="text-text-muted ml-auto">{d.deviceType}</span>
										</div>
									))}
								</div>
							)}
						</div>

						{/* Modules */}
						<div className="space-y-1.5">
							<h3 className="text-xs font-medium text-text-secondary">
								Loaded Modules ({modules.length})
							</h3>
							<div className="flex flex-wrap gap-1">
								{modules.map((m) => (
									<span
										key={m.name}
										className="glass-badge border-glass-border text-text-muted bg-white/[0.03]"
									>
										{m.name}
									</span>
								))}
							</div>
						</div>

						{/* Console Logs */}
						<div className="space-y-1.5">
							<h3 className="text-xs font-medium text-text-secondary">
								Console Logs ({consoleLogs.length})
							</h3>
							<div className="max-h-48 overflow-y-auto rounded-lg bg-black/20 p-2 font-mono text-[10px] leading-relaxed space-y-px">
								{consoleLogs.length === 0 ? (
									<p className="text-text-muted italic p-2">No logs captured</p>
								) : (
									consoleLogs.slice(-100).map((entry) => {
										const ts = entry.timestamp.split("T")[1]?.slice(0, 12) ?? entry.timestamp;
										const key = `${entry.timestamp}-${entry.level}-${entry.message.slice(0, 40)}`;
										return (
											<div key={key} className="flex gap-1.5 hover:bg-white/[0.02]">
												<span className="text-text-muted shrink-0">{ts}</span>
												<span
													className={`shrink-0 uppercase w-10 ${logLevelColor[entry.level] ?? "text-text-muted"}`}
												>
													{entry.level}
												</span>
												<span className="text-text-primary break-all">{entry.message}</span>
											</div>
										);
									})
								)}
							</div>
						</div>

						{/* Copy button */}
						<button
							type="button"
							onClick={copyDebugReport}
							className="glass-button-primary inline-flex items-center gap-1.5"
						>
							{copied ? <Check size={12} /> : <Copy size={12} />}
							{copied ? "Copied!" : "Copy Debug Report"}
						</button>
					</div>
				)}
			</div>
		</div>
	);
}

registerPanel("tool-settings", ToolSettingsPanel);

export default ToolSettingsPanel;
