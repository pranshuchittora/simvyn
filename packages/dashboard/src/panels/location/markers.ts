import L from "leaflet";

export function createLocationPinIcon(): L.DivIcon {
	const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="42" viewBox="0 0 32 42">
		<path d="M16 0C7.16 0 0 7.16 0 16c0 12 16 26 16 26s16-14 16-26C32 7.16 24.84 0 16 0z" fill="#007AFF"/>
		<circle cx="16" cy="16" r="6" fill="white"/>
	</svg>`;

	return L.divIcon({
		html: `<div class="location-pin">${svg}</div>`,
		className: "",
		iconSize: [32, 42],
		iconAnchor: [16, 42],
		popupAnchor: [0, -44],
	});
}

export function createDeviceIcon(platform: "ios" | "android"): L.DivIcon {
	const color = platform === "ios" ? "#30d158" : "#a78bfa";
	const platformSvg =
		platform === "ios"
			? `<svg xmlns="http://www.w3.org/2000/svg" width="10" height="12" viewBox="0 0 10 12" fill="white">
				<path d="M8.5 4c-.5-1.5-1.8-2-2.8-2-.7 0-1.3.3-1.7.3-.4 0-1-.3-1.7-.3C1.1 2 0 3.2 0 5.3c0 1.3.5 2.6 1.1 3.5.5.7 1 1.2 1.6 1.2.6 0 .9-.4 1.6-.4.7 0 .9.4 1.6.4.6 0 1-.5 1.5-1.2.4-.5.6-1 .7-1.1-.8-.3-1.3-1.1-1.3-2 0-.8.4-1.5 1-1.9-.5-.5-1.1-.8-1.8-.8zM6.5 1.5c.4-.5.7-1.1.6-1.5-.6 0-1.3.4-1.7.9-.3.4-.6 1-.6 1.5.7 0 1.3-.4 1.7-.9z"/>
			</svg>`
			: `<svg xmlns="http://www.w3.org/2000/svg" width="10" height="12" viewBox="0 0 10 12" fill="white">
				<rect x="1" y="4" width="8" height="6" rx="1"/>
				<circle cx="3" cy="3" r="0.8"/>
				<circle cx="7" cy="3" r="0.8"/>
				<line x1="2" y1="1.5" x2="3" y2="3" stroke="white" stroke-width="0.6"/>
				<line x1="8" y1="1.5" x2="7" y2="3" stroke="white" stroke-width="0.6"/>
			</svg>`;

	return L.divIcon({
		html: `<div class="device-marker"><div class="device-marker-dot" style="background:${color};border:2px solid rgba(255,255,255,0.9);width:20px;height:20px;border-radius:50%;display:flex;align-items:center;justify-content:center;">${platformSvg}</div></div>`,
		className: "",
		iconSize: [20, 20],
		iconAnchor: [10, 10],
		popupAnchor: [0, -12],
	});
}

export function createMixedDeviceIcon(): L.DivIcon {
	return L.divIcon({
		html: `<div class="device-marker"><div class="device-marker-dot" style="background:linear-gradient(135deg, #30d158 50%, #a78bfa 50%);border:2px solid rgba(255,255,255,0.9);width:20px;height:20px;border-radius:50%;display:flex;align-items:center;justify-content:center;">
			<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 10 10" fill="white"><circle cx="5" cy="5" r="2.5"/></svg>
		</div></div>`,
		className: "",
		iconSize: [20, 20],
		iconAnchor: [10, 10],
		popupAnchor: [0, -12],
	});
}

export function createPlaybackIcon(): L.DivIcon {
	return L.divIcon({
		html: `<div class="playback-marker" style="width:16px;height:16px;background:#30D158;border:3px solid rgba(255,255,255,0.9);border-radius:50%;box-shadow:0 0 12px rgba(48,209,88,0.6);"></div>`,
		className: "",
		iconSize: [16, 16],
		iconAnchor: [8, 8],
	});
}

export function createBookmarkIcon(emoji?: string): L.DivIcon {
	if (emoji) {
		return L.divIcon({
			html: `<div class="bookmark-marker" style="width:28px;height:28px;display:flex;align-items:center;justify-content:center;font-size:18px;filter:drop-shadow(0 1px 2px rgba(0,0,0,0.5));">${emoji}</div>`,
			className: "",
			iconSize: [28, 28],
			iconAnchor: [14, 28],
			popupAnchor: [0, -30],
		});
	}
	return L.divIcon({
		html: `<div class="bookmark-marker-default" style="width:12px;height:12px;background:rgba(255,214,10,0.6);border:2px solid rgba(255,255,255,0.5);border-radius:50%;"></div>`,
		className: "",
		iconSize: [12, 12],
		iconAnchor: [6, 6],
		popupAnchor: [0, -8],
	});
}

export function createWaypointIcon(index: number): L.DivIcon {
	const num = index + 1;
	return L.divIcon({
		html: `<div class="waypoint-marker" style="width:24px;height:24px;background:#FF9500;border:2px solid rgba(255,255,255,0.9);border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:600;color:white;font-family:-apple-system,BlinkMacSystemFont,sans-serif;">${num}</div>`,
		className: "",
		iconSize: [24, 24],
		iconAnchor: [12, 12],
		popupAnchor: [0, -14],
	});
}
