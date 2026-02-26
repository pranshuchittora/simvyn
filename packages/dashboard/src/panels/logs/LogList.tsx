import type { LogEntry, LogLevel } from "@simvyn/types";
import { useEffect, useRef } from "react";

const levelColors: Record<LogLevel, string> = {
	verbose: "text-gray-500",
	debug: "text-cyan-400",
	info: "text-text-primary",
	warning: "text-yellow-400",
	error: "text-red-400",
	fatal: "text-pink-400 font-bold",
};

function formatTime(ts: string): string {
	try {
		const d = new Date(ts);
		const h = String(d.getHours()).padStart(2, "0");
		const m = String(d.getMinutes()).padStart(2, "0");
		const s = String(d.getSeconds()).padStart(2, "0");
		const ms = String(d.getMilliseconds()).padStart(3, "0");
		return `${h}:${m}:${s}.${ms}`;
	} catch {
		return ts;
	}
}

interface LogListProps {
	entries: LogEntry[];
}

export default function LogList({ entries }: LogListProps) {
	const containerRef = useRef<HTMLDivElement>(null);
	const userScrolledUp = useRef(false);

	function handleScroll() {
		const el = containerRef.current;
		if (!el) return;
		const threshold = 40;
		userScrolledUp.current = el.scrollTop + el.clientHeight < el.scrollHeight - threshold;
	}

	const entryCount = entries.length;
	// biome-ignore lint/correctness/useExhaustiveDependencies: scroll on new entries
	useEffect(() => {
		const el = containerRef.current;
		if (el && !userScrolledUp.current) {
			el.scrollTop = el.scrollHeight;
		}
	}, [entryCount]);

	if (entries.length === 0) {
		return (
			<div className="glass-empty-state h-full flex items-center justify-center">
				No log entries
			</div>
		);
	}

	return (
		<div
			ref={containerRef}
			onScroll={handleScroll}
			className="glass-panel h-full overflow-y-auto font-mono text-xs leading-relaxed"
		>
			{entries.map((entry, i) => (
				// biome-ignore lint/suspicious/noArrayIndexKey: append-only log entries
				<div key={i} className="flex gap-2 px-3 py-0.5 hover:bg-white/[0.02]">
					<span className="text-text-muted shrink-0 w-[90px]">{formatTime(entry.timestamp)}</span>
					<span className={`shrink-0 w-[56px] uppercase ${levelColors[entry.level]}`}>
						{entry.level.slice(0, 5).padEnd(5)}
					</span>
					<span className="text-text-secondary shrink-0 w-[120px] truncate">
						{entry.processName}
					</span>
					<span className="text-text-primary break-all">{entry.message}</span>
				</div>
			))}
		</div>
	);
}
