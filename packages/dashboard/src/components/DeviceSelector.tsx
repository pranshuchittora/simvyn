import type { Device } from "@simvyn/types";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { useWsListener } from "../hooks/use-ws";
import { useDeviceStore } from "../stores/device-store";
import { useFavouriteStore } from "../stores/favourite-store";
import { useModuleStore } from "../stores/module-store";

const MULTI_SELECT_MODULES = new Set(["location"]);

function groupDevicesWithFavourites(devices: Device[], favouriteIds: Set<string>) {
	const favourites: Device[] = [];
	const rest: Device[] = [];

	for (const d of devices) {
		if (favouriteIds.has(d.id)) {
			favourites.push(d);
		} else {
			rest.push(d);
		}
	}

	// Sub-group favourites by platform
	const favIos = favourites.filter((d) => d.platform === "ios");
	const favAndroid = favourites.filter((d) => d.platform === "android");

	// Group remaining devices into standard groups
	const groups: Record<string, Device[]> = {};
	for (const d of rest) {
		let section: string;
		if (d.deviceType === "Physical" || d.id.startsWith("physical:")) {
			section = "Physical Devices";
		} else if (d.platform === "android") {
			section = "Emulators";
		} else {
			section = "Simulators";
		}
		(groups[section] ??= []).push(d);
	}
	const orderedRest: Record<string, Device[]> = {};
	for (const key of ["Physical Devices", "Simulators", "Emulators"]) {
		if (groups[key]?.length) orderedRest[key] = groups[key];
	}

	return { favIos, favAndroid, rest: orderedRest };
}

function StarIcon({
	filled,
	onClick,
}: {
	filled: boolean;
	onClick: (e: React.MouseEvent) => void;
}) {
	return (
		<svg
			className={`h-3.5 w-3.5 cursor-pointer transition-colors ${
				filled ? "text-amber-400" : "text-text-muted/40 hover:text-amber-400/60"
			}`}
			viewBox="0 0 24 24"
			fill={filled ? "currentColor" : "none"}
			stroke="currentColor"
			strokeWidth={2}
			onClick={onClick}
		>
			<title>{filled ? "Remove from Favourites" : "Add to Favourites"}</title>
			<path
				strokeLinecap="round"
				strokeLinejoin="round"
				d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z"
			/>
		</svg>
	);
}

function StateIndicator({ state }: { state: Device["state"] }) {
	return (
		<span
			className={`inline-block h-2 w-2 rounded-full ${
				state === "booted" ? "bg-green-500 ring-2 ring-green-500/20" : "bg-text-muted/50"
			}`}
		/>
	);
}

interface ContextMenuState {
	x: number;
	y: number;
	deviceId: string;
}

