import { gpx, kml } from "@tmcw/togeojson";
import type {
	FeatureCollection,
	GeoJsonProperties,
	Geometry,
	LineString,
	MultiLineString,
} from "geojson";
import { useRef } from "react";
import { useRouteStore } from "./stores/route-store";

export default function FileImportButton({
	onFitBounds,
}: {
	onFitBounds?: (waypoints: [number, number][]) => void;
}) {
	const inputRef = useRef<HTMLInputElement>(null);
	const setWaypoints = useRouteStore((s) => s.setWaypoints);

	const handleFile = (file: File) => {
		const reader = new FileReader();
		reader.onload = () => {
			const text = reader.result as string;
			const parser = new DOMParser();
			const doc = parser.parseFromString(text, "text/xml");

			let geoJson: FeatureCollection<Geometry | null, GeoJsonProperties>;
			if (file.name.toLowerCase().endsWith(".gpx")) {
				geoJson = gpx(doc);
			} else if (file.name.toLowerCase().endsWith(".kml")) {
				geoJson = kml(doc);
			} else {
				return;
			}

			const coords: [number, number][] = [];
			for (const feature of geoJson.features) {
				const geom = feature.geometry;
				if (!geom) continue;
				if (geom.type === "LineString") {
					for (const coord of (geom as LineString).coordinates) {
						coords.push([coord[1], coord[0]]);
					}
				} else if (geom.type === "MultiLineString") {
					for (const line of (geom as MultiLineString).coordinates) {
						for (const coord of line) {
							coords.push([coord[1], coord[0]]);
						}
					}
				}
			}

			if (coords.length > 0) {
				setWaypoints(coords);
				onFitBounds?.(coords);
			}
		};
		reader.readAsText(file);
	};

	return (
		<>
			<input
				ref={inputRef}
				type="file"
				accept=".gpx,.kml"
				className="hidden"
				onChange={(e) => {
					const file = e.target.files?.[0];
					if (file) handleFile(file);
					e.target.value = "";
				}}
			/>
			<button
				type="button"
				onClick={() => inputRef.current?.click()}
				className="rounded-[var(--radius-button)] bg-bg-surface/60 border border-border px-2.5 py-1.5 text-xs text-text-secondary hover:text-text-primary hover:bg-glass transition-colors whitespace-nowrap"
				title="Import GPX/KML file"
			>
				Import
			</button>
		</>
	);
}
