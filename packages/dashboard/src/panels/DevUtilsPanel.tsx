import { Battery, FileDown, Loader2, Monitor, MousePointer, Network } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { useDeviceStore } from "../stores/device-store";
import { registerPanel } from "../stores/panel-registry";

interface Capabilities {
	portForward: boolean;
	displayOverride: boolean;
	batterySimulation: boolean;
	inputInjection: boolean;
	bugReport: boolean;
}

const DEFAULT_CAPS: Capabilities = {
	portForward: false,
	displayOverride: false,
	batterySimulation: false,
	inputInjection: false,
	bugReport: false,
};

interface PortMapping {
	local: string;
	remote: string;
}

interface BugReportEntry {
	filename: string;
	downloadUrl: string;
	size: number;
}

const CHARGING_STATUSES = [
	{ value: 1, label: "Unknown" },
	{ value: 2, label: "Charging" },
	{ value: 3, label: "Discharging" },
	{ value: 4, label: "Not Charging" },
	{ value: 5, label: "Full" },
];

const KEY_PRESETS = [
	{ code: 3, label: "Home" },
	{ code: 4, label: "Back" },
	{ code: 82, label: "Menu" },
	{ code: 26, label: "Power" },
	{ code: 24, label: "Vol Up" },
	{ code: 25, label: "Vol Down" },
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

// --- Port Forwarding Section ---

function PortForwardingSection({ deviceId }: { deviceId: string }) {
	const [activeTab, setActiveTab] = useState<"forward" | "reverse">("forward");
	const [forwards, setForwards] = useState<PortMapping[]>([]);
	const [reverses, setReverses] = useState<PortMapping[]>([]);
	const [fwdLocal, setFwdLocal] = useState("");
	const [fwdRemote, setFwdRemote] = useState("");
	const [revRemote, setRevRemote] = useState("");
	const [revLocal, setRevLocal] = useState("");

	const fetchForwards = async () => {
		try {
			const res = await fetch(`/api/modules/dev-utils/forward/list?deviceId=${deviceId}`);
			if (res.ok) {
				const data = await res.json();
				setForwards(data.forwards ?? []);
			}
		} catch {}
	};

	const fetchReverses = async () => {
		try {
			const res = await fetch(`/api/modules/dev-utils/reverse/list?deviceId=${deviceId}`);
			if (res.ok) {
				const data = await res.json();
				setReverses(data.reverses ?? []);
			}
		} catch {}
	};

	useEffect(() => {
		fetchForwards();
		fetchReverses();
	}, [deviceId]);

	const addForward = async () => {
		if (!fwdLocal.trim() || !fwdRemote.trim()) return;
		try {
			await apiPost("/api/modules/dev-utils/forward/add", {
				deviceId,
				local: fwdLocal.trim(),
				remote: fwdRemote.trim(),
			});
			toast.success("Forward added");
			setFwdLocal("");
			setFwdRemote("");
			fetchForwards();
		} catch (err) {
			toast.error((err as Error).message);
		}
	};

	const removeForward = async (local: string) => {
		try {
			await apiPost("/api/modules/dev-utils/forward/remove", { deviceId, local });
			toast.success("Forward removed");
			fetchForwards();
		} catch (err) {
			toast.error((err as Error).message);
		}
	};

	const addReverse = async () => {
		if (!revRemote.trim() || !revLocal.trim()) return;
		try {
			await apiPost("/api/modules/dev-utils/reverse/add", {
				deviceId,
				remote: revRemote.trim(),
				local: revLocal.trim(),
			});
			toast.success("Reverse forward added");
			setRevRemote("");
			setRevLocal("");
			fetchReverses();
		} catch (err) {
			toast.error((err as Error).message);
		}
	};

	const removeReverse = async (remote: string) => {
		try {
			await apiPost("/api/modules/dev-utils/reverse/remove", { deviceId, remote });
			toast.success("Reverse forward removed");
			fetchReverses();
		} catch (err) {
			toast.error((err as Error).message);
		}
	};

	return (
		<div className="rounded-xl bg-bg-surface/10 border-b border-border p-4 space-y-3">
			<h2 className="text-sm font-medium text-text-secondary uppercase tracking-wide flex items-center gap-2">
				<Network size={14} />
				Port Forwarding
			</h2>

			<div className="glass-tab-bar">
				<button
					type="button"
					onClick={() => setActiveTab("forward")}
					className={`glass-tab ${activeTab === "forward" ? "active" : ""}`}
				>
					Forward
				</button>
				<button
					type="button"
					onClick={() => setActiveTab("reverse")}
					className={`glass-tab ${activeTab === "reverse" ? "active" : ""}`}
				>
					Reverse
				</button>
			</div>

			{activeTab === "forward" && (
				<div className="space-y-2">
					<div className="flex items-center gap-2">
						<input
							type="text"
							value={fwdLocal}
							onChange={(e) => setFwdLocal(e.target.value)}
							placeholder="Local (tcp:8080)"
							className="glass-input flex-1 text-xs"
						/>
						<input
							type="text"
							value={fwdRemote}
							onChange={(e) => setFwdRemote(e.target.value)}
							placeholder="Remote (tcp:3000)"
							className="glass-input flex-1 text-xs"
						/>
						<button
							type="button"
							onClick={addForward}
							disabled={!fwdLocal.trim() || !fwdRemote.trim()}
							className="glass-button-primary text-xs"
						>
							Add
						</button>
					</div>
					{forwards.length > 0 && (
						<table className="glass-table w-full text-xs">
							<thead>
								<tr>
									<th className="text-left p-2">Local</th>
									<th className="text-left p-2">Remote</th>
									<th className="text-right p-2" />
								</tr>
							</thead>
							<tbody>
								{forwards.map((f) => (
									<tr key={`${f.local}-${f.remote}`}>
										<td className="p-2 font-mono">{f.local}</td>
										<td className="p-2 font-mono">{f.remote}</td>
										<td className="p-2 text-right">
											<button
												type="button"
												onClick={() => removeForward(f.local)}
												className="glass-button-destructive text-xs"
											>
												Remove
											</button>
										</td>
									</tr>
								))}
							</tbody>
						</table>
					)}
				</div>
			)}

			{activeTab === "reverse" && (
				<div className="space-y-2">
					<div className="flex items-center gap-2">
						<input
							type="text"
							value={revRemote}
							onChange={(e) => setRevRemote(e.target.value)}
							placeholder="Remote (tcp:8080)"
							className="glass-input flex-1 text-xs"
						/>
						<input
							type="text"
							value={revLocal}
							onChange={(e) => setRevLocal(e.target.value)}
							placeholder="Local (tcp:3000)"
							className="glass-input flex-1 text-xs"
						/>
						<button
							type="button"
							onClick={addReverse}
							disabled={!revRemote.trim() || !revLocal.trim()}
							className="glass-button-primary text-xs"
						>
							Add
						</button>
					</div>
					{reverses.length > 0 && (
						<table className="glass-table w-full text-xs">
							<thead>
								<tr>
									<th className="text-left p-2">Remote</th>
									<th className="text-left p-2">Local</th>
									<th className="text-right p-2" />
								</tr>
							</thead>
							<tbody>
								{reverses.map((r) => (
									<tr key={`${r.remote}-${r.local}`}>
										<td className="p-2 font-mono">{r.remote}</td>
										<td className="p-2 font-mono">{r.local}</td>
										<td className="p-2 text-right">
											<button
												type="button"
												onClick={() => removeReverse(r.remote)}
												className="glass-button-destructive text-xs"
											>
												Remove
											</button>
										</td>
									</tr>
								))}
							</tbody>
						</table>
					)}
				</div>
			)}
		</div>
	);
}

// --- Display Overrides Section ---

function DisplayOverridesSection({ deviceId }: { deviceId: string }) {
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
			await apiPost("/api/modules/dev-utils/display/size", { deviceId, width: w, height: h });
			toast.success(`Display size set to ${w}x${h}`);
		} catch (err) {
			toast.error((err as Error).message);
		}
	};

	const resetSize = async () => {
		try {
			await apiPost("/api/modules/dev-utils/display/size/reset", { deviceId });
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
			await apiPost("/api/modules/dev-utils/display/density", { deviceId, dpi: d });
			toast.success(`Display density set to ${d} DPI`);
		} catch (err) {
			toast.error((err as Error).message);
		}
	};

	const resetDensity = async () => {
		try {
			await apiPost("/api/modules/dev-utils/display/density/reset", { deviceId });
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

// --- Battery Simulation Section ---

function BatterySimulationSection({ deviceId }: { deviceId: string }) {
	const [level, setLevel] = useState(50);
	const [status, setStatus] = useState(2);
	const [ac, setAc] = useState(false);
	const [usb, setUsb] = useState(true);

	const applyBattery = async () => {
		try {
			await apiPost("/api/modules/dev-utils/battery/set", {
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
			await apiPost("/api/modules/dev-utils/battery/unplug", { deviceId });
			toast.success("Battery unplugged");
		} catch (err) {
			toast.error((err as Error).message);
		}
	};

	const resetBattery = async () => {
		try {
			await apiPost("/api/modules/dev-utils/battery/reset", { deviceId });
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
					<label className="text-xs text-text-tertiary">Status:</label>
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

// --- Input Injection Section ---

function InputInjectionSection({ deviceId }: { deviceId: string }) {
	const [mode, setMode] = useState<"tap" | "swipe" | "text" | "key">("tap");
	const [tapX, setTapX] = useState("");
	const [tapY, setTapY] = useState("");
	const [swipeX1, setSwipeX1] = useState("");
	const [swipeY1, setSwipeY1] = useState("");
	const [swipeX2, setSwipeX2] = useState("");
	const [swipeY2, setSwipeY2] = useState("");
	const [swipeDuration, setSwipeDuration] = useState("");
	const [text, setText] = useState("");
	const [keyCode, setKeyCode] = useState("");

	const sendTap = async () => {
		const x = Number(tapX);
		const y = Number(tapY);
		if (isNaN(x) || isNaN(y)) return;
		try {
			await apiPost("/api/modules/dev-utils/input/tap", { deviceId, x, y });
			toast.success(`Tap sent at (${x}, ${y})`);
		} catch (err) {
			toast.error((err as Error).message);
		}
	};

	const sendSwipe = async () => {
		const x1 = Number(swipeX1);
		const y1 = Number(swipeY1);
		const x2 = Number(swipeX2);
		const y2 = Number(swipeY2);
		if ([x1, y1, x2, y2].some(isNaN)) return;
		const body: Record<string, unknown> = { deviceId, x1, y1, x2, y2 };
		if (swipeDuration.trim()) body.durationMs = Number(swipeDuration);
		try {
			await apiPost("/api/modules/dev-utils/input/swipe", body);
			toast.success("Swipe sent");
		} catch (err) {
			toast.error((err as Error).message);
		}
	};

	const sendText = async () => {
		if (!text.trim()) return;
		try {
			await apiPost("/api/modules/dev-utils/input/text", { deviceId, text: text.trim() });
			toast.success("Text sent");
			setText("");
		} catch (err) {
			toast.error((err as Error).message);
		}
	};

	const sendKey = async (code?: number) => {
		const kc = code ?? Number(keyCode);
		if (isNaN(kc)) return;
		try {
			await apiPost("/api/modules/dev-utils/input/keyevent", { deviceId, keyCode: kc });
			toast.success(`Key event ${kc} sent`);
		} catch (err) {
			toast.error((err as Error).message);
		}
	};

	return (
		<div className="rounded-xl bg-bg-surface/10 border-b border-border p-4 space-y-3">
			<h2 className="text-sm font-medium text-text-secondary uppercase tracking-wide flex items-center gap-2">
				<MousePointer size={14} />
				Input Injection
			</h2>

			<div className="glass-tab-bar">
				{(["tap", "swipe", "text", "key"] as const).map((m) => (
					<button
						key={m}
						type="button"
						onClick={() => setMode(m)}
						className={`glass-tab ${mode === m ? "active" : ""}`}
					>
						{m === "key" ? "Key Event" : m.charAt(0).toUpperCase() + m.slice(1)}
					</button>
				))}
			</div>

			{mode === "tap" && (
				<div className="flex items-center gap-2">
					<input
						type="number"
						value={tapX}
						onChange={(e) => setTapX(e.target.value)}
						placeholder="X"
						className="glass-input flex-1 text-xs"
					/>
					<input
						type="number"
						value={tapY}
						onChange={(e) => setTapY(e.target.value)}
						placeholder="Y"
						className="glass-input flex-1 text-xs"
					/>
					<button
						type="button"
						onClick={sendTap}
						disabled={!tapX || !tapY}
						className="glass-button-primary text-xs"
					>
						Tap
					</button>
				</div>
			)}

			{mode === "swipe" && (
				<div className="space-y-2">
					<div className="flex items-center gap-2">
						<input
							type="number"
							value={swipeX1}
							onChange={(e) => setSwipeX1(e.target.value)}
							placeholder="X1"
							className="glass-input flex-1 text-xs"
						/>
						<input
							type="number"
							value={swipeY1}
							onChange={(e) => setSwipeY1(e.target.value)}
							placeholder="Y1"
							className="glass-input flex-1 text-xs"
						/>
						<span className="text-text-tertiary text-xs">to</span>
						<input
							type="number"
							value={swipeX2}
							onChange={(e) => setSwipeX2(e.target.value)}
							placeholder="X2"
							className="glass-input flex-1 text-xs"
						/>
						<input
							type="number"
							value={swipeY2}
							onChange={(e) => setSwipeY2(e.target.value)}
							placeholder="Y2"
							className="glass-input flex-1 text-xs"
						/>
					</div>
					<div className="flex items-center gap-2">
						<input
							type="number"
							value={swipeDuration}
							onChange={(e) => setSwipeDuration(e.target.value)}
							placeholder="Duration (ms, optional)"
							className="glass-input flex-1 text-xs"
						/>
						<button
							type="button"
							onClick={sendSwipe}
							disabled={!swipeX1 || !swipeY1 || !swipeX2 || !swipeY2}
							className="glass-button-primary text-xs"
						>
							Swipe
						</button>
					</div>
				</div>
			)}

			{mode === "text" && (
				<div className="flex items-center gap-2">
					<input
						type="text"
						value={text}
						onChange={(e) => setText(e.target.value)}
						placeholder="Text to type..."
						className="glass-input flex-1 text-xs"
						onKeyDown={(e) => {
							if (e.key === "Enter") sendText();
						}}
					/>
					<button
						type="button"
						onClick={sendText}
						disabled={!text.trim()}
						className="glass-button-primary text-xs"
					>
						Send Text
					</button>
				</div>
			)}

			{mode === "key" && (
				<div className="space-y-2">
					<div className="flex items-center gap-2">
						<input
							type="number"
							value={keyCode}
							onChange={(e) => setKeyCode(e.target.value)}
							placeholder="Key code"
							className="glass-input flex-1 text-xs"
						/>
						<button
							type="button"
							onClick={() => sendKey()}
							disabled={!keyCode}
							className="glass-button-primary text-xs"
						>
							Send Key
						</button>
					</div>
					<div className="flex flex-wrap gap-1.5">
						{KEY_PRESETS.map((k) => (
							<button
								key={k.code}
								type="button"
								onClick={() => sendKey(k.code)}
								className="glass-button text-xs"
							>
								{k.label} ({k.code})
							</button>
						))}
					</div>
				</div>
			)}
		</div>
	);
}

// --- Bug Reports Section ---

function BugReportsSection({ deviceId }: { deviceId: string }) {
	const [collecting, setCollecting] = useState(false);
	const [reports, setReports] = useState<BugReportEntry[]>([]);

	const collect = async () => {
		setCollecting(true);
		try {
			const data = await apiPost("/api/modules/dev-utils/bugreport/collect", { deviceId });
			const entry: BugReportEntry = {
				filename: data.filename,
				downloadUrl: data.downloadUrl,
				size: data.size,
			};
			setReports((prev) => [entry, ...prev]);
			toast.success(`Bug report collected: ${entry.filename}`);
		} catch (err) {
			toast.error((err as Error).message);
		} finally {
			setCollecting(false);
		}
	};

	const formatSize = (bytes: number) => {
		if (bytes < 1024) return `${bytes} B`;
		if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
		return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
	};

	return (
		<div className="rounded-xl bg-bg-surface/10 border-b border-border p-4 space-y-3">
			<h2 className="text-sm font-medium text-text-secondary uppercase tracking-wide flex items-center gap-2">
				<FileDown size={14} />
				Bug Reports
			</h2>

			<button
				type="button"
				onClick={collect}
				disabled={collecting}
				className="glass-button-primary text-xs flex items-center gap-2"
			>
				{collecting && <Loader2 size={12} className="animate-spin" />}
				{collecting ? "Collecting... this may take several minutes" : "Collect Bug Report"}
			</button>

			{reports.length > 0 && (
				<div className="space-y-2">
					{reports.map((r) => (
						<div
							key={r.filename}
							className="flex items-center justify-between p-2 rounded-lg bg-bg-surface/5 border border-border/50"
						>
							<div className="text-xs">
								<p className="text-text-primary font-mono">{r.filename}</p>
								<p className="text-text-tertiary">{formatSize(r.size)}</p>
							</div>
							<a href={r.downloadUrl} download className="glass-button-primary text-xs">
								Download
							</a>
						</div>
					))}
				</div>
			)}
		</div>
	);
}

// --- Main Panel ---

function DevUtilsPanel() {
	const selectedDeviceId = useDeviceStore((s) => s.selectedDeviceIds[0] ?? null);
	const [capabilities, setCapabilities] = useState<Capabilities>(DEFAULT_CAPS);

	useEffect(() => {
		if (!selectedDeviceId) {
			setCapabilities(DEFAULT_CAPS);
			return;
		}
		fetch(`/api/modules/dev-utils/capabilities?deviceId=${selectedDeviceId}`)
			.then((r) => r.json())
			.then((data) => setCapabilities(data as Capabilities))
			.catch(() => setCapabilities(DEFAULT_CAPS));
	}, [selectedDeviceId]);

	return (
		<div className="p-6 space-y-4">
			<div className="flex items-center justify-between">
				<h1 className="text-base font-medium text-text-primary">Developer Utilities</h1>
			</div>

			{!selectedDeviceId && (
				<div className="glass-empty-state">
					<p>Select a booted device to use developer utilities</p>
				</div>
			)}

			{selectedDeviceId && (
				<div className="space-y-4">
					{capabilities.portForward && <PortForwardingSection deviceId={selectedDeviceId} />}
					{capabilities.displayOverride && <DisplayOverridesSection deviceId={selectedDeviceId} />}
					{capabilities.batterySimulation && (
						<BatterySimulationSection deviceId={selectedDeviceId} />
					)}
					{capabilities.inputInjection && <InputInjectionSection deviceId={selectedDeviceId} />}
					{capabilities.bugReport && <BugReportsSection deviceId={selectedDeviceId} />}
				</div>
			)}
		</div>
	);
}

registerPanel("dev-utils", DevUtilsPanel);

export default DevUtilsPanel;
