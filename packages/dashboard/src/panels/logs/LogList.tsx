import type { LogEntry, LogLevel } from "@simvyn/types";
import { Loader2 } from "lucide-react";
import { type ReactNode, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Virtuoso, type VirtuosoHandle } from "react-virtuoso";
import { filterEntries, useLogStore } from "./stores/log-store";
import { useSearchStore } from "./stores/search-store";

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

function escapeRegex(s: string): string {
	return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function highlightText(
	text: string,
	query: string,
	isRegex: boolean,
	isActiveRow: boolean,
): ReactNode {
	if (!query) return text;
	let re: RegExp;
	try {
		re = isRegex ? new RegExp(query, "gi") : new RegExp(escapeRegex(query), "gi");
	} catch {
		return text;
	}

	const parts: ReactNode[] = [];
	let lastIndex = 0;
	let match: RegExpExecArray | null;
	let i = 0;

	while ((match = re.exec(text)) !== null) {
		if (match.index > lastIndex) {
			parts.push(text.slice(lastIndex, match.index));
		}
		parts.push(
			<mark
				key={i++}
				style={
					isActiveRow
						? {
								background: "rgba(245,158,11,0.4)",
								color: "rgb(253,230,138)",
								borderRadius: 2,
								padding: "0 2px",
								boxShadow: "0 0 0 1px rgba(245,158,11,0.5)",
							}
						: {
								background: "rgba(245,158,11,0.2)",
								color: "rgb(253,211,155)",
								borderRadius: 2,
								padding: "0 2px",
							}
				}
			>
				{match[0]}
			</mark>,
		);
		lastIndex = re.lastIndex;
		if (match[0].length === 0) re.lastIndex++;
	}

	if (lastIndex < text.length) {
		parts.push(text.slice(lastIndex));
	}

	return parts.length > 0 ? parts : text;
}

function testMatch(entry: LogEntry, query: string, isRegex: boolean): boolean {
	if (!query) return false;
	try {
		const re = isRegex ? new RegExp(query, "i") : new RegExp(escapeRegex(query), "i");
		return re.test(entry.message) || re.test(entry.processName);
	} catch {
		const lq = query.toLowerCase();
		return entry.message.toLowerCase().includes(lq) || entry.processName.toLowerCase().includes(lq);
	}
}

interface LogListProps {
	onLoadMore: () => void;
}

export default function LogList({ onLoadMore }: LogListProps) {
	const virtuosoRef = useRef<VirtuosoHandle>(null);
	const [locked, setLocked] = useState(true);
	const allEntries = useLogStore((s) => s.entries);
	const enabledLevels = useLogStore((s) => s.enabledLevels);
	const searchPattern = useLogStore((s) => s.searchPattern);
	const processFilter = useLogStore((s) => s.processFilter);
	const filtered = useMemo(
		() => filterEntries(allEntries, enabledLevels, processFilter, searchPattern),
		[allEntries, enabledLevels, processFilter, searchPattern],
	);
	// Store is newest-first; reverse so oldest=top, newest=bottom (terminal style)
	const entries = useMemo(() => [...filtered].reverse(), [filtered]);
	const firstItemIndex = useLogStore((s) => s.firstItemIndex);
	const hasMore = useLogStore((s) => s.hasMore);
	const isLoadingHistory = useLogStore((s) => s.isLoadingHistory);

	const searchQuery = useSearchStore((s) => s.query);
	const searchIsRegex = useSearchStore((s) => s.isRegex);
	const currentMatchIdx = useSearchStore((s) => s.currentMatchIdx);
	const matchIndices = useSearchStore((s) => s.matchIndices);

	// Compute match indices whenever search query or entries change
	useEffect(() => {
		if (!searchQuery) {
			useSearchStore.getState().setMatches([]);
			return;
		}
		const indices: number[] = [];
		for (let i = 0; i < entries.length; i++) {
			if (testMatch(entries[i], searchQuery, searchIsRegex)) {
				indices.push(i);
			}
		}
		useSearchStore.getState().setMatches(indices);
	}, [searchQuery, searchIsRegex, entries]);

	// Scroll to current match when navigating
	useEffect(() => {
		if (currentMatchIdx >= 0 && currentMatchIdx < matchIndices.length) {
			const entryIndex = matchIndices[currentMatchIdx];
			virtuosoRef.current?.scrollToIndex({
				index: entryIndex,
				align: "center",
				behavior: "auto",
			});
		}
	}, [currentMatchIdx, matchIndices]);

	const jumpToBottom = useCallback(() => {
		setLocked(true);
		virtuosoRef.current?.scrollToIndex({
			index: entries.length - 1,
			behavior: "auto",
		});
	}, [entries.length]);

	const LoadMoreHeader = useCallback(
		() =>
			hasMore ? (
				<div className="flex justify-center py-2">
					<button
						type="button"
						className="glass-button text-xs flex items-center gap-1.5"
						onClick={onLoadMore}
						disabled={isLoadingHistory}
					>
						{isLoadingHistory ? (
							<>
								<Loader2 size={12} className="animate-spin" />
								Loading...
							</>
						) : (
							"Load older logs"
						)}
					</button>
				</div>
			) : null,
		[hasMore, isLoadingHistory, onLoadMore],
	);

	// Build a Set of active match row indices for O(1) lookup
	const activeMatchIndex = currentMatchIdx >= 0 ? matchIndices[currentMatchIdx] : -1;

	if (entries.length === 0) {
		return (
			<div className="glass-empty-state h-full flex items-center justify-center">
				No log entries
			</div>
		);
	}

	return (
		<div className="relative h-full">
			<Virtuoso
				ref={virtuosoRef}
				firstItemIndex={firstItemIndex}
				initialTopMostItemIndex={entries.length - 1}
				data={entries}
				components={{ Header: LoadMoreHeader }}
				followOutput={() => (locked ? "auto" : false)}
				atBottomStateChange={setLocked}
				atBottomThreshold={100}
				increaseViewportBy={200}
				computeItemKey={(index, entry) => `${entry.timestamp}-${entry.pid}-${index}`}
				className="glass-panel h-full font-mono text-xs leading-relaxed"
				itemContent={(index, entry) => {
					const isActiveRow = index === activeMatchIndex;
					const hasQuery = !!searchQuery;
					return (
						<div
							className="flex gap-2 px-3 py-0.5 hover:bg-white/[0.02]"
							style={isActiveRow ? { background: "rgba(245,158,11,0.06)" } : undefined}
						>
							<span className="text-text-muted shrink-0 w-[90px]">
								{formatTime(entry.timestamp)}
							</span>
							<span className={`shrink-0 w-[56px] uppercase ${levelColors[entry.level]}`}>
								{entry.level.slice(0, 5).padEnd(5)}
							</span>
							<span className="text-text-secondary shrink-0 w-[120px] truncate">
								{hasQuery
									? highlightText(entry.processName, searchQuery, searchIsRegex, isActiveRow)
									: entry.processName}
							</span>
							<span className="text-text-primary break-all">
								{hasQuery
									? highlightText(entry.message, searchQuery, searchIsRegex, isActiveRow)
									: entry.message}
							</span>
						</div>
					);
				}}
			/>
			{!locked && (
				<button
					type="button"
					onClick={jumpToBottom}
					className="glass-button absolute bottom-3 right-3 text-xs"
					style={{ background: "rgba(30,30,42,0.9)", zIndex: 10 }}
				>
					↓ Latest
				</button>
			)}
		</div>
	);
}
