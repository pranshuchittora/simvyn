import { Monitor } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

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

export default function DisplayOverridesSection({ deviceId }: { deviceId: string }) {
	const [width, setWidth] = useState("");
	const [height, setHeight] = useState("");
	const [dpi, setDpi] = useState("");

	const setSize = async () => {
		const w = parseInt(width, 10);
		const h = parseInt(height, 10);
		if (!w || !h || w <= 0 || h <= 0) {
			toast.error("Width and height must be positive integers");
			return;
		}
		try {
			await apiPost("/api/modules/device-settings/display/size", { deviceId, width: w, height: h });
			toast.success(`Display size set to ${w}x${h}`);
		} catch (err) {
			toast.error((err as Error).message);
		}
	};

	const resetSize = async () => {
		try {
			await apiPost("/api/modules/device-settings/display/size/reset", { deviceId });
			toast.success("Display size reset");
			setWidth("");
			setHeight("");
		} catch (err) {
			toast.error((err as Error).message);
		}
	};

	const setDensity = async () => {
		const d = parseInt(dpi, 10);
		if (!d || d <= 0) {
			toast.error("DPI must be a positive integer");
			return;
		}
		try {
			await apiPost("/api/modules/device-settings/display/density", { deviceId, dpi: d });
			toast.success(`Display density set to ${d} DPI`);
		} catch (err) {
			toast.error((err as Error).message);
		}
	};

	const resetDensity = async () => {
		try {
			await apiPost("/api/modules/device-settings/display/density/reset", { deviceId });
			toast.success("Display density reset");
			setDpi("");
		} catch (err) {
			toast.error((err as Error).message);
		}
	};

	return (
		<div className="rounded-xl bg-bg-surface/10 border-b border-border p-4 space-y-3">
			<h2 className="text-sm font-medium text-text-secondary uppercase tracking-wide flex items-center gap-2">
				<Monitor size={14} />
				Display Overrides
			</h2>

			<div className="space-y-2">
				<p className="text-xs text-text-tertiary">Resolution</p>
				<div className="flex items-center gap-2">
					<input
						type="number"
						value={width}
						onChange={(e) => setWidth(e.target.value)}
						placeholder="Width"
						className="glass-input flex-1 text-xs"
						min={1}
					/>
					<span className="text-text-tertiary text-xs">x</span>
					<input
						type="number"
						value={height}
						onChange={(e) => setHeight(e.target.value)}
						placeholder="Height"
						className="glass-input flex-1 text-xs"
						min={1}
					/>
					<button
						type="button"
						onClick={setSize}
						disabled={!width || !height}
						className="glass-button-primary text-xs"
					>
						Set Size
					</button>
					<button type="button" onClick={resetSize} className="glass-button text-xs">
						Reset
					</button>
				</div>
			</div>

			<div className="space-y-2">
				<p className="text-xs text-text-tertiary">Density</p>
				<div className="flex items-center gap-2">
					<input
						type="number"
						value={dpi}
						onChange={(e) => setDpi(e.target.value)}
						placeholder="DPI"
						className="glass-input flex-1 text-xs"
						min={1}
					/>
					<button
						type="button"
						onClick={setDensity}
						disabled={!dpi}
						className="glass-button-primary text-xs"
					>
						Set Density
					</button>
					<button type="button" onClick={resetDensity} className="glass-button text-xs">
						Reset
					</button>
				</div>
			</div>
		</div>
	);
}
