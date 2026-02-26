import { useRef } from "react";
import { toast } from "sonner";
import { useRouteStore } from "./stores/route-store";
import { detectRouteFormat, parseRouteFile } from "./utils/route-parser";

export default function FileImportButton() {
	const inputRef = useRef<HTMLInputElement>(null);

	function handleClick() {
		inputRef.current?.click();
	}

	function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
		const file = e.target.files?.[0];
		if (!file) return;

		const format = detectRouteFormat(file.name);
		if (!format) {
			toast.error("Unsupported file format", {
				description: "Please select a .gpx or .kml file",
			});
			e.target.value = "";
			return;
		}

		const reader = new FileReader();
		reader.readAsText(file);

		reader.onload = () => {
			const waypoints = parseRouteFile(reader.result as string, format);
			if (waypoints.length === 0) {
				toast.error("No route data found", {
					description: "The file does not contain any route coordinates",
				});
			} else {
				useRouteStore.getState().setWaypoints(waypoints);
				useRouteStore.getState().setInteractionMode("route");
				toast.success(`Imported ${waypoints.length} waypoints from ${file.name}`);
			}
		};

		reader.onerror = () => {
			toast.error("Failed to read file");
		};

		e.target.value = "";
	}

	return (
		<>
			<input
				ref={inputRef}
				type="file"
				accept=".gpx,.kml"
				onChange={handleFileChange}
				style={{ display: "none" }}
			/>
			<button type="button" className="glass-button import-button" onClick={handleClick}>
				Import Route
			</button>
		</>
	);
}
