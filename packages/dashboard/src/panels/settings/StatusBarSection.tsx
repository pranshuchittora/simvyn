import { RotateCcw, Send } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

interface Props {
	deviceId: string;
}

const BATTERY_STATES = ["charged", "charging", "discharging"] as const;
const CELLULAR_BARS = ["0", "1", "2", "3", "4"] as const;
const WIFI_BARS = ["0", "1", "2", "3"] as const;
const DATA_NETWORKS = ["wifi", "3g", "4g", "lte", "lte-a", "lte+", "5g", "5g+", "5g-uwb"] as const;

export default function StatusBarSection({ deviceId }: Props) {
	const [time, setTime] = useState("");
	const [batteryLevel, setBatteryLevel] = useState(100);
	const [batteryState, setBatteryState] = useState("");
	const [cellularBars, setCellularBars] = useState("");
	const [wifiBars, setWifiBars] = useState("");
	const [operatorName, setOperatorName] = useState("");
	const [dataNetwork, setDataNetwork] = useState("");

	const handleApply = async () => {
		const overrides: Record<string, string> = {};
		if (time.trim()) overrides.time = time.trim();
		if (batteryState) overrides.batteryState = batteryState;
		if (cellularBars) overrides.cellularBars = cellularBars;
		if (wifiBars) overrides.wifiBars = wifiBars;
		if (operatorName.trim()) overrides.operatorName = operatorName.trim();
		if (dataNetwork) overrides.dataNetwork = dataNetwork;
		overrides.batteryLevel = String(batteryLevel);

		if (Object.keys(overrides).length === 1 && "batteryLevel" in overrides) {
			toast.error("Set at least one override");
			return;
		}

		try {
			const res = await fetch("/api/modules/device-settings/status-bar", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ deviceId, overrides }),
			});
			if (!res.ok) {
				const data = await res.json();
				throw new Error(data.error || "Failed to apply overrides");
			}
			toast.success("Status bar overrides applied");
		} catch (err) {
			toast.error((err as Error).message);
		}
	};

	const handleClear = async () => {
		try {
			const res = await fetch("/api/modules/device-settings/status-bar/clear", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ deviceId }),
			});
			if (!res.ok) {
				const data = await res.json();
				throw new Error(data.error || "Failed to clear overrides");
			}
			setTime("");
			setBatteryLevel(100);
			setBatteryState("");
			setCellularBars("");
			setWifiBars("");
			setOperatorName("");
			setDataNetwork("");
			toast.success("Status bar overrides cleared");
		} catch (err) {
			toast.error((err as Error).message);
		}
	};

	return (
		<div className="rounded-xl bg-bg-surface/10 border-b border-border p-4 space-y-3">
			<div className="flex items-center gap-2">
				<h2 className="text-sm font-medium text-text-secondary uppercase tracking-wide">
					Status Bar
				</h2>
				<span className="glass-badge bg-accent-blue/15 text-accent-blue border-accent-blue/30">
					iOS only
				</span>
			</div>

			<div className="grid grid-cols-2 gap-3">
				<div className="space-y-1">
					<label className="text-[10px] text-text-muted">Time</label>
					<input
						type="text"
						value={time}
						onChange={(e) => setTime(e.target.value)}
						placeholder="9:41"
						className="glass-input w-full text-xs"
					/>
				</div>

				<div className="space-y-1">
					<label className="text-[10px] text-text-muted">Battery Level: {batteryLevel}%</label>
					<input
						type="range"
						min={0}
						max={100}
						value={batteryLevel}
						onChange={(e) => setBatteryLevel(Number(e.target.value))}
						className="w-full accent-accent-blue h-1.5"
					/>
				</div>

				<div className="space-y-1">
					<label className="text-[10px] text-text-muted">Battery State</label>
					<select
						value={batteryState}
						onChange={(e) => setBatteryState(e.target.value)}
						className="glass-select w-full"
					>
						<option value="">Default</option>
						{BATTERY_STATES.map((s) => (
							<option key={s} value={s}>
								{s}
							</option>
						))}
					</select>
				</div>

				<div className="space-y-1">
					<label className="text-[10px] text-text-muted">Cellular Bars</label>
					<select
						value={cellularBars}
						onChange={(e) => setCellularBars(e.target.value)}
						className="glass-select w-full"
					>
						<option value="">Default</option>
						{CELLULAR_BARS.map((b) => (
							<option key={b} value={b}>
								{b}
							</option>
						))}
					</select>
				</div>

				<div className="space-y-1">
					<label className="text-[10px] text-text-muted">WiFi Bars</label>
					<select
						value={wifiBars}
						onChange={(e) => setWifiBars(e.target.value)}
						className="glass-select w-full"
					>
						<option value="">Default</option>
						{WIFI_BARS.map((b) => (
							<option key={b} value={b}>
								{b}
							</option>
						))}
					</select>
				</div>

				<div className="space-y-1">
					<label className="text-[10px] text-text-muted">Operator Name</label>
					<input
						type="text"
						value={operatorName}
						onChange={(e) => setOperatorName(e.target.value)}
						placeholder="Carrier"
						className="glass-input w-full text-xs"
					/>
				</div>

				<div className="space-y-1 col-span-2">
					<label className="text-[10px] text-text-muted">Data Network</label>
					<select
						value={dataNetwork}
						onChange={(e) => setDataNetwork(e.target.value)}
						className="glass-select w-full"
					>
						<option value="">Default</option>
						{DATA_NETWORKS.map((n) => (
							<option key={n} value={n}>
								{n.toUpperCase()}
							</option>
						))}
					</select>
				</div>
			</div>

			<div className="flex items-center gap-2 pt-1">
				<button
					type="button"
					onClick={handleApply}
					className="glass-button-primary flex items-center gap-1.5"
				>
					<Send size={12} strokeWidth={1.8} />
					Apply Overrides
				</button>
				<button
					type="button"
					onClick={handleClear}
					className="glass-button-destructive flex items-center gap-1.5"
				>
					<RotateCcw size={12} strokeWidth={1.8} />
					Clear
				</button>
			</div>
		</div>
	);
}
