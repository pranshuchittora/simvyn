import { Search } from "lucide-react";
import { useMemo, useState } from "react";
import type { SerializedAction } from "./stores/collections-store";

const MODULE_LABELS: Record<string, string> = {
	"device-settings": "Device Settings",
	"device-management": "Device Lifecycle",
	location: "Location",
	clipboard: "Clipboard",
	"deep-links": "Deep Links",
	media: "Media",
	"app-management": "App Management",
};

interface ActionPickerProps {
	actions: SerializedAction[];
	onAdd: (actionId: string) => void;
	onClose: () => void;
	open: boolean;
}

export function ActionPicker({ actions, onAdd, onClose, open }: ActionPickerProps) {
	const [search, setSearch] = useState("");

	const filtered = useMemo(() => {
		if (!search.trim()) return actions;
		const q = search.toLowerCase();
		return actions.filter(
			(a) => a.label.toLowerCase().includes(q) || a.description.toLowerCase().includes(q),
		);
	}, [actions, search]);

	const grouped = useMemo(() => {
		const groups: Record<string, SerializedAction[]> = {};
		for (const action of filtered) {
			const mod = action.module;
			if (!groups[mod]) groups[mod] = [];
			groups[mod].push(action);
		}
		return groups;
	}, [filtered]);

	if (!open) return null;

	return (
		<>
			<div
				className="fixed inset-0 z-40"
				onClick={onClose}
				onKeyDown={() => {}}
				role="presentation"
			/>
			<div
				className="absolute left-0 right-0 z-50 mt-1 glass-panel p-3 max-h-[400px] overflow-y-auto"
				style={{ background: "rgba(22, 22, 32, 0.95)", backdropFilter: "blur(24px) saturate(1.3)" }}
			>
				<div className="relative mb-2">
					<Search
						size={13}
						strokeWidth={1.8}
						className="absolute left-2.5 top-1/2 -translate-y-1/2 text-text-muted"
					/>
					<input
						type="text"
						value={search}
						onChange={(e) => setSearch(e.target.value)}
						placeholder="Search actions..."
						className="glass-input w-full text-xs pl-8 py-1.5"
						autoFocus
					/>
				</div>

				{Object.keys(grouped).length === 0 && (
					<p className="text-xs text-text-muted text-center py-4">No matching actions</p>
				)}

				{Object.entries(grouped).map(([mod, items]) => (
					<div key={mod} className="mb-3 last:mb-0">
						<div className="text-[10px] uppercase tracking-wider text-text-muted font-medium mb-1 px-1">
							{MODULE_LABELS[mod] ?? mod}
						</div>
						{items.map((action) => (
							<button
								key={action.id}
								type="button"
								className="w-full text-left px-2 py-1.5 rounded-lg hover:bg-bg-surface/40 transition-colors cursor-pointer"
								onClick={() => {
									onAdd(action.id);
									onClose();
								}}
							>
								<div className="text-sm text-text-primary">{action.label}</div>
								<div className="text-[10px] text-text-muted">{action.description}</div>
							</button>
						))}
					</div>
				))}
			</div>
		</>
	);
}
