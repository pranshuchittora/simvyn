import { MousePointer } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

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

export default function InputInjectionSection({ deviceId }: { deviceId: string }) {
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
			await apiPost("/api/modules/device-settings/input/tap", { deviceId, x, y });
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
			await apiPost("/api/modules/device-settings/input/swipe", body);
			toast.success("Swipe sent");
		} catch (err) {
			toast.error((err as Error).message);
		}
	};

	const sendText = async () => {
		if (!text.trim()) return;
		try {
			await apiPost("/api/modules/device-settings/input/text", { deviceId, text: text.trim() });
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
			await apiPost("/api/modules/device-settings/input/keyevent", { deviceId, keyCode: kc });
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
