import { Command } from "cmdk";
import { Check } from "lucide-react";
import { useState } from "react";
import { useDeviceStore } from "../../stores/device-store";
import type { DeviceSelectStep } from "./types";

interface DevicePickerProps {
	step: DeviceSelectStep;
	onSelect: (deviceIds: string[], deviceNames: string[]) => void;
}

export default function DevicePicker({ step, onSelect }: DevicePickerProps) {
	const devices = useDeviceStore((s) => s.devices);
	const booted = devices.filter((d) => d.state === "booted");
	const filtered = step.filter ? booted.filter(step.filter) : booted;
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
			{step.multi && selected.size > 0 && (
				<div className="flex justify-end px-2 pt-2 pb-1 border-t border-glass-border">
					<button
						type="button"
						className="glass-button-primary text-xs px-3 py-1.5"
						onClick={handleApply}
					>
						Apply ({selected.size})
					</button>
				</div>
			)}
		</>
	);
}
