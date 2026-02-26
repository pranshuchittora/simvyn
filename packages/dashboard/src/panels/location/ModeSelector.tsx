import { useLocationStore } from "./stores/location-store";

export default function ModeSelector() {
	const mode = useLocationStore((s) => s.mode);
	const setMode = useLocationStore((s) => s.setMode);

	return (
		<div className="flex rounded-[var(--radius-button)] overflow-hidden border border-border">
			<button
				type="button"
				onClick={() => setMode("point")}
				className={`px-3 py-1 text-xs font-medium transition-colors ${
					mode === "point"
						? "bg-accent-blue/20 text-accent-blue"
						: "bg-bg-surface/40 text-text-secondary hover:text-text-primary"
				}`}
			>
				Point
			</button>
			<button
				type="button"
				onClick={() => setMode("route")}
				className={`px-3 py-1 text-xs font-medium transition-colors border-l border-border ${
					mode === "route"
						? "bg-accent-purple/20 text-accent-purple"
						: "bg-bg-surface/40 text-text-secondary hover:text-text-primary"
				}`}
			>
				Route
			</button>
		</div>
	);
}
