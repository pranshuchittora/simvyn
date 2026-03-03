import { Command } from "cmdk";
import { Check } from "lucide-react";
import { useEffect, useState } from "react";
import { useDeviceStore } from "../../stores/device-store";
import type { DeviceSelectStep } from "./types";

interface DevicePickerProps {
	step: DeviceSelectStep;
	search: string;
	onSelect: (deviceIds: string[], deviceNames: string[]) => void;
}

const isMac = typeof navigator !== "undefined" && /Mac|iPod|iPhone|iPad/.test(navigator.platform);

export default function DevicePicker({ step, search, onSelect }: DevicePickerProps) {
	const devices = useDeviceStore((s) => s.devices);
	const base = step.filter
		? devices.filter(step.filter)
		: devices.filter((d) => d.state === "booted");
	const query = search.toLowerCase().trim();
	const filtered = query
		? base.filter(
				(d) =>
					d.name.toLowerCase().includes(query) ||
					d.platform.toLowerCase().includes(query) ||
					(d.osVersion?.toLowerCase().includes(query) ?? false),
			)
		: base;
	const [selected, setSelected] = useState<Set<string>>(new Set());

	function handleSelect(id: string, name: string) {
		if (!step.multi) {
			onSelect([id], [name]);
			return;
		}
		setSelected((prev) => {
			const next = new Set(prev);
			if (next.has(id)) next.delete(id);
			else next.add(id);
			return next;
		});
	}

	function handleApply() {
		const ids = Array.from(selected);
		const names = ids.map((id) => filtered.find((d) => d.id === id)?.name ?? id);
		onSelect(ids, names);
	}

	// Capture phase so we intercept Cmd+Enter before cmdk's onSelect toggles the item
	useEffect(() => {
		if (!step.multi) return;
		function onKeyDown(e: KeyboardEvent) {
			if ((e.metaKey || e.ctrlKey) && e.key === "Enter" && selected.size > 0) {
				e.preventDefault();
				e.stopPropagation();
				handleApply();
			}
		}
		window.addEventListener("keydown", onKeyDown, true);
		return () => window.removeEventListener("keydown", onKeyDown, true);
	});

	if (filtered.length === 0) {
		return (
			<div className="flex items-center justify-center py-8 text-text-muted text-sm">
				No matching devices available
			</div>
		);
	}

	return (
		<>
			{filtered.map((device) => {
				const isSelected = selected.has(device.id);
				return (
					<Command.Item
						key={device.id}
						value={device.name}
						onSelect={() => handleSelect(device.id, device.name)}
					>
						{step.multi && (
							<span
								className={`flex items-center justify-center w-4 h-4 rounded border ${
									isSelected ? "bg-accent-blue border-accent-blue" : "border-glass-border-hover"
								}`}
							>
								{isSelected && <Check size={12} className="text-white" />}
							</span>
						)}
						<div className="cmdk-item-text">
							<span>{device.name}</span>
							<span className="cmdk-item-description">
								{device.platform === "ios" ? "iOS" : "Android"} {device.osVersion}
							</span>
						</div>
					</Command.Item>
				);
			})}
			{step.multi && (
				<div className="flex items-center justify-between px-3 pt-2 pb-1 border-t border-glass-border">
					<span className="text-[10px] text-text-muted">
						{selected.size > 0
							? `${selected.size} selected · ${isMac ? "⌘" : "Ctrl+"}↵ to apply`
							: "Select devices with Enter"}
					</span>
					{selected.size > 0 && (
						<button
							type="button"
							className="glass-button-primary text-xs px-3 py-1.5"
							onClick={handleApply}
						>
							Apply ({selected.size}) <kbd className="cmdk-kbd">{isMac ? "⌘" : "Ctrl+"}↵</kbd>
						</button>
					)}
				</div>
			)}
		</>
	);
}
