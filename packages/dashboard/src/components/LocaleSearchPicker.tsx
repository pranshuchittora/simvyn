import { ChevronDown, Search, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { LOCALES } from "../data/locales";

interface LocaleSearchPickerProps {
	value: string;
	onChange: (code: string) => void;
	placeholder?: string;
	className?: string;
}

export function LocaleSearchPicker({
	value,
	onChange,
	placeholder = "Select locale...",
	className = "",
}: LocaleSearchPickerProps) {
	const [open, setOpen] = useState(false);
	const [search, setSearch] = useState("");
	const containerRef = useRef<HTMLDivElement>(null);
	const inputRef = useRef<HTMLInputElement>(null);

	const filtered = useMemo(() => {
		if (!search.trim()) return LOCALES;
		const q = search.toLowerCase();
		return LOCALES.filter(
			(l) => l.name.toLowerCase().includes(q) || l.code.toLowerCase().includes(q),
		);
	}, [search]);

	const selected = useMemo(() => LOCALES.find((l) => l.code === value), [value]);

	useEffect(() => {
		if (!open) return;
		function onClickOutside(e: MouseEvent) {
			if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
				setOpen(false);
				setSearch("");
			}
		}
		document.addEventListener("mousedown", onClickOutside);
		return () => document.removeEventListener("mousedown", onClickOutside);
	}, [open]);

	useEffect(() => {
		if (open && inputRef.current) inputRef.current.focus();
	}, [open]);

	return (
		<div ref={containerRef} className={`relative ${className}`}>
			<button
				type="button"
				onClick={() => setOpen(!open)}
				className="glass-input text-xs py-1 px-2 w-full flex items-center gap-1.5 text-left"
			>
				{selected ? (
					<>
						<span className="text-text-primary truncate flex-1">{selected.name}</span>
						<span className="text-text-muted shrink-0">{selected.code}</span>
					</>
				) : value ? (
					<>
						<span className="text-text-primary truncate flex-1">{value}</span>
					</>
				) : (
					<span className="text-text-muted flex-1">{placeholder}</span>
				)}
				<ChevronDown size={12} className="text-text-muted shrink-0" />
			</button>

			{value && (
				<button
					type="button"
					onClick={(e) => {
						e.stopPropagation();
						onChange("");
						setOpen(false);
					}}
					className="absolute right-6 top-1/2 -translate-y-1/2 p-0.5 text-text-muted hover:text-text-primary"
				>
					<X size={10} />
				</button>
			)}

			{open && (
				<div
					className="absolute left-0 right-0 z-50 mt-1 glass-panel p-2 max-h-[240px] overflow-hidden flex flex-col"
					style={{
						background: "rgba(22, 22, 32, 0.95)",
						backdropFilter: "blur(24px) saturate(1.3)",
					}}
				>
					<div className="relative mb-1.5 shrink-0">
						<Search
							size={12}
							strokeWidth={1.8}
							className="absolute left-2 top-1/2 -translate-y-1/2 text-text-muted"
						/>
						<input
							ref={inputRef}
							type="text"
							value={search}
							onChange={(e) => setSearch(e.target.value)}
							placeholder="Search locales..."
							className="glass-input w-full text-xs pl-7 py-1"
						/>
					</div>

					<div className="overflow-y-auto flex-1 -mx-1">
						{filtered.length === 0 && (
							<p className="text-[10px] text-text-muted text-center py-3">No matching locales</p>
						)}
						{filtered.slice(0, 100).map((locale) => (
							<button
								key={locale.code}
								type="button"
								className={`w-full text-left px-2 py-1 rounded text-xs transition-colors cursor-pointer flex items-center gap-2 ${
									locale.code === value
										? "bg-accent-blue/20 text-accent-blue"
										: "hover:bg-bg-surface/40 text-text-primary"
								}`}
								onClick={() => {
									onChange(locale.code);
									setOpen(false);
									setSearch("");
								}}
							>
								<span className="truncate flex-1">{locale.name}</span>
								<span className="text-[10px] text-text-muted shrink-0">{locale.code}</span>
							</button>
						))}
						{filtered.length > 100 && (
							<p className="text-[10px] text-text-muted text-center py-1">
								Type to narrow {filtered.length - 100} more results...
							</p>
						)}
					</div>
				</div>
			)}
		</div>
	);
}
