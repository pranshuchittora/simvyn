import { useState } from "react";
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
	const [search, setSearch] = useState("");

	const searchLower = search.toLowerCase();
	const filtered = apps.filter((a: AppInfo) => {
		if (filter !== "all" && a.type !== filter) return false;
		if (searchLower) {
			return (
				a.name.toLowerCase().includes(searchLower) ||
				a.bundleId.toLowerCase().includes(searchLower) ||
				a.version.toLowerCase().includes(searchLower)
			);
		}
		return true;
	});

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
						className={filter === f.value ? "glass-button-primary" : "glass-button"}
					>
						{f.label}
					</button>
				))}
				<input
					type="text"
					value={search}
					onChange={(e) => setSearch(e.target.value)}
					placeholder="Search apps..."
					className="glass-input text-xs ml-auto w-48"
				/>
				<span className="text-xs text-text-muted">
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
				<div className="glass-empty-state">
					{search ? "No apps match your search" : "No apps found"}
				</div>
			)}

			{/* App table */}
			{!loading && filtered.length > 0 && (
				<div className="glass-panel overflow-x-auto">
					<table className="glass-table">
						<thead>
							<tr>
								<th>Name</th>
								<th>Bundle ID</th>
								<th>Version</th>
								<th>Type</th>
								<th className="text-right">Actions</th>
							</tr>
						</thead>
						<tbody>
							{filtered.map((app: AppInfo) => (
								<tr key={app.bundleId}>
									<td className="text-text-primary truncate max-w-[180px]" title={app.name}>
										{app.name}
									</td>
									<td
										className="text-text-secondary truncate max-w-[220px] font-mono text-xs"
										title={app.bundleId}
									>
										{app.bundleId}
									</td>
									<td className="text-text-secondary" title={app.version}>
										{app.version}
									</td>
									<td>
										<span
											className="glass-badge"
											style={
												app.type === "user"
													? {
															color: "var(--color-accent-blue)",
															borderColor: "rgba(0,122,255,0.25)",
															background: "rgba(0,122,255,0.15)",
														}
													: {
															color: "rgb(163,163,163)",
															borderColor: "rgba(115,115,115,0.25)",
															background: "rgba(115,115,115,0.15)",
														}
											}
										>
											{app.type}
										</span>
									</td>
									<td className="text-right">
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
