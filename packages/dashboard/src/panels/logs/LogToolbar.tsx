import type { LogLevel } from "@simvyn/types";
import { useCallback, useRef } from "react";
import { selectFilteredEntries, useLogStore } from "./stores/log-store";

const LEVELS: { key: LogLevel; label: string; color: string; activeColor: string }[] = [
	{
		key: "verbose",
		label: "V",
		color: "text-gray-500",
		activeColor: "bg-gray-500/20 text-gray-300 border-gray-500/30",
	},
	{
		key: "debug",
		label: "D",
		color: "text-cyan-400",
		activeColor: "bg-cyan-500/20 text-cyan-300 border-cyan-500/30",
	},
	{
		key: "info",
		label: "I",
		color: "text-white",
		activeColor: "bg-white/10 text-white border-white/20",
	},
	{
		key: "warning",
		label: "W",
		color: "text-yellow-400",
		activeColor: "bg-yellow-500/20 text-yellow-300 border-yellow-500/30",
	},
	{
		key: "error",
		label: "E",
		color: "text-red-400",
		activeColor: "bg-red-500/20 text-red-300 border-red-500/30",
	},
	{
		key: "fatal",
		label: "F",
		color: "text-pink-400",
		activeColor: "bg-pink-500/20 text-pink-300 border-pink-500/30",
	},
];

const LEVEL_ORDER: LogLevel[] = ["verbose", "debug", "info", "warning", "error", "fatal"];

export default function LogToolbar() {
	const minLevel = useLogStore((s) => s.minLevel);
	const searchPattern = useLogStore((s) => s.searchPattern);
	const processFilter = useLogStore((s) => s.processFilter);
	const setMinLevel = useLogStore((s) => s.setMinLevel);
	const setSearchPattern = useLogStore((s) => s.setSearchPattern);
	const setProcessFilter = useLogStore((s) => s.setProcessFilter);
	const clear = useLogStore((s) => s.clear);
	const totalCount = useLogStore((s) => s.entries.length);
	const filteredCount = useLogStore(selectFilteredEntries).length;
	const searchTimer = useRef<ReturnType<typeof setTimeout>>(null);

	const minIdx = LEVEL_ORDER.indexOf(minLevel);

	const handleSearch = useCallback(
		(value: string) => {
			if (searchTimer.current) clearTimeout(searchTimer.current);
			searchTimer.current = setTimeout(() => setSearchPattern(value), 150);
		},
		[setSearchPattern],
	);

	const handleExport = useCallback((format: "json" | "text") => {
		const entries = selectFilteredEntries(useLogStore.getState());
		let content: string;
		let mime: string;
		let ext: string;

		if (format === "json") {
			content = JSON.stringify(entries, null, 2);
			mime = "application/json";
			ext = "json";
		} else {
			content = entries
				.map(
					(e) =>
						`[${e.timestamp}] [${e.level.toUpperCase().padEnd(7)}] ${e.processName}: ${e.message}`,
				)
				.join("\n");
			mime = "text/plain";
			ext = "txt";
		}

		const blob = new Blob([content], { type: mime });
		const url = URL.createObjectURL(blob);
		const a = document.createElement("a");
		a.href = url;
		a.download = `simvyn-logs-${Date.now()}.${ext}`;
		a.click();
		URL.revokeObjectURL(url);
	}, []);

	return (
		<div className="flex items-center gap-2 flex-wrap">
			{/* Level filter buttons */}
			<div className="flex items-center gap-0.5">
				{LEVELS.map((lvl) => {
					const idx = LEVEL_ORDER.indexOf(lvl.key);
					const active = idx >= minIdx;
					return (
						<button
							key={lvl.key}
							type="button"
							onClick={() => setMinLevel(lvl.key)}
							className={`rounded-[var(--radius-button)] border px-2 py-0.5 text-xs font-medium transition-colors ${
								active
									? lvl.activeColor
									: "bg-bg-surface/60 border-border text-text-muted hover:text-text-secondary"
							}`}
							title={lvl.key}
						>
							{lvl.label}
						</button>
					);
				})}
			</div>

			{/* Search input */}
			<input
				type="text"
				placeholder="Filter logs (regex)..."
				defaultValue={searchPattern}
				onChange={(e) => handleSearch(e.target.value)}
				className="rounded-[var(--radius-button)] bg-bg-surface/60 border border-border px-2 py-1 text-xs text-text-secondary placeholder:text-text-muted flex-1 min-w-[140px] max-w-[260px]"
			/>

			{/* Process filter */}
			<input
				type="text"
				placeholder="Process..."
				value={processFilter}
				onChange={(e) => setProcessFilter(e.target.value)}
				className="rounded-[var(--radius-button)] bg-bg-surface/60 border border-border px-2 py-1 text-xs text-text-secondary placeholder:text-text-muted w-[100px]"
			/>

			{/* Export */}
			<div className="flex items-center gap-0.5">
				<button
					type="button"
					onClick={() => handleExport("json")}
					className="rounded-[var(--radius-button)] bg-bg-surface px-2 py-1 text-xs text-text-secondary hover:text-text-primary hover:bg-glass transition-colors border border-border"
				>
					JSON
				</button>
				<button
					type="button"
					onClick={() => handleExport("text")}
					className="rounded-[var(--radius-button)] bg-bg-surface px-2 py-1 text-xs text-text-secondary hover:text-text-primary hover:bg-glass transition-colors border border-border"
				>
					TXT
				</button>
			</div>

			{/* Clear */}
			<button
				type="button"
				onClick={clear}
				className="rounded-[var(--radius-button)] bg-bg-surface px-2 py-1 text-xs text-text-secondary hover:text-red-400 hover:bg-red-500/10 transition-colors border border-border"
			>
				Clear
			</button>

			{/* Entry count */}
			<span className="text-xs text-text-muted ml-auto">
				{filteredCount === totalCount
					? `${totalCount} entries`
					: `${filteredCount} / ${totalCount} entries`}
			</span>
		</div>
	);
}
