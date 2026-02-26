import type { LogEntry, LogLevel } from "@simvyn/types";
import { useRef } from "react";
import { Virtuoso, type VirtuosoHandle } from "react-virtuoso";
import { selectFilteredEntries, useLogStore } from "./stores/log-store";

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
	onLoadMore: () => void;
}

export default function LogList({ onLoadMore }: LogListProps) {
	const virtuosoRef = useRef<VirtuosoHandle>(null);
	const entries = useLogStore(selectFilteredEntries);
	const firstItemIndex = useLogStore((s) => s.firstItemIndex);
	const hasMore = useLogStore((s) => s.hasMore);
	const isLoadingHistory = useLogStore((s) => s.isLoadingHistory);

	if (entries.length === 0) {
		return (
			<div className="glass-empty-state h-full flex items-center justify-center">
				No log entries
			</div>
		);
	}

	return (
		<Virtuoso
			ref={virtuosoRef}
			firstItemIndex={firstItemIndex}
			initialTopMostItemIndex={0}
			data={entries}
			startReached={() => {
				if (hasMore && !isLoadingHistory) {
					onLoadMore();
				}
			}}
			followOutput="smooth"
			increaseViewportBy={200}
			computeItemKey={(index, entry) => `${entry.timestamp}-${entry.pid}-${index}`}
			className="glass-panel h-full font-mono text-xs leading-relaxed"
			itemContent={(_index, entry) => (
				<div className="flex gap-2 px-3 py-0.5 hover:bg-white/[0.02]">
					<span className="text-text-muted shrink-0 w-[90px]">{formatTime(entry.timestamp)}</span>
					<span className={`shrink-0 w-[56px] uppercase ${levelColors[entry.level]}`}>
						{entry.level.slice(0, 5).padEnd(5)}
					</span>
					<span className="text-text-secondary shrink-0 w-[120px] truncate">
						{entry.processName}
					</span>
					<span className="text-text-primary break-all">{entry.message}</span>
				</div>
			)}
		/>
	);
}
