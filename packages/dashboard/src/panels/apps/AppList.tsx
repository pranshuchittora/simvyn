import AppActions from "./AppActions";
import { type AppInfo, useAppStore } from "./stores/app-store";

interface AppListProps {
	deviceId: string;
	onRefresh: () => void;
}

export default function AppList({ deviceId, onRefresh }: AppListProps) {
	const apps = useAppStore((s) => s.apps);
	const loading = useAppStore((s) => s.loading);
	const error = useAppStore((s) => s.error);
	const filter = useAppStore((s) => s.filter);
	const setFilter = useAppStore((s) => s.setFilter);

	const filtered = filter === "all" ? apps : apps.filter((a: AppInfo) => a.type === filter);

	const filters: Array<{ label: string; value: "all" | "user" | "system" }> = [
		{ label: "All", value: "all" },
		{ label: "User", value: "user" },
		{ label: "System", value: "system" },
	];

	return (
		<div className="flex flex-col gap-3">
			{/* Filter bar */}
			<div className="flex items-center gap-2">
				{filters.map((f) => (
					<button
						key={f.value}
						type="button"
						onClick={() => setFilter(f.value)}
						className={`rounded-[var(--radius-button)] border px-2.5 py-1 text-xs font-medium transition-colors ${
							filter === f.value
								? "bg-accent-blue/20 text-accent-blue border-accent-blue/30"
								: "bg-bg-surface/60 border-border text-text-secondary hover:text-text-primary hover:bg-glass"
						}`}
					>
						{f.label}
					</button>
				))}
				<span className="text-xs text-text-muted ml-auto">
					{filtered.length} app{filtered.length !== 1 ? "s" : ""}
				</span>
			</div>

			{/* Error */}
			{error && (
				<div className="rounded-[var(--radius-button)] bg-red-900/40 border border-red-500/30 px-4 py-2 text-sm text-red-300">
					{error}
				</div>
			)}

			{/* Loading */}
			{loading && (
				<div className="flex items-center justify-center py-8 text-text-muted text-sm">
					<span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent mr-2" />
					Loading apps...
				</div>
			)}

			{/* Empty */}
			{!loading && !error && filtered.length === 0 && (
				<div className="glass-panel p-8 text-center text-text-secondary text-sm">No apps found</div>
			)}

			{/* App table */}
			{!loading && filtered.length > 0 && (
				<div className="glass-panel overflow-hidden">
					<table className="w-full text-sm">
						<thead>
							<tr className="border-b border-border text-left text-xs text-text-muted uppercase tracking-wider">
								<th className="px-4 py-2 font-medium">Name</th>
								<th className="px-4 py-2 font-medium">Bundle ID</th>
								<th className="px-4 py-2 font-medium">Version</th>
								<th className="px-4 py-2 font-medium">Type</th>
								<th className="px-4 py-2 font-medium text-right">Actions</th>
							</tr>
						</thead>
						<tbody>
							{filtered.map((app: AppInfo) => (
								<tr
									key={app.bundleId}
									className="border-b border-border/50 hover:bg-white/[0.03] transition-colors"
								>
									<td className="px-4 py-2 text-text-primary truncate max-w-[180px]">{app.name}</td>
									<td className="px-4 py-2 text-text-secondary truncate max-w-[220px] font-mono text-xs">
										{app.bundleId}
									</td>
									<td className="px-4 py-2 text-text-secondary">{app.version}</td>
									<td className="px-4 py-2">
										<span
											className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium ${
												app.type === "user"
													? "bg-accent-blue/15 text-accent-blue border-accent-blue/25"
													: "bg-neutral-500/15 text-neutral-400 border-neutral-500/25"
											}`}
										>
											{app.type}
										</span>
									</td>
									<td className="px-4 py-2 text-right">
										<AppActions app={app} deviceId={deviceId} onRefresh={onRefresh} />
									</td>
								</tr>
							))}
						</tbody>
					</table>
				</div>
			)}
		</div>
	);
}
