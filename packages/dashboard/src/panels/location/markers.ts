import L from "leaflet";

export function createLocationIcon(): L.DivIcon {
	return L.divIcon({
		className: "marker-location",
		iconSize: [24, 36],
		iconAnchor: [12, 36],
		popupAnchor: [0, -36],
	});
}

export function createPlaybackIcon(): L.DivIcon {
	return L.divIcon({
		className: "marker-playback",
		iconSize: [16, 16],
		iconAnchor: [8, 8],
	});
}

export function createWaypointIcon(index: number): L.DivIcon {
	return L.divIcon({
		className: "marker-waypoint",
		html: `<span>${index + 1}</span>`,
		iconSize: [24, 24],
		iconAnchor: [12, 12],
	});
}

export function createSearchResultIcon(): L.DivIcon {
	return L.divIcon({
		className: "marker-search",
		iconSize: [24, 36],
		iconAnchor: [12, 36],
		popupAnchor: [0, -36],
	});
}
