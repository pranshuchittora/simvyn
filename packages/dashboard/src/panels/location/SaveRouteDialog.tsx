import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { useFavoritesStore } from "./stores/favorites-store";

interface Props {
	waypoints: [number, number][];
	onClose: () => void;
}

export default function SaveRouteDialog({ waypoints, onClose }: Props) {
	const [name, setName] = useState("");
	const [saving, setSaving] = useState(false);
	const inputRef = useRef<HTMLInputElement>(null);

	useEffect(() => {
		inputRef.current?.focus();
	}, []);

	const handleSave = async () => {
		const trimmed = name.trim();
		if (!trimmed) return;
		setSaving(true);
		try {
			await useFavoritesStore.getState().saveRoute({ name: trimmed, waypoints });
			toast.success(`Saved "${trimmed}"`);
			onClose();
		} catch {
			toast.error("Failed to save route");
		} finally {
			setSaving(false);
		}
	};

	const handleKeyDown = (e: React.KeyboardEvent) => {
		if (e.key === "Enter") handleSave();
		if (e.key === "Escape") onClose();
	};

	return (
		// biome-ignore lint/a11y/useKeyWithClickEvents: overlay dismiss is supplementary to Escape key
		// biome-ignore lint/a11y/noStaticElementInteractions: overlay is decorative backdrop
		<div className="save-dialog-overlay" onClick={onClose}>
			{/* biome-ignore lint/a11y/noStaticElementInteractions: stopPropagation prevents overlay dismiss */}
			{/* biome-ignore lint/a11y/useKeyWithClickEvents: keyboard handled via input onKeyDown */}
			<div className="save-dialog glass-panel" onClick={(e) => e.stopPropagation()}>
				<h3 style={{ margin: "0 0 12px", fontSize: "0.9rem" }}>Save Route</h3>
				<input
					ref={inputRef}
					className="save-dialog-input"
					type="text"
					placeholder="Route name"
					value={name}
					onChange={(e) => setName(e.target.value)}
					onKeyDown={handleKeyDown}
				/>
				<div className="save-dialog-preview">
					<span>{waypoints.length} waypoints</span>
				</div>
				<div className="save-dialog-actions">
					<button type="button" className="glass-button" onClick={onClose}>
						Cancel
					</button>
					<button
						type="button"
						className="glass-button save-dialog-save-btn"
						onClick={handleSave}
						disabled={!name.trim() || saving}
					>
						{saving ? "Saving…" : "Save"}
					</button>
				</div>
			</div>
		</div>
	);
}
