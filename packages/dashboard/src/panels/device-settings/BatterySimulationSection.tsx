import { Battery } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

const CHARGING_STATUSES = [
	{ value: 1, label: "Unknown" },
	{ value: 2, label: "Charging" },
	{ value: 3, label: "Discharging" },
	{ value: 4, label: "Not Charging" },
	{ value: 5, label: "Full" },
];

async function apiPost(url: string, body: Record<string, unknown>) {
	const res = await fetch(url, {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify(body),
	});
	if (!res.ok) {
		const data = await res.json();
		throw new Error(data.error || "Request failed");
	}
	return res.json();
}

export default function BatterySimulationSection({ deviceId }: { deviceId: string }) {
	const [level, setLevel] = useState(50);
	const [status, setStatus] = useState(2);
	const [ac, setAc] = useState(false);
	const [usb, setUsb] = useState(true);

	const applyBattery = async () => {
		try {
			await apiPost("/api/modules/device-settings/battery/set", {
				deviceId,
				level,
				status,
				ac,
				usb,
			});
			toast.success(`Battery set to ${level}%`);
		} catch (err) {
			toast.error((err as Error).message);
		}
	};

	const unplugBattery = async () => {
		try {
			await apiPost("/api/modules/device-settings/battery/unplug", { deviceId });
			toast.success("Battery unplugged");
		} catch (err) {
			toast.error((err as Error).message);
		}
	};

	const resetBattery = async () => {
		try {
			await apiPost("/api/modules/device-settings/battery/reset", { deviceId });
			toast.success("Battery reset to default");
			setLevel(50);
			setStatus(2);
			setAc(false);
			setUsb(true);
		} catch (err) {
			toast.error((err as Error).message);
		}
	};

	return (
		<div className="rounded-xl bg-bg-surface/10 border-b border-border p-4 space-y-3">
			<h2 className="text-sm font-medium text-text-secondary uppercase tracking-wide flex items-center gap-2">
				<Battery size={14} />
				Battery Simulation
			</h2>

			<div className="space-y-2">
				<div className="flex items-center gap-3">
					<input
						type="range"
						min={0}
						max={100}
						value={level}
						onChange={(e) => setLevel(Number(e.target.value))}
						className="flex-1 accent-[#F97316]"
					/>
					<input
						type="number"
						value={level}
						onChange={(e) => setLevel(Math.max(0, Math.min(100, Number(e.target.value))))}
						className="glass-input w-16 text-xs text-center"
						min={0}
						max={100}
					/>
					<span className="text-xs text-text-tertiary">%</span>
				</div>

				<div className="flex items-center gap-2">
					<span className="text-xs text-text-tertiary">Status:</span>
					<select
						value={status}
						onChange={(e) => setStatus(Number(e.target.value))}
						className="glass-input flex-1 text-xs"
					>
						{CHARGING_STATUSES.map((s) => (
							<option key={s.value} value={s.value}>
								{s.label}
							</option>
						))}
					</select>
				</div>

				<div className="flex items-center gap-4">
					<label className="flex items-center gap-1.5 text-xs text-text-secondary cursor-pointer">
						<input
							type="checkbox"
							checked={ac}
							onChange={(e) => setAc(e.target.checked)}
							className="accent-[#F97316]"
						/>
						AC Power
					</label>
					<label className="flex items-center gap-1.5 text-xs text-text-secondary cursor-pointer">
						<input
							type="checkbox"
							checked={usb}
							onChange={(e) => setUsb(e.target.checked)}
							className="accent-[#F97316]"
						/>
						USB Power
					</label>
				</div>

				<div className="flex items-center gap-2">
					<button type="button" onClick={applyBattery} className="glass-button-primary text-xs">
						Apply
					</button>
					<button type="button" onClick={unplugBattery} className="glass-button text-xs">
						Unplug
					</button>
					<button type="button" onClick={resetBattery} className="glass-button-destructive text-xs">
						Reset
					</button>
				</div>
			</div>
		</div>
	);
}
