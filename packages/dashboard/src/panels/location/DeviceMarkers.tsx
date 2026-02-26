import { Marker, Tooltip } from "react-leaflet";
import { useDeviceStore } from "../../stores/device-store";
import { createDeviceIcon, createMixedDeviceIcon } from "./markers";

interface DeviceInfo {
	id: string;
	name: string;
	platform: "ios" | "android";
	state: string;
	lastLocation: { lat: number; lon: number } | null;
}

const iosIcon = createDeviceIcon("ios");
const androidIcon = createDeviceIcon("android");
const mixedIcon = createMixedDeviceIcon();

type DeviceWithLocation = DeviceInfo & { lastLocation: { lat: number; lon: number } };

function hasLocation(d: DeviceInfo): d is DeviceWithLocation {
	return d.lastLocation != null;
}

interface MarkerGroup {
	lat: number;
	lon: number;
	devices: DeviceWithLocation[];
}

function groupByLocation(devices: DeviceWithLocation[]): MarkerGroup[] {
	const groups = new Map<string, MarkerGroup>();

	for (const d of devices) {
		const key = `${d.lastLocation.lat},${d.lastLocation.lon}`;
		const existing = groups.get(key);
		if (existing) {
			existing.devices.push(d);
		} else {
			groups.set(key, { lat: d.lastLocation.lat, lon: d.lastLocation.lon, devices: [d] });
		}
	}

	return [...groups.values()];
}

export function DeviceMarkers() {
	const devices = useDeviceStore((s) => s.devices) as unknown as DeviceInfo[];
	const devicesWithLocation = devices.filter(hasLocation);
	const groups = groupByLocation(devicesWithLocation);

	return (
		<>
			{groups.map((group) => {
				const platforms = new Set(group.devices.map((d) => d.platform));
				const isMixed = platforms.has("ios") && platforms.has("android");
				const icon = isMixed
					? mixedIcon
					: group.devices[0].platform === "ios"
						? iosIcon
						: androidIcon;
				const label = group.devices.map((d) => d.name).join("\n");

				return (
					<Marker
						key={group.devices.map((d) => d.id).join(",")}
						position={[group.lat, group.lon]}
						icon={icon}
					>
						<Tooltip direction="right" offset={[12, 0]} permanent className="device-tooltip">
							{label}
						</Tooltip>
					</Marker>
				);
			})}
		</>
	);
}
