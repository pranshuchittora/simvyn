import type { Map as LeafletMap } from "leaflet";
import { useCallback, useEffect, useRef, useState } from "react";
import { useWs, useWsListener } from "../hooks/use-ws";
import { useDeviceStore } from "../stores/device-store";
import { registerPanel } from "../stores/panel-registry";
import FavoritesPanel from "./location/FavoritesPanel";
import FileImportButton from "./location/FileImportButton";
import MapView from "./location/MapView";
import ModeSelector from "./location/ModeSelector";
import PlaybackControls from "./location/PlaybackControls";
import SearchBar from "./location/SearchBar";
import { useLocationStore } from "./location/stores/location-store";
import { usePlaybackStore } from "./location/stores/playback-store";
import "./location/location-panel.css";

function LocationPanel() {
	const { send } = useWs();
	const [showFavorites, setShowFavorites] = useState(false);
	const mapRef = useRef<LeafletMap | null>(null);

	const devices = useDeviceStore((s) => s.devices);
	const selectedDeviceId = useLocationStore((s) => s.selectedDeviceId);
	const setSelectedDevice = useLocationStore((s) => s.setSelectedDevice);
	const setCurrentLocation = useLocationStore((s) => s.setCurrentLocation);
	const setPlaybackState = usePlaybackStore((s) => s.setPlaybackState);
	const setPlaybackPosition = usePlaybackStore((s) => s.setPosition);
	const resetPlayback = usePlaybackStore((s) => s.reset);

	// auto-select first booted device
	useEffect(() => {
		if (!selectedDeviceId) {
			const booted = devices.find((d) => d.state === "booted");
			if (booted) setSelectedDevice(booted.id);
			else if (devices.length > 0) setSelectedDevice(devices[0].id);
		}
	}, [devices, selectedDeviceId, setSelectedDevice]);

	// subscribe to location channel on mount
	useEffect(() => {
		send({
			channel: "system",
			type: "subscribe",
			payload: { channel: "location" },
		});
		return () => {
			send({
				channel: "system",
				type: "unsubscribe",
				payload: { channel: "location" },
			});
		};
	}, [send]);

	// WS listeners for playback events
	const handlePlaybackPosition = useCallback(
		(payload: unknown) => {
			const p = payload as { lat: number; lon: number; progress: number };
			setPlaybackPosition(p.lat, p.lon, p.progress);
		},
		[setPlaybackPosition],
	);

	const handlePlaybackComplete = useCallback(() => {
		resetPlayback();
	}, [resetPlayback]);

	const handleLocationSet = useCallback(
		(payload: unknown) => {
			const p = payload as { lat: number; lon: number };
			setCurrentLocation(p.lat, p.lon);
		},
		[setCurrentLocation],
	);

	const handlePlaybackPaused = useCallback(() => {
		setPlaybackState("paused");
	}, [setPlaybackState]);

	const handlePlaybackResumed = useCallback(() => {
		setPlaybackState("playing");
	}, [setPlaybackState]);

	const handlePlaybackStarted = useCallback(() => {
		setPlaybackState("playing");
	}, [setPlaybackState]);

	const handlePlaybackStopped = useCallback(() => {
		resetPlayback();
	}, [resetPlayback]);

	useWsListener("location", "playback-position", handlePlaybackPosition);
	useWsListener("location", "playback-complete", handlePlaybackComplete);
	useWsListener("location", "location-set", handleLocationSet);
	useWsListener("location", "playback-paused", handlePlaybackPaused);
	useWsListener("location", "playback-resumed", handlePlaybackResumed);
	useWsListener("location", "playback-started", handlePlaybackStarted);
	useWsListener("location", "playback-stopped", handlePlaybackStopped);

	const flyTo = (lat: number, lon: number) => {
		mapRef.current?.flyTo([lat, lon], 15);
	};

	const fitBounds = (waypoints: [number, number][]) => {
		if (waypoints.length > 0 && mapRef.current) {
			const bounds = waypoints.map(([lat, lon]) => [lat, lon] as [number, number]);
			mapRef.current.fitBounds(bounds);
		}
	};

	return (
		<div className="location-panel">
			<div className="location-toolbar">
				<ModeSelector />
				<SearchBar onFlyTo={flyTo} />

				{/* Device selector */}
				<select
					value={selectedDeviceId ?? ""}
					onChange={(e) => setSelectedDevice(e.target.value || null)}
					className="rounded-[var(--radius-button)] bg-bg-surface/60 border border-border px-2 py-1.5 text-xs text-text-secondary max-w-[140px] truncate"
				>
					<option value="">No device</option>
					{devices.map((d) => (
						<option key={d.id} value={d.id}>
							{d.name} {d.state === "booted" ? "" : `(${d.state})`}
						</option>
					))}
				</select>

				<FileImportButton onFitBounds={fitBounds} />
				<button
					type="button"
					onClick={() => setShowFavorites(!showFavorites)}
					className={`rounded-[var(--radius-button)] border px-2.5 py-1.5 text-xs transition-colors whitespace-nowrap ${
						showFavorites
							? "bg-accent-blue/20 text-accent-blue border-accent-blue/30"
							: "bg-bg-surface/60 border-border text-text-secondary hover:text-text-primary hover:bg-glass"
					}`}
					title="Favorites"
				>
					Favs
				</button>
			</div>

			<div className="location-map">
				<MapView mapRef={mapRef} />
				<PlaybackControls />
			</div>

			{showFavorites && <FavoritesPanel onFlyTo={flyTo} onClose={() => setShowFavorites(false)} />}
		</div>
	);
}

registerPanel("location", LocationPanel);

export default LocationPanel;
