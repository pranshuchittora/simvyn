import type { LogLevel } from "@simvyn/types";
import { Ellipsis, Pause, Play } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useWs } from "../../hooks/use-ws";
import { filterEntries, useLogStore } from "./stores/log-store";
import { useSearchStore } from "./stores/search-store";

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
	const isPaused = useLogStore((s) => s.isPaused);
	const pause = useLogStore((s) => s.pause);
	const resume = useLogStore((s) => s.resume);
	const entries = useLogStore((s) => s.entries);
	const totalCount = entries.length;
	const filteredCount = useMemo(
		() => filterEntries(entries, enabledLevels, processFilter, searchPattern).length,
		[entries, enabledLevels, processFilter, searchPattern],
	);
	const searchTimer = useRef<ReturnType<typeof setTimeout>>(null);
	const [menuOpen, setMenuOpen] = useState(false);
	const menuRef = useRef<HTMLDivElement>(null);

	useEffect(() => {
		if (!menuOpen) return;
		function handleClickOutside(e: MouseEvent) {
			if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
				setMenuOpen(false);
			}
		}
		document.addEventListener("mousedown", handleClickOutside);
		return () => document.removeEventListener("mousedown", handleClickOutside);
	}, [menuOpen]);

	const handleSearch = useCallback(
		(value: string) => {
			if (searchTimer.current) clearTimeout(searchTimer.current);
			searchTimer.current = setTimeout(() => setSearchPattern(value), 150);
		},
		[setSearchPattern],
	);

	const handleExport = useCallback((format: "json" | "text") => {
		const s = useLogStore.getState();
		const filtered = filterEntries(s.entries, s.enabledLevels, s.processFilter, s.searchPattern);
		let content: string;
		let mime: string;
		let ext: string;

		if (format === "json") {
			content = JSON.stringify(filtered, null, 2);
			mime = "application/json";
			ext = "json";
		} else {
			content = filtered
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
				className="glass-input text-xs w-[180px]"
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

			{/* Pause/Resume */}
			<button
				type="button"
				onClick={isPaused ? resume : pause}
				className="glass-button"
				style={
					isPaused
						? {
								background: "rgba(234,179,8,0.2)",
								color: "#fde047",
								borderColor: "rgba(234,179,8,0.3)",
							}
						: undefined
				}
				title={isPaused ? "Resume log stream" : "Pause log stream"}
			>
				{isPaused ? <Play size={14} /> : <Pause size={14} />}
			</button>

			{/* Clear buttons */}
			<button
				type="button"
				onClick={handleClearDevice}
				className="glass-button-destructive"
				title="Purge device log buffer (logcat -c)"
			>
				Purge Device
			</button>
			<button
				type="button"
				onClick={clear}
				className="glass-button"
				title="Clear screen (logs still on device)"
			>
				Clear
			</button>

			{/* Entry count */}
			<span className={`text-xs ml-auto ${isPaused ? "text-yellow-400" : "text-text-muted"}`}>
				{isPaused
					? "Paused"
					: filteredCount === totalCount
						? `${totalCount} entries`
						: `${filteredCount} / ${totalCount} entries`}
			</span>

			{/* Three-dot overflow menu */}
			<div className="relative" ref={menuRef}>
				<button
					type="button"
					onClick={() => setMenuOpen((v) => !v)}
					className="glass-button px-1.5"
					title="More actions"
				>
					<Ellipsis size={14} />
				</button>
				{menuOpen && (
					<div
						className="glass-panel absolute right-0 top-full mt-1 py-1 z-50 min-w-[140px]"
						style={{ borderRadius: 8 }}
					>
						<button
							type="button"
							className="w-full flex items-center justify-between px-3 py-1.5 text-xs text-text-primary hover:bg-white/[0.06] transition-colors"
							onClick={() => {
								useSearchStore.getState().open();
								setMenuOpen(false);
							}}
						>
							<span>Search</span>
							<span className="text-text-muted text-[10px]">
								{navigator.platform.includes("Mac") ? "⌘F" : "Ctrl+F"}
							</span>
						</button>
					</div>
				)}
			</div>
		</div>
	);
}
