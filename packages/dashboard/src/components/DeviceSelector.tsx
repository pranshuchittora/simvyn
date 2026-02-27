import type { Device } from "@simvyn/types";
import { useEffect, useRef, useState } from "react";
import { useDeviceStore } from "../stores/device-store";
import { useModuleStore } from "../stores/module-store";

const MULTI_SELECT_MODULES = new Set(["location"]);

function groupByPlatform(devices: Device[]) {
	const groups: Record<string, Device[]> = {};
	for (const d of devices) {
		const key = d.platform === "ios" ? "iOS" : "Android";
		(groups[key] ??= []).push(d);
	}
	return groups;
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

export default function DeviceSelector() {
	const [open, setOpen] = useState(false);
	const ref = useRef<HTMLDivElement>(null);

	const devices = useDeviceStore((s) => s.devices);
	const selectedDeviceIds = useDeviceStore((s) => s.selectedDeviceIds);
	const selectDevice = useDeviceStore((s) => s.selectDevice);
	const toggleDevice = useDeviceStore((s) => s.toggleDevice);
	const truncateToFirst = useDeviceStore((s) => s.truncateToFirst);

	const activeModule = useModuleStore((s) => s.activeModule);
	const isMultiSelect = MULTI_SELECT_MODULES.has(activeModule ?? "");

	const groups = groupByPlatform(devices);

	useEffect(() => {
		if (!isMultiSelect && selectedDeviceIds.length > 1) {
			truncateToFirst();
		}
	}, [isMultiSelect, selectedDeviceIds.length, truncateToFirst]);

	useEffect(() => {
		function handleClick(e: MouseEvent) {
			if (ref.current && !ref.current.contains(e.target as Node)) {
				setOpen(false);
			}
		}
		document.addEventListener("mousedown", handleClick);
		return () => document.removeEventListener("mousedown", handleClick);
	}, []);

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
				<div className="glass-panel absolute top-full right-0 z-50 mt-2 w-72 overflow-hidden p-1 shadow-xl shadow-black/30 !backdrop-blur-2xl !bg-[rgba(30,30,45,0.6)]">
					{Object.entries(groups).map(([platform, devs]) => (
						<div key={platform}>
							<div className="px-3 py-1 text-[10px] font-semibold uppercase tracking-wider text-text-muted">
								{platform}
							</div>
							{devs.map((d) => {
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
										<span className="text-xs text-text-muted">{d.osVersion}</span>
										{!isMultiSelect && isSelected && (
											<svg
												className="h-4 w-4 text-accent-blue"
												fill="none"
												viewBox="0 0 24 24"
												stroke="currentColor"
											>
												<title>Selected</title>
												<path
													strokeLinecap="round"
													strokeLinejoin="round"
													strokeWidth={2}
													d="M5 13l4 4L19 7"
												/>
											</svg>
										)}
									</button>
								);
							})}
						</div>
					))}

					{devices.length === 0 && (
						<div className="px-3 py-4 text-center text-sm text-text-muted">No devices detected</div>
					)}
				</div>
			)}
		</div>
	);
}
