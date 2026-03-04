import type { Collection } from "@simvyn/types";
import { Copy, Play, Plus, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { registerPanel } from "../stores/panel-registry";
import { ApplyModal } from "./collections/ApplyModal";
import { StepBuilder } from "./collections/StepBuilder";
import { useCollectionsStore } from "./collections/stores/collections-store";

function relativeTime(dateStr: string): string {
	const now = Date.now();
	const then = new Date(dateStr).getTime();
	const diff = now - then;
	const seconds = Math.floor(diff / 1000);
	if (seconds < 60) return "just now";
	const minutes = Math.floor(seconds / 60);
	if (minutes < 60) return `${minutes}m ago`;
	const hours = Math.floor(minutes / 60);
	if (hours < 24) return `${hours}h ago`;
	const days = Math.floor(hours / 24);
	if (days < 30) return `${days}d ago`;
	return new Date(dateStr).toLocaleDateString();
}

function CollectionsPanel() {
	const {
		collections,
		actions,
		loading,
		activeCollectionId,
		fetchCollections,
		fetchActions,
		createCollection,
		deleteCollection,
		duplicateCollection,
		setActiveCollectionId,
	} = useCollectionsStore();

	const [showCreateForm, setShowCreateForm] = useState(false);
	const [newName, setNewName] = useState("");
	const [applyingCollection, setApplyingCollection] = useState<Collection | null>(null);

	useEffect(() => {
		fetchCollections();
		fetchActions();
	}, [fetchCollections, fetchActions]);

	const handleCreate = () => {
		if (newName.trim()) {
			createCollection(newName.trim());
			setNewName("");
			setShowCreateForm(false);
		}
	};

	const handleKeyDown = (e: React.KeyboardEvent) => {
		if (e.key === "Enter") handleCreate();
		if (e.key === "Escape") {
			setShowCreateForm(false);
			setNewName("");
		}
	};

	if (activeCollectionId) {
		return (
			<StepBuilder collectionId={activeCollectionId} onBack={() => setActiveCollectionId(null)} />
		);
	}

	return (
		<div className="p-6 space-y-4">
			<div className="flex items-center justify-between">
				<h1 className="text-base font-medium text-text-primary">Collections</h1>
				<button
					type="button"
					onClick={() => setShowCreateForm(!showCreateForm)}
					className="glass-button-primary flex items-center gap-1.5"
				>
					<Plus size={14} strokeWidth={1.8} />
					New Collection
				</button>
			</div>

			{showCreateForm && (
				<div className="glass-panel p-3 flex items-center gap-2">
					<input
						type="text"
						value={newName}
						onChange={(e) => setNewName(e.target.value)}
						onKeyDown={handleKeyDown}
						placeholder="Collection name"
						className="glass-input flex-1 text-xs"
						autoFocus
					/>
					<button
						type="button"
						onClick={handleCreate}
						disabled={!newName.trim()}
						className="glass-button-primary text-xs"
					>
						Create
					</button>
					<button
						type="button"
						onClick={() => {
							setShowCreateForm(false);
							setNewName("");
						}}
						className="glass-button text-xs"
					>
						Cancel
					</button>
				</div>
			)}

			{loading && <p className="text-xs text-text-muted">Loading...</p>}

			{!loading && collections.length === 0 && !showCreateForm && (
				<div className="glass-panel">
					<p className="glass-empty-state">No collections yet — create one to get started</p>
				</div>
			)}

			{!loading && collections.length > 0 && (
				<div className="space-y-1.5">
					{collections.map((collection) => (
						<div
							key={collection.id}
							className="glass-panel px-4 py-3 cursor-pointer hover:bg-bg-surface/30 transition-colors group"
							onClick={() => setActiveCollectionId(collection.id)}
							onKeyDown={(e) => {
								if (e.key === "Enter") setActiveCollectionId(collection.id);
							}}
							role="button"
							tabIndex={0}
						>
							<div className="flex items-center justify-between">
								<div className="min-w-0 flex-1">
									<div className="flex items-center gap-2">
										<span className="text-sm font-medium text-text-primary truncate">
											{collection.name}
										</span>
										<span className="shrink-0 text-[10px] text-text-muted">
											{collection.steps.length} step{collection.steps.length !== 1 ? "s" : ""}
										</span>
									</div>
									{collection.description && (
										<p className="text-xs text-text-secondary truncate mt-0.5">
											{collection.description}
										</p>
									)}
									<p className="text-[10px] text-text-muted mt-0.5">
										Updated {relativeTime(collection.updatedAt)}
									</p>
								</div>
								<div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
									<button
										type="button"
										onClick={(e) => {
											e.stopPropagation();
											setApplyingCollection(collection);
										}}
										className="p-1.5 rounded text-text-muted hover:text-accent-blue transition-colors"
										title="Apply"
									>
										<Play size={13} strokeWidth={1.8} />
									</button>
									<button
										type="button"
										onClick={(e) => {
											e.stopPropagation();
											duplicateCollection(collection.id);
										}}
										className="p-1.5 rounded text-text-muted hover:text-text-primary transition-colors"
										title="Duplicate"
									>
										<Copy size={13} strokeWidth={1.8} />
									</button>
									<button
										type="button"
										onClick={(e) => {
											e.stopPropagation();
											deleteCollection(collection.id);
										}}
										className="p-1.5 rounded text-text-muted hover:text-red-400 transition-colors"
										title="Delete"
									>
										<Trash2 size={13} strokeWidth={1.8} />
									</button>
								</div>
							</div>
						</div>
					))}
				</div>
			)}
			{applyingCollection && (
				<ApplyModal
					collection={applyingCollection}
					actions={actions}
					open={!!applyingCollection}
					onClose={() => setApplyingCollection(null)}
				/>
			)}
		</div>
	);
}

registerPanel("collections", CollectionsPanel);

export default CollectionsPanel;
