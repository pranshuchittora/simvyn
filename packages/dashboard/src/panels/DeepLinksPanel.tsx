import { ChevronUp, ExternalLink, Plus, Star, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { useDeviceStore } from "../stores/device-store";
import { registerPanel } from "../stores/panel-registry";
import { useDeepLinksStore } from "./deep-links/stores/deep-links-store";

function DeepLinksPanel() {
	const selectedDeviceId = useDeviceStore((s) => s.selectedDeviceIds[0] ?? null);
	const [urlInput, setUrlInput] = useState("");
	const [showAddForm, setShowAddForm] = useState(false);
	const [favUrl, setFavUrl] = useState("");
	const [favLabel, setFavLabel] = useState("");
	const [favBundleId, setFavBundleId] = useState("");

	const {
		favorites,
		history,
		loading,
		openUrl,
		fetchFavorites,
		addFavorite,
		removeFavorite,
		fetchHistory,
	} = useDeepLinksStore();

	useEffect(() => {
		fetchFavorites();
		fetchHistory();
	}, [fetchFavorites, fetchHistory]);

	const handleOpen = () => {
		if (selectedDeviceId && urlInput.trim()) {
			openUrl(selectedDeviceId, urlInput.trim());
			setUrlInput("");
		}
	};

	const handleKeyDown = (e: React.KeyboardEvent) => {
		if (e.key === "Enter") handleOpen();
	};

	const handleAddFavorite = () => {
		if (favUrl.trim() && favLabel.trim()) {
			addFavorite(favUrl.trim(), favLabel.trim(), favBundleId.trim() || undefined);
			setFavUrl("");
			setFavLabel("");
			setFavBundleId("");
			setShowAddForm(false);
		}
	};

	return (
		<div className="p-6 space-y-4">
			{/* Header */}
			<div className="flex items-center justify-between">
				<h1 className="text-base font-medium text-text-primary">Deep Links</h1>
			</div>

			{/* No device */}
			{!selectedDeviceId && (
				<div className="glass-panel">
					<p className="glass-empty-state">Select a booted device to open deep links</p>
				</div>
			)}

			{selectedDeviceId && (
				<>
					{/* URL input */}
					<div className="flex items-center gap-2">
						<input
							type="text"
							value={urlInput}
							onChange={(e) => setUrlInput(e.target.value)}
							onKeyDown={handleKeyDown}
							placeholder="Enter URL or deep link (e.g. myapp://screen)"
							className="glass-input flex-1"
						/>
						<button
							type="button"
							onClick={handleOpen}
							disabled={!urlInput.trim()}
							className="glass-button-primary flex items-center gap-2"
						>
							<ExternalLink size={16} strokeWidth={1.8} />
							Open
						</button>
					</div>

					{/* Favorites */}
					<div className="space-y-2">
						<div className="flex items-center justify-between">
							<h2 className="text-sm font-medium text-text-secondary flex items-center gap-1.5">
								<Star size={14} strokeWidth={1.8} />
								Favorites
							</h2>
							<button
								type="button"
								onClick={() => setShowAddForm(!showAddForm)}
								className="glass-button flex items-center gap-1"
							>
								{showAddForm ? <ChevronUp size={12} /> : <Plus size={12} />}
								{showAddForm ? "Cancel" : "Add"}
							</button>
						</div>

						{showAddForm && (
							<div className="glass-panel p-3 space-y-2">
								<input
									type="text"
									value={favUrl}
									onChange={(e) => setFavUrl(e.target.value)}
									placeholder="URL"
									className="glass-input w-full text-xs"
								/>
								<input
									type="text"
									value={favLabel}
									onChange={(e) => setFavLabel(e.target.value)}
									placeholder="Label"
									className="glass-input w-full text-xs"
								/>
								<input
									type="text"
									value={favBundleId}
									onChange={(e) => setFavBundleId(e.target.value)}
									placeholder="Bundle ID (optional)"
									className="glass-input w-full text-xs"
								/>
								<button
									type="button"
									onClick={handleAddFavorite}
									disabled={!favUrl.trim() || !favLabel.trim()}
									className="glass-button-primary"
								>
									Save
								</button>
							</div>
						)}

						{favorites.length === 0 && !showAddForm && (
							<div className="glass-panel">
								<p className="glass-empty-state">No favorites yet — add one above</p>
							</div>
						)}

						{favorites.length > 0 && (
							<div className="space-y-1.5">
								{favorites.map((fav) => (
									<div
										key={fav.id}
										className="glass-panel px-3 py-2 flex items-center justify-between group"
									>
										<button
											type="button"
											onClick={() => {
												if (selectedDeviceId) openUrl(selectedDeviceId, fav.url);
											}}
											className="flex-1 text-left min-w-0"
										>
											<div className="flex items-center gap-2">
												<span className="text-sm text-text-primary truncate">{fav.label}</span>
												{fav.bundleId && (
													<span className="shrink-0 rounded bg-bg-surface/80 px-1.5 py-0.5 text-[10px] text-text-muted">
														{fav.bundleId}
													</span>
												)}
											</div>
											<p className="text-[10px] text-text-muted truncate">{fav.url}</p>
										</button>
										<button
											type="button"
											onClick={() => removeFavorite(fav.id)}
											className="ml-2 shrink-0 p-1 rounded text-text-muted hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all"
										>
											<Trash2 size={13} strokeWidth={1.8} />
										</button>
									</div>
								))}
							</div>
						)}
					</div>

					{/* Recent history */}
					<div className="space-y-2">
						<h2 className="text-sm font-medium text-text-secondary">Recent</h2>
						{loading && <p className="text-xs text-text-muted">Loading...</p>}
						{!loading && history.length === 0 && (
							<div className="glass-panel">
								<p className="glass-empty-state">No recent deep link launches</p>
							</div>
						)}
						{!loading && history.length > 0 && (
							<div className="space-y-1">
								{history.map((entry, i) => (
									<div
										key={`${entry.url}-${entry.timestamp}-${i}`}
										className="flex items-center justify-between px-2 py-1.5 rounded-lg hover:bg-bg-surface/30 transition-colors"
									>
										<div className="min-w-0 flex-1">
											<p className="text-xs text-text-primary truncate">{entry.url}</p>
											<p className="text-[10px] text-text-muted">
												{entry.deviceName} — {new Date(entry.timestamp).toLocaleString()}
											</p>
										</div>
										<button
											type="button"
											onClick={() => {
												if (selectedDeviceId) openUrl(selectedDeviceId, entry.url);
											}}
											className="ml-2 shrink-0 p-1 rounded text-text-muted hover:text-accent-blue transition-colors"
										>
											<ExternalLink size={13} strokeWidth={1.8} />
										</button>
									</div>
								))}
							</div>
						)}
					</div>
				</>
			)}
		</div>
	);
}

registerPanel("deep-links", DeepLinksPanel);

export default DeepLinksPanel;
