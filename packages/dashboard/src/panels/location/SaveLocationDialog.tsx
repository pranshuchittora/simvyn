import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { useFavoritesStore } from "./stores/favorites-store";

const EMOJI_OPTIONS = ["📍", "🏠", "🏢", "☕", "🍕", "🏖️", "🏔️", "🎯", "⭐", "❤️", "🚀", "🎮"];

interface Props {
	lat: number;
	lon: number;
	address?: string | null;
	onClose: () => void;
}

export default function SaveLocationDialog({ lat, lon, address, onClose }: Props) {
	const [name, setName] = useState("");
	const [emoji, setEmoji] = useState<string | undefined>(undefined);
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
			await useFavoritesStore
				.getState()
				.saveLocation({ name: trimmed, lat, lon, address: address ?? undefined, emoji });
			toast.success(`Saved "${trimmed}"`);
			onClose();
		} catch {
			toast.error("Failed to save location");
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
				<h3 style={{ margin: "0 0 12px", fontSize: "0.9rem" }}>Save Location</h3>
				<div className="emoji-picker">
					{EMOJI_OPTIONS.map((e) => (
						<button
							key={e}
							type="button"
							className={`emoji-picker-item${emoji === e ? " selected" : ""}`}
							onClick={() => setEmoji(emoji === e ? undefined : e)}
						>
							{e}
						</button>
					))}
				</div>
				<input
					ref={inputRef}
					className="save-dialog-input"
					type="text"
					placeholder="Location name"
					value={name}
					onChange={(e) => setName(e.target.value)}
					onKeyDown={handleKeyDown}
				/>
				<div className="save-dialog-preview">
					<span>
						{lat.toFixed(5)}, {lon.toFixed(5)}
					</span>
					{address && (
						<span style={{ color: "rgba(255,255,255,0.4)", fontSize: "0.75rem" }}>{address}</span>
					)}
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
