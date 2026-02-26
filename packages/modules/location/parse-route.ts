import { gpx, kml } from "@tmcw/togeojson";
import { DOMParser } from "@xmldom/xmldom";

export function parseRouteFile(content: string, format: "gpx" | "kml"): [number, number][] {
	const doc = new DOMParser().parseFromString(content, "text/xml");
	const geojson = format === "gpx" ? gpx(doc) : kml(doc);

	const coords: [number, number][] = [];

	for (const feature of geojson.features) {
		const geom = feature.geometry;
		if (!geom) continue;

		if (geom.type === "LineString") {
			for (const [lon, lat] of geom.coordinates) {
				coords.push([lat, lon]);
			}
		} else if (geom.type === "MultiLineString") {
			for (const line of geom.coordinates) {
				for (const [lon, lat] of line) {
					coords.push([lat, lon]);
				}
			}
		} else if (geom.type === "Point") {
			const [lon, lat] = geom.coordinates;
			coords.push([lat, lon]);
		}
	}

	if (coords.length === 0) {
		throw new Error("No route coordinates found in file");
	}

	return coords;
}

export function detectFormat(filename: string): "gpx" | "kml" {
	const ext = filename.toLowerCase().split(".").pop();
	if (ext === "gpx") return "gpx";
	if (ext === "kml") return "kml";
	throw new Error(`Unrecognized route file extension: .${ext} (expected .gpx or .kml)`);
}
