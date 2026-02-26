import { useLocationStore } from "./stores/location-store";

export function CursorPosition() {
	const position = useLocationStore((s) => s.cursorPosition);
	if (!position) return null;

	return (
		<div className="cursor-position">
			{position[0].toFixed(6)}, {position[1].toFixed(6)}
		</div>
	);
}
