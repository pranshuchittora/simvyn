import type { LogLevel } from "@simvyn/types";
import { useCallback, useMemo, useRef } from "react";
import { useWs } from "../../hooks/use-ws";
import { filterEntries, useLogStore } from "./stores/log-store";

const LEVELS: {
	key: LogLevel;
	label: string;
	activeStyle: { background: string; color: string; borderColor: string };
}[] = [
	{
		key: "verbose",
		label: "V",
		activeStyle: {
			background: "rgba(168,85,247,0.2)",
			color: "#c4b5fd",
			borderColor: "rgba(168,85,247,0.3)",
		},
	},
	{
		key: "debug",
		label: "D",
		activeStyle: {
			background: "rgba(6,182,212,0.2)",
			color: "#67e8f9",
			borderColor: "rgba(6,182,212,0.3)",
		},
	},
	{
		key: "info",
		label: "I",
		activeStyle: {
			background: "rgba(59,130,246,0.2)",
			color: "#93c5fd",
			borderColor: "rgba(59,130,246,0.3)",
		},
	},
	{
		key: "warning",
		label: "W",
		activeStyle: {
			background: "rgba(234,179,8,0.2)",
			color: "#fde047",
			borderColor: "rgba(234,179,8,0.3)",
		},
	},
	{
		key: "error",
		label: "E",
		activeStyle: {
			background: "rgba(239,68,68,0.2)",
			color: "#f87171",
			borderColor: "rgba(239,68,68,0.3)",
		},
	},
	{
		key: "fatal",
		label: "F",
		activeStyle: {
			background: "rgba(236,72,153,0.2)",
			color: "#f472b6",
			borderColor: "rgba(236,72,153,0.3)",
		},
	},
];

interface LogToolbarProps {
	selectedDeviceId: string;
}

export default function LogToolbar({ selectedDeviceId }: LogToolbarProps) {
	const { send } = useWs();
	const enabledLevels = useLogStore((s) => s.enabledLevels);
	const searchPattern = useLogStore((s) => s.searchPattern);
	const processFilter = useLogStore((s) => s.processFilter);
	const toggleLevel = useLogStore((s) => s.toggleLevel);
	const setSearchPattern = useLogStore((s) => s.setSearchPattern);
	const setProcessFilter = useLogStore((s) => s.setProcessFilter);
	const clear = useLogStore((s) => s.clear);
	const entries = useLogStore((s) => s.entries);
	const totalCount = entries.length;
	const filteredCount = useMemo(
		() => filterEntries(entries, enabledLevels, processFilter, searchPattern).length,
		[entries, enabledLevels, processFilter, searchPattern],
	);
	const searchTimer = useRef<ReturnType<typeof setTimeout>>(null);

	const handleSearch = useCallback(
		(value: string) => {
			if (searchTimer.current) clearTimeout(searchTimer.current);
			searchTimer.current = setTimeout(() => setSearchPattern(value), 150);
		},
		[setSearchPattern],
	);

	const handleExport = useCallback((format: "json" | "text") => {
		const s = useLogStore.getState();
		const entries = filterEntries(s.entries, s.enabledLevels, s.processFilter, s.searchPattern);
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

	const handleClearDevice = useCallback(() => {
		send({
			channel: "logs",
			type: "clear-device-logs",
			payload: { deviceId: selectedDeviceId },
		});
	}, [send, selectedDeviceId]);

	return (
		<div className="flex items-center gap-2 flex-wrap">
			{/* Level filter buttons */}
			<div className="flex items-center gap-0.5">
				{LEVELS.map((lvl) => {
					const active = enabledLevels.includes(lvl.key);
					return (
						<button
							key={lvl.key}
							type="button"
							onClick={() => toggleLevel(lvl.key)}
							className="glass-button text-xs"
							style={active ? lvl.activeStyle : undefined}
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
				className="glass-input text-xs flex-1 min-w-[140px] max-w-[260px]"
			/>

			{/* Process filter */}
			<input
				type="text"
				placeholder="Process..."
				value={processFilter}
				onChange={(e) => setProcessFilter(e.target.value)}
				className="glass-input text-xs w-[100px]"
			/>

			{/* Export */}
			<div className="flex items-center gap-0.5">
				<button type="button" onClick={() => handleExport("json")} className="glass-button">
					JSON
				</button>
				<button type="button" onClick={() => handleExport("text")} className="glass-button">
					TXT
				</button>
			</div>

			{/* Clear buttons */}
			<button
				type="button"
				onClick={handleClearDevice}
				className="glass-button-destructive"
				title="Clear device log buffer"
			>
				Clear Device
			</button>
			<button
				type="button"
				onClick={clear}
				className="glass-button"
				title="Clear loaded entries (UI only)"
			>
				Clear UI
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