export default function DeviceSelector() {
	const [open, setOpen] = useState(false);
	const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null);
	const ref = useRef<HTMLDivElement>(null);
	const dropdownRef = useRef<HTMLDivElement>(null);

	const devices = useDeviceStore((s) => s.devices);
	const selectedDeviceIds = useDeviceStore((s) => s.selectedDeviceIds);
	const selectDevice = useDeviceStore((s) => s.selectDevice);
	const toggleDevice = useDeviceStore((s) => s.toggleDevice);
	const truncateToFirst = useDeviceStore((s) => s.truncateToFirst);

	const favouriteIds = useFavouriteStore((s) => s.favouriteIds);
	const toggleFavourite = useFavouriteStore((s) => s.toggle);
	const isFavourite = useFavouriteStore((s) => s.isFavourite);

	const activeModule = useModuleStore((s) => s.activeModule);
	const isMultiSelect = MULTI_SELECT_MODULES.has(activeModule ?? "");

	const handleDeviceDisconnected = useCallback((payload: unknown) => {
		const { name } = payload as { id: string; name: string };
		toast(`${name} disconnected`, { description: "Physical device removed" });
	}, []);
	useWsListener("devices", "device-disconnected", handleDeviceDisconnected);

	const { favIos, favAndroid, rest } = groupDevicesWithFavourites(devices, favouriteIds);

	useEffect(() => {
		if (!isMultiSelect && selectedDeviceIds.length > 1) {
			truncateToFirst();
		}
	}, [isMultiSelect, selectedDeviceIds.length, truncateToFirst]);

	// Close dropdown on outside click
	useEffect(() => {
		function handleClick(e: MouseEvent) {
			if (ref.current && !ref.current.contains(e.target as Node)) {
				setOpen(false);
				setContextMenu(null);
			}
		}
		document.addEventListener("mousedown", handleClick);
		return () => document.removeEventListener("mousedown", handleClick);
	}, []);

	// Close context menu on click anywhere
	useEffect(() => {
		if (!contextMenu) return;
		function handleClick() {
			setContextMenu(null);
		}
		document.addEventListener("mousedown", handleClick);
		return () => document.removeEventListener("mousedown", handleClick);
	}, [contextMenu]);

	const handleContextMenu = (e: React.MouseEvent, deviceId: string) => {
		e.preventDefault();
		const dropdownRect = dropdownRef.current?.getBoundingClientRect();
		if (!dropdownRect) return;
		const x = e.clientX - dropdownRect.left;
		const y = e.clientY - dropdownRect.top;
		setContextMenu({ x, y, deviceId });
	};

	const selectedSet = new Set(selectedDeviceIds);
	const firstDevice = devices.find((d) => d.id === selectedDeviceIds[0]);

	let label: string;
	if (selectedDeviceIds.length === 0) {
		label = "No devices";
	} else if (selectedDeviceIds.length > 1) {
		label = `${selectedDeviceIds.length} devices selected`;
	} else {
		label = firstDevice?.name ?? "No devices";
	}

	const renderDeviceRow = (d: Device) => {
		const isSelected = selectedSet.has(d.id);
		return (
			<button
				type="button"
				key={d.id}
				onClick={() => {
					if (isMultiSelect) {
						toggleDevice(d.id);
					} else {
						selectDevice(d.id);
						setOpen(false);
					}
				}}
				onContextMenu={(e) => handleContextMenu(e, d.id)}
				className={`flex w-full items-center gap-2 rounded-[var(--radius-button)] px-3 py-2 text-left text-sm transition-colors ${
					isSelected
						? "bg-accent-blue/20 text-accent-blue"
						: "text-text-primary hover:bg-[rgba(255,255,255,0.08)]"
				}`}
			>
				{isMultiSelect ? (
					<span
						className={`inline-flex h-3.5 w-3.5 items-center justify-center rounded-full border ${
							isSelected
								? "border-accent-blue bg-accent-blue"
								: "border-text-muted/50 bg-transparent"
						}`}
					>
						{isSelected && <span className="h-1.5 w-1.5 rounded-full bg-white" />}
					</span>
				) : (
					<StateIndicator state={d.state} />
				)}
				<span className="flex-1 truncate">{d.name}</span>
				<span className="text-xs text-text-muted">
					{d.osVersion}
					{d.deviceType !== "Physical" &&
					d.deviceType !== "Emulator" &&
					d.deviceType !== "Unknown" &&
					(d.id.startsWith("physical:") || d.deviceType !== d.name)
						? ` · ${d.deviceType}`
						: ""}
				</span>
				<StarIcon
					filled={isFavourite(d.id)}
					onClick={(e) => {
						e.stopPropagation();
						toggleFavourite(d.id);
					}}
				/>
				{!isMultiSelect && isSelected && (
					<svg
						className="h-4 w-4 text-accent-blue"
						fill="none"
						viewBox="0 0 24 24"
						stroke="currentColor"
					>
						<title>Selected</title>
						<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
					</svg>
				)}
			</button>
		);
	};

	const hasFavourites = favIos.length > 0 || favAndroid.length > 0;

	return (
		<div ref={ref} className="relative">
			<button
				type="button"
				onClick={() => setOpen(!open)}
				className="glass-button flex items-center gap-2 px-3 py-1.5 text-sm"
			>
				<span>{label}</span>
				<svg
					className={`h-4 w-4 text-text-secondary transition-transform duration-200 ${open ? "rotate-180" : ""}`}
					fill="none"
					viewBox="0 0 24 24"
					stroke="currentColor"
				>
					<title>Toggle device list</title>
					<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
				</svg>
			</button>

			{open && (
				<div
					ref={dropdownRef}
					className="glass-panel absolute top-full right-0 z-50 mt-2 w-72 max-h-96 overflow-y-auto p-1 shadow-xl shadow-black/30 !backdrop-blur-2xl !bg-[rgba(30,30,45,0.6)]"
				>
					{/* Favourites section — always visible */}
					<div>
						<div className="px-3 py-1 text-[10px] font-semibold uppercase tracking-wider text-text-muted">
							Favourites
						</div>
						{hasFavourites ? (
							<>
								{favIos.length > 0 && (
									<>
										<div className="pl-5 px-3 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-text-muted">
											iOS
										</div>
										{favIos.map(renderDeviceRow)}
									</>
								)}
								{favAndroid.length > 0 && (
									<>
										<div className="pl-5 px-3 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-text-muted">
											Android
										</div>
										{favAndroid.map(renderDeviceRow)}
									</>
								)}
							</>
						) : (
							<div className="px-3 py-2 text-text-muted text-xs italic">
								Star devices to pin them here
							</div>
						)}
					</div>

					{/* Standard groups — non-favourite devices only */}
					{Object.entries(rest).map(([group, devs]) => (
						<div key={group}>
							<div className="px-3 py-1 text-[10px] font-semibold uppercase tracking-wider text-text-muted">
								{group}
							</div>
							{devs.map(renderDeviceRow)}
						</div>
					))}

					{devices.length === 0 && (
						<div className="px-3 py-4 text-center text-sm text-text-muted">No devices detected</div>
					)}

					{/* Context menu */}
					{contextMenu && (
						<div
							className="glass-panel absolute p-1 shadow-xl z-[60]"
							style={{ left: contextMenu.x, top: contextMenu.y }}
						>
							<button
								type="button"
								className="flex w-full items-center gap-2 rounded-[var(--radius-button)] px-3 py-1.5 text-left text-sm text-text-primary hover:bg-[rgba(255,255,255,0.08)] whitespace-nowrap"
								onClick={() => {
									toggleFavourite(contextMenu.deviceId);
									setContextMenu(null);
								}}
							>
								{isFavourite(contextMenu.deviceId) ? "Remove from Favourites" : "Add to Favourites"}
							</button>
						</div>
					)}
				</div>
			)}
		</div>
	);
}
