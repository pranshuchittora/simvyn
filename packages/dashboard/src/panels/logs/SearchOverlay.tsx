import { AnimatePresence, motion } from "framer-motion";
import { ChevronDown, ChevronUp, X } from "lucide-react";
import { useCallback, useEffect, useRef } from "react";
import { useSearchStore } from "./stores/search-store";

export default function SearchOverlay() {
	const isOpen = useSearchStore((s) => s.isOpen);
	const query = useSearchStore((s) => s.query);
	const isRegex = useSearchStore((s) => s.isRegex);
	const currentMatchIdx = useSearchStore((s) => s.currentMatchIdx);
	const totalMatches = useSearchStore((s) => s.totalMatches);
	const setQuery = useSearchStore((s) => s.setQuery);
	const toggleRegex = useSearchStore((s) => s.toggleRegex);
	const nextMatch = useSearchStore((s) => s.nextMatch);
	const prevMatch = useSearchStore((s) => s.prevMatch);
	const close = useSearchStore((s) => s.close);

	const inputRef = useRef<HTMLInputElement>(null);
	const debounceRef = useRef<ReturnType<typeof setTimeout>>(null);

	useEffect(() => {
		if (isOpen) {
			requestAnimationFrame(() => inputRef.current?.focus());
		}
	}, [isOpen]);

	const handleInputChange = useCallback(
		(value: string) => {
			if (debounceRef.current) clearTimeout(debounceRef.current);
			debounceRef.current = setTimeout(() => setQuery(value), 100);
		},
		[setQuery],
	);

	const handleKeyDown = useCallback(
		(e: React.KeyboardEvent) => {
			if (e.key === "Enter" && e.shiftKey) {
				e.preventDefault();
				prevMatch();
			} else if (e.key === "Enter") {
				e.preventDefault();
				nextMatch();
			} else if (e.key === "Escape") {
				e.preventDefault();
				close();
			}
		},
		[nextMatch, prevMatch, close],
	);

	return (
		<AnimatePresence>
			{isOpen && (
				<motion.div
					initial={{ y: -10, opacity: 0 }}
					animate={{ y: 0, opacity: 1 }}
					exit={{ y: -10, opacity: 0 }}
					transition={{ duration: 0.15, ease: "easeOut" }}
					className="absolute top-2 right-2 z-50 flex items-center gap-1.5 glass-panel px-2.5 py-1.5"
					style={{ borderRadius: 10 }}
				>
					<input
						ref={inputRef}
						type="text"
						placeholder="Search logs..."
						defaultValue={query}
						onChange={(e) => handleInputChange(e.target.value)}
						onKeyDown={handleKeyDown}
						className="glass-input text-xs py-1 px-2 w-[180px]"
						style={{ background: "rgba(0,0,0,0.15)", borderRadius: 6 }}
					/>
					<button
						type="button"
						onClick={toggleRegex}
						className="glass-button text-xs px-1.5 py-0.5"
						style={
							isRegex
								? {
										borderColor: "rgba(0,180,255,0.5)",
										background: "rgba(0,180,255,0.15)",
										color: "rgba(100,200,255,1)",
									}
								: { fontSize: "0.7rem" }
						}
						title="Toggle regex"
					>
						.*
					</button>
					<button
						type="button"
						onClick={prevMatch}
						disabled={totalMatches === 0}
						className="glass-button px-1 py-0.5"
						title="Previous match (Shift+Enter)"
					>
						<ChevronUp size={14} />
					</button>
					<button
						type="button"
						onClick={nextMatch}
						disabled={totalMatches === 0}
						className="glass-button px-1 py-0.5"
						title="Next match (Enter)"
					>
						<ChevronDown size={14} />
					</button>
					<span className="text-xs text-text-muted whitespace-nowrap min-w-[60px] text-center">
						{query
							? totalMatches > 0
								? `${currentMatchIdx + 1} of ${totalMatches}`
								: "No results"
							: ""}
					</span>
					<button
						type="button"
						onClick={close}
						className="glass-button px-1 py-0.5"
						title="Close (Escape)"
					>
						<X size={14} />
					</button>
				</motion.div>
			)}
		</AnimatePresence>
	);
}
