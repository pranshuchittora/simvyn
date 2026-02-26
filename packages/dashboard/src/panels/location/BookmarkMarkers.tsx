import { useMemo } from "react";
import { Marker, Tooltip } from "react-leaflet";
import { createBookmarkIcon } from "./markers";
import { useFavoritesStore } from "./stores/favorites-store";

export function BookmarkMarkers() {
	const locations = useFavoritesStore((s) => s.locations);

	const markers = useMemo(
		() => locations.map((loc) => ({ ...loc, icon: createBookmarkIcon(loc.emoji) })),
		[locations],
	);

	return (
		<>
			{markers.map((loc) => (
				<Marker key={loc.id} position={[loc.lat, loc.lon]} icon={loc.icon}>
					<Tooltip direction="top" offset={[0, -8]}>
						{loc.name}
					</Tooltip>
				</Marker>
			))}
		</>
	);
}
