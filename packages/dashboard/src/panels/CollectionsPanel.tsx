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
				<div className="grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
					{collections.map((collection) => (
						<div
							key={collection.id}
							className="glass-panel p-4 flex flex-col gap-3 cursor-pointer hover:border-glass-border-hover transition-all duration-150 group"
							onClick={() => setActiveCollectionId(collection.id)}
							onKeyDown={(e) => {
								if (e.key === "Enter") setActiveCollectionId(collection.id);
							}}
							role="button"
							tabIndex={0}
						>
							<div className="flex items-start justify-between">
								<div className="min-w-0 flex-1">
									<div className="font-medium text-text-primary truncate">{collection.name}</div>
									{collection.description && (
										<p className="text-xs text-text-secondary truncate mt-0.5">
											{collection.description}
										</p>
									)}
								</div>
								<span
									className="glass-badge shrink-0"
									style={{
										color: "rgb(168, 162, 255)",
										borderColor: "rgba(139, 92, 246, 0.3)",
										background: "rgba(139, 92, 246, 0.2)",
									}}
								>
									{collection.steps.length} step{collection.steps.length !== 1 ? "s" : ""}
								</span>
							</div>

							<div className="text-[10px] text-text-muted">
								Updated {relativeTime(collection.updatedAt)}
							</div>

							<div className="flex items-center gap-2 pt-1 border-t border-border flex-wrap">
								<button
									type="button"
									onClick={(e) => {
										e.stopPropagation();
										setApplyingCollection(collection);
									}}
									className="glass-button-primary flex items-center gap-1 text-xs"
								>
									<Play size={13} strokeWidth={1.8} />
									Apply
								</button>
								<button
									type="button"
									onClick={(e) => {
										e.stopPropagation();
										duplicateCollection(collection.id);
									}}
									className="glass-button flex items-center gap-1 text-xs"
								>
									<Copy size={13} strokeWidth={1.8} />
									Duplicate
								</button>
								<button
									type="button"
									onClick={(e) => {
										e.stopPropagation();
										deleteCollection(collection.id);
									}}
									className="glass-button-destructive flex items-center gap-1 text-xs"
								>
									<Trash2 size={13} strokeWidth={1.8} />
									Delete
								</button>
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
