import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { useEffect, useRef } from "react";
import {
	CircleMarker,
	MapContainer,
	TileLayer,
	Tooltip,
	useMap,
	useMapEvents,
	ZoomControl,
} from "react-leaflet";
import { BookmarkMarkers } from "./BookmarkMarkers";
import { DeviceMarkers } from "./DeviceMarkers";
import { LocationMarker } from "./LocationMarker";
import { TILE_STYLES, type TileStyle } from "./MapStyleSwitcher";
import { MyLocationButton } from "./MyLocationButton";
import { PlaybackMarker } from "./PlaybackMarker";
import { RouteLayer } from "./RouteLayer";
import { useLocationStore } from "./stores/location-store";
import { useRouteStore } from "./stores/route-store";

function MapEventHandler() {
	const setMarkerPosition = useLocationStore((s) => s.setMarkerPosition);
	const setCursorPosition = useLocationStore((s) => s.setCursorPosition);
	const interactionMode = useRouteStore((s) => s.interactionMode);
	const addWaypoint = useRouteStore((s) => s.addWaypoint);

	useMapEvents({
		click(e) {
			if (interactionMode === "route") {
				addWaypoint([e.latlng.lat, e.latlng.lng]);
			} else {
				setMarkerPosition([e.latlng.lat, e.latlng.lng]);
			}
		},
		mousemove(e) {
			setCursorPosition([e.latlng.lat, e.latlng.lng]);
		},
		mouseout() {
			setCursorPosition(null);
		},
	});

	return null;
}

function MyLocationMarker() {
	const myLocation = useLocationStore((s) => s.myLocation);
	if (!myLocation) return null;

	return (
		<CircleMarker
			center={myLocation}
			radius={8}
			pathOptions={{
				fillColor: "#4A90D9",
				fillOpacity: 0.9,
				color: "white",
				weight: 3,
				opacity: 1,
			}}
			interactive={false}
		>
			<Tooltip direction="top" offset={[0, -10]} className="device-tooltip">
				My Location
			</Tooltip>
		</CircleMarker>
	);
}

function MapController() {
	const map = useMap();
	const markerPosition = useLocationStore((s) => s.markerPosition);

	useEffect(() => {
		if (markerPosition) {
			map.setView(markerPosition, map.getZoom());
		}
	}, [markerPosition, map]);

	return null;
}

function RouteController() {
	const map = useMap();
	const waypoints = useRouteStore((s) => s.waypoints);
	const prevLengthRef = useRef(waypoints.length);

	useEffect(() => {
		if (waypoints.length >= 2 && Math.abs(waypoints.length - prevLengthRef.current) > 1) {
			map.fitBounds(L.latLngBounds(waypoints), { padding: [50, 50] });
		}
		prevLengthRef.current = waypoints.length;
	}, [waypoints, map]);

	return null;
}

function MapStyleControl({
	currentStyle,
	onStyleChange,
}: {
	currentStyle: TileStyle;
	onStyleChange: (s: TileStyle) => void;
}) {
	const map = useMap();
	const containerRef = useRef<HTMLDivElement | null>(null);
	const menuOpenRef = useRef(false);

	useEffect(() => {
		const container = document.createElement("div");
		container.className = "map-style-control";
		containerRef.current = container;

		const CustomControl = L.Control.extend({
			onAdd() {
				L.DomEvent.disableClickPropagation(container);
				L.DomEvent.disableScrollPropagation(container);
				return container;
			},
			onRemove() {},
		});

		const control = new CustomControl({ position: "bottomright" });
		control.addTo(map);

		return () => {
			control.remove();
		};
	}, [map]);

	useEffect(() => {
		const container = containerRef.current;
		if (!container) return;
		const el = container;

		function render(open: boolean) {
			el.innerHTML = `
				<button class="glass-button map-style-toggle" title="Map style">
					<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
						<title>Map style</title>
						<polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6"/>
						<line x1="8" y1="2" x2="8" y2="18"/>
						<line x1="16" y1="6" x2="16" y2="22"/>
					</svg>
				</button>
				${
					open
						? `<div class="map-style-menu glass-panel">
					${TILE_STYLES.map(
						(s) =>
							`<button class="map-style-option ${s.id === currentStyle.id ? "active" : ""}" data-style-id="${s.id}">${s.name}</button>`,
					).join("")}
				</div>`
						: ""
				}
			`;

			const toggleBtn = el.querySelector(".map-style-toggle");
			if (toggleBtn) {
				L.DomEvent.disableClickPropagation(toggleBtn as HTMLElement);
				toggleBtn.addEventListener("click", (e) => {
					e.stopPropagation();
					menuOpenRef.current = !menuOpenRef.current;
					render(menuOpenRef.current);
				});
			}

			const optionBtns = el.querySelectorAll(".map-style-option");
			for (const btn of optionBtns) {
				btn.addEventListener("click", (e) => {
					e.stopPropagation();
					const id = (btn as HTMLElement).dataset.styleId;
					const found = TILE_STYLES.find((s) => s.id === id);
					if (found) {
						onStyleChange(found);
						menuOpenRef.current = false;
						render(false);
					}
				});
			}
		}

		render(menuOpenRef.current);
	}, [currentStyle, onStyleChange]);

	return null;
}

interface MapViewProps {
	tileStyle: TileStyle;
	onTileStyleChange: (style: TileStyle) => void;
}

function ResizeHandler() {
	const map = useMap();

	useEffect(() => {
		const container = map.getContainer();
		const observer = new ResizeObserver(() => {
			map.invalidateSize();
		});
		observer.observe(container);
		return () => observer.disconnect();
	}, [map]);

	return null;
}

function MinZoomEnforcer() {
	const map = useMap();

	useEffect(() => {
		function update() {
			const h = map.getContainer().clientHeight;
			const minZ = Math.ceil(Math.log2(h / 256));
			const clamped = Math.max(minZ, 2);
			map.setMinZoom(clamped);
			if (map.getZoom() < clamped) {
				map.setZoom(clamped);
			}
		}
		update();
		window.addEventListener("resize", update);
		return () => window.removeEventListener("resize", update);
	}, [map]);

	return null;
}

export default function MapView({ tileStyle, onTileStyleChange }: MapViewProps) {
	return (
		<MapContainer
			center={[37.7749, -122.4194]}
			zoom={13}
			minZoom={3}
			maxBounds={[
				[-90, -Infinity],
				[90, Infinity],
			]}
			maxBoundsViscosity={1.0}
			className="map-container"
			zoomControl={false}
		>
			<ZoomControl position="bottomright" />
			<ResizeHandler />
			<MinZoomEnforcer />
			<TileLayer
				key={tileStyle.id}
				attribution={tileStyle.attribution}
				url={tileStyle.url}
				subdomains={tileStyle.subdomains || ""}
				maxZoom={tileStyle.maxZoom || 20}
			/>
			<MapEventHandler />
			<LocationMarker />
			<MyLocationMarker />
			<MapController />
			<BookmarkMarkers />
			<DeviceMarkers />
			<RouteLayer />
			<RouteController />
			<PlaybackMarker />
			<MapStyleControl currentStyle={tileStyle} onStyleChange={onTileStyleChange} />
			<MyLocationButton />
		</MapContainer>
	);
}
