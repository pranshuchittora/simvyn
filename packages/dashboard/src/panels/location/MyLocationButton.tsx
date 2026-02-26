import L from "leaflet";
import { useEffect, useRef, useState } from "react";
import { useMap } from "react-leaflet";
import { toast } from "sonner";
import { useLocationStore } from "./stores/location-store";

export function MyLocationButton() {
	const map = useMap();
	const [loading, setLoading] = useState(false);
	const containerRef = useRef<HTMLDivElement | null>(null);

	useEffect(() => {
		const container = document.createElement("div");
		container.className = "my-location-control";
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

		const icon = loading
			? `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="spin"><title>Loading</title><circle cx="12" cy="12" r="10" stroke-dasharray="32" stroke-dashoffset="12"/></svg>`
			: `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><title>My location</title><circle cx="12" cy="12" r="3"/><line x1="12" y1="2" x2="12" y2="6"/><line x1="12" y1="18" x2="12" y2="22"/><line x1="2" y1="12" x2="6" y2="12"/><line x1="18" y1="12" x2="22" y2="12"/></svg>`;

		container.innerHTML = `<button class="glass-button my-location-btn" title="My location" ${loading ? "disabled" : ""}>${icon}</button>`;

		const btn = container.querySelector(".my-location-btn");
		if (btn) {
			L.DomEvent.disableClickPropagation(btn as HTMLElement);
			btn.addEventListener("click", (e) => {
				e.stopPropagation();
				if (!navigator.geolocation) {
					toast.error("Geolocation not supported by your browser");
					return;
				}

				setLoading(true);
				navigator.geolocation.getCurrentPosition(
					(pos) => {
						const coords: [number, number] = [pos.coords.latitude, pos.coords.longitude];
						useLocationStore.getState().setMyLocation(coords);
						map.setView(coords, 15);
						setLoading(false);
					},
					(err) => {
						setLoading(false);
						if (err.code === 1) {
							toast.error("Location access denied");
						} else {
							toast.error("Could not get your location");
						}
					},
					{ enableHighAccuracy: true, timeout: 10000 },
				);
			});
		}
	}, [loading, map]);

	return null;
}
