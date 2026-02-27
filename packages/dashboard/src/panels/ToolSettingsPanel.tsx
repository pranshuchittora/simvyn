import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
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

function ToolSettingsPanel() {
	const [config, setConfig] = useState<ToolConfig>({
		port: 3847,
		autoOpen: true,
		pollInterval: 5000,
	});
	const [storage, setStorage] = useState<StorageInfo | null>(null);
	const [saving, setSaving] = useState(false);

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
	}, [fetchStorage]);

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

	return (
		<div className="p-6 space-y-4">
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
								setConfig((c) => ({ ...c, pollInterval: Number(e.target.value) * 1000 }))
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
		</div>
	);
}

registerPanel("tool-settings", ToolSettingsPanel);

export default ToolSettingsPanel;
