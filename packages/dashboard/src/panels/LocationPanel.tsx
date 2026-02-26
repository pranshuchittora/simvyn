import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { useWs, useWsListener } from "../hooks/use-ws";
import { useDeviceStore } from "../stores/device-store";
import { registerPanel } from "../stores/panel-registry";
import { CursorPosition } from "./location/CursorPosition";
import FavoritesPanel from "./location/FavoritesPanel";
import FileImportButton from "./location/FileImportButton";
import { TILE_STYLES, type TileStyle } from "./location/MapStyleSwitcher";
import MapView from "./location/MapView";
import ModeSelector from "./location/ModeSelector";
import PlaybackControls from "./location/PlaybackControls";
import RouteActionBar from "./location/RouteActionBar";
import SearchBar from "./location/SearchBar";
import { useFavoritesStore } from "./location/stores/favorites-store";
import { useLocationStore } from "./location/stores/location-store";
import { kmhToMs, usePlaybackStore } from "./location/stores/playback-store";
import { useRouteStore } from "./location/stores/route-store";
import "./location/location-panel.css";

function LocationPanel() {
	const { send } = useWs();
	const [tileStyle, setTileStyle] = useState<TileStyle>(TILE_STYLES[0]);
	const [showBookmarks, setShowBookmarks] = useState(false);
	const reverseGeocodeCounter = useRef(0);

	const markerPosition = useLocationStore((s) => s.markerPosition);
	const reverseGeocode = useLocationStore((s) => s.reverseGeocode);
	const setReverseGeocode = useLocationStore((s) => s.setReverseGeocode);
	const waypoints = useRouteStore((s) => s.waypoints);

	// subscribe to location channel on mount + fetch favorites
	useEffect(() => {
		send({
			channel: "system",
			type: "subscribe",
			payload: { channel: "location" },
		});
		useFavoritesStore.getState().fetchLocations();
		return () => {
			send({
				channel: "system",
				type: "unsubscribe",
				payload: { channel: "location" },
			});
		};
	}, [send]);

	// helper to send location-channel WS messages
	const sendLocation = useCallback(
		(type: string, payload: Record<string, unknown>) => {
			send({ channel: "location", type, payload });
		},
		[send],
	);

	// ─── WS listeners ───

	const handleLocationSet = useCallback((payload: unknown) => {
		const msg = payload as {
			results: { success: boolean; error?: string }[];
			lat: number;
			lon: number;
		};
		const successCount = msg.results?.filter((r) => r.success).length ?? 0;
		const failCount = msg.results?.filter((r) => !r.success).length ?? 0;
		if (failCount === 0 && successCount > 0) {
			toast.success(`Location set on ${successCount} device${successCount > 1 ? "s" : ""}`, {
				description: `${msg.lat.toFixed(4)}, ${msg.lon.toFixed(4)}`,
			});
		} else if (successCount > 0) {
			toast.warning(`Set on ${successCount}, failed on ${failCount} device(s)`);
		} else if (successCount === 0 && failCount > 0) {
			toast.error("Failed to set location", { description: msg.results[0]?.error });
		}
		if (successCount === 0 && failCount === 0) {
			toast.info("No devices detected", {
				description: "Start an iOS Simulator or Android Emulator",
			});
		}
	}, []);

	const handlePlaybackStarted = useCallback(() => {
		usePlaybackStore.getState().setStatus("playing");
		toast.success("Playback started");
	}, []);

	const handlePlaybackPosition = useCallback((payload: unknown) => {
		const p = payload as { lat: number; lon: number; progress: number };
		usePlaybackStore.getState().setCurrentPosition([p.lat, p.lon]);
		usePlaybackStore.getState().setProgress(p.progress);
	}, []);

	const handlePlaybackPaused = useCallback(() => {
		usePlaybackStore.getState().setStatus("paused");
		toast.info("Playback paused");
	}, []);

	const handlePlaybackResumed = useCallback(() => {
		usePlaybackStore.getState().setStatus("playing");
	}, []);

	const handlePlaybackStopped = useCallback(() => {
		usePlaybackStore.getState().reset();
		toast.info("Playback stopped");
	}, []);

	const handlePlaybackComplete = useCallback((payload: unknown) => {
		const msg = payload as { looping?: boolean };
		if (msg.looping) {
			toast.info("Route looping...");
		} else {
			usePlaybackStore.getState().reset();
			toast.success("Route playback complete");
		}
	}, []);

	const handlePlaybackError = useCallback((payload: unknown) => {
		const msg = payload as { message?: string };
		toast.error("Playback error", { description: msg.message });
		usePlaybackStore.getState().reset();
	}, []);

	const handleSpeedChanged = useCallback((_payload: unknown) => {
		// speed-changed acknowledgement — no action needed
	}, []);

	useWsListener("location", "location-set", handleLocationSet);
	useWsListener("location", "playback-started", handlePlaybackStarted);
	useWsListener("location", "playback-position", handlePlaybackPosition);
	useWsListener("location", "playback-paused", handlePlaybackPaused);
	useWsListener("location", "playback-resumed", handlePlaybackResumed);
	useWsListener("location", "playback-stopped", handlePlaybackStopped);
	useWsListener("location", "playback-complete", handlePlaybackComplete);
	useWsListener("location", "playback-error", handlePlaybackError);
	useWsListener("location", "speed-changed", handleSpeedChanged);

	// ─── markerPosition change → set location on device + reverse geocode ───

	useEffect(() => {
		if (markerPosition) {
			const deviceIds = useDeviceStore.getState().selectedDeviceIds;
			for (const deviceId of deviceIds) {
				sendLocation("set-location", {
					lat: markerPosition[0],
					lon: markerPosition[1],
					deviceId,
				});
			}

			const requestId = ++reverseGeocodeCounter.current;
			fetch(`/api/modules/location/reverse?lat=${markerPosition[0]}&lon=${markerPosition[1]}`)
				.then((res) => {
					if (!res.ok) throw new Error("Reverse geocode failed");
					return res.json();
				})
				.then((data) => {
					if (requestId === reverseGeocodeCounter.current) {
						setReverseGeocode(data.display_name ?? null);
					}
				})
				.catch(() => {
					if (requestId === reverseGeocodeCounter.current) {
						setReverseGeocode(null);
					}
				});
		} else {
			setReverseGeocode(null);
		}
	}, [markerPosition, setReverseGeocode, sendLocation]);

	// ─── handlers ───

	const handleLoadLocation = useCallback((lat: number, lon: number) => {
		useLocationStore.getState().setMarkerPosition([lat, lon]);
		useRouteStore.getState().setInteractionMode("point");
	}, []);

	const handleLoadRoute = useCallback((wps: [number, number][]) => {
		useRouteStore.getState().setInteractionMode("route");
		useRouteStore.getState().setWaypoints(wps);
	}, []);

	const handlePlayRoute = useCallback(() => {
		const { waypoints: wps } = useRouteStore.getState();
		if (wps.length < 2) return;

		const { speedKmh, multiplier, loop } = usePlaybackStore.getState();
		const deviceIds = useDeviceStore.getState().selectedDeviceIds;

		for (const deviceId of deviceIds) {
			sendLocation("start-playback", {
				waypoints: wps,
				speedMs: kmhToMs(speedKmh),
				multiplier,
				loop,
				deviceId,
			});
		}
	}, [sendLocation]);

	const handleBookmarkClick = () => {
		setShowBookmarks(!showBookmarks);
	};

	return (
		<div className="location-panel">
			<MapView tileStyle={tileStyle} onTileStyleChange={setTileStyle} />
			<SearchBar />
			<div className="route-controls">
				<ModeSelector />
				<FileImportButton />
			</div>
			<RouteActionBar onPlay={handlePlayRoute} />
			<FavoritesPanel
				open={showBookmarks}
				onToggle={handleBookmarkClick}
				onLoadLocation={handleLoadLocation}
				onLoadRoute={handleLoadRoute}
				markerPosition={markerPosition}
				reverseGeocode={reverseGeocode}
				waypoints={waypoints}
			/>
			<PlaybackControls sendLocation={sendLocation} />
			<CursorPosition />
		</div>
	);
}

registerPanel("location", LocationPanel);

export default LocationPanel;
