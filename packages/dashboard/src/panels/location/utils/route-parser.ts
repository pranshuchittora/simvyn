import { gpx, kml } from "@tmcw/togeojson";

export type RouteFileFormat = "gpx" | "kml";

// GeoJSON uses [lon, lat], Leaflet uses [lat, lon]
export function parseRouteFile(text: string, format: RouteFileFormat): [number, number][] {
	const dom = new DOMParser().parseFromString(text, "text/xml");
	const fc = format === "gpx" ? gpx(dom) : kml(dom);
	const coords: [number, number][] = [];

	for (const feature of fc.features) {
		const geom = feature.geometry;
		if (!geom) continue;

		if (geom.type === "Point") {
			coords.push([geom.coordinates[1], geom.coordinates[0]]);
		} else if (geom.type === "LineString") {
			for (const coord of geom.coordinates) {
				coords.push([coord[1], coord[0]]);
			}
		} else if (geom.type === "MultiLineString") {
			for (const line of geom.coordinates) {
				for (const coord of line) {
					coords.push([coord[1], coord[0]]);
				}
			}
		}
	}

	return coords;
}

export function detectRouteFormat(filename: string): RouteFileFormat | null {
	const lower = filename.toLowerCase();
	if (lower.endsWith(".gpx")) return "gpx";
	if (lower.endsWith(".kml")) return "kml";
	return null;
}
