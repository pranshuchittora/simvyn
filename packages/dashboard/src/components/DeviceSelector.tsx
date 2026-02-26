import type { Device } from "@simvyn/types";
import { useEffect, useRef, useState } from "react";
import { useDeviceStore } from "../stores/device-store";

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
	const { devices, selectedDeviceId, broadcastMode, selectDevice, toggleBroadcast } =
		useDeviceStore();

	const selected = devices.find((d) => d.id === selectedDeviceId);
	const groups = groupByPlatform(devices);

	useEffect(() => {
		function handleClick(e: MouseEvent) {
			if (ref.current && !ref.current.contains(e.target as Node)) {
				setOpen(false);
			}
		}
		document.addEventListener("mousedown", handleClick);
		return () => document.removeEventListener("mousedown", handleClick);
	}, []);

	const label = broadcastMode ? "All devices" : selected ? selected.name : "No devices";

	return (
		<div ref={ref} className="relative">
			<button
				type="button"
				onClick={() => setOpen(!open)}
				className="glass-button flex items-center gap-2 px-3 py-1.5 text-sm"
				style={{
					boxShadow: "0 2px 12px rgba(0, 0, 0, 0.2), inset 0 0.5px 0 rgba(255, 255, 255, 0.06)",
				}}
			>
				<span>{label}</span>
				<svg
					className={`h-4 w-4 text-text-secondary transition-transform duration-200 ${open ? "rotate-180" : ""}`}
					fill="none"
					viewBox="0 0 24 24"
					stroke="currentColor"
				>
					<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
				</svg>
			</button>

			{open && (
				<div className="glass-panel absolute top-full right-0 z-50 mt-2 w-72 overflow-hidden p-1 shadow-xl shadow-black/30">
					<button
						type="button"
						onClick={() => {
							toggleBroadcast();
							setOpen(false);
						}}
						className={`flex w-full items-center gap-2 rounded-[var(--radius-button)] px-3 py-2 text-left text-sm transition-colors ${
							broadcastMode
								? "bg-accent-blue/20 text-accent-blue"
								: "text-text-secondary hover:bg-[rgba(255,255,255,0.08)]"
						}`}
					>
						<span className="inline-block h-2 w-2 rounded-full bg-accent-purple" />
						All devices (broadcast)
					</button>

					<div className="my-1 border-t border-border" />

					{Object.entries(groups).map(([platform, devs]) => (
						<div key={platform}>
							<div className="px-3 py-1 text-[10px] font-semibold uppercase tracking-wider text-text-muted">
								{platform}
							</div>
							{devs.map((d) => (
								<button
									type="button"
									key={d.id}
									onClick={() => {
										selectDevice(d.id);
										setOpen(false);
									}}
									className={`flex w-full items-center gap-2 rounded-[var(--radius-button)] px-3 py-2 text-left text-sm transition-colors ${
										!broadcastMode && d.id === selectedDeviceId
											? "bg-accent-blue/20 text-accent-blue"
											: "text-text-primary hover:bg-[rgba(255,255,255,0.08)]"
									}`}
								>
									<StateIndicator state={d.state} />
									<span className="flex-1 truncate">{d.name}</span>
									<span className="text-xs text-text-muted">{d.osVersion}</span>
								</button>
							))}
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
