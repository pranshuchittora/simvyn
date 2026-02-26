import { useMemo } from "react";
import { useDeviceStore } from "../stores/device-store";

const tips = [
	"Press Cmd+K to search modules and run device actions",
	"Select a device from the top bar, then pick a module from the sidebar",
	"Take a screenshot instantly — open the command palette and type 'screenshot'",
	"Toggle dark mode on any device right from the command palette",
	"Stream real-time logs with level filtering in the Logs module",
	"Drag and drop an IPA or APK into the Apps module to install it",
	"Set GPS coordinates on multiple simulators at once with the Location module",
	"Browse app sandboxes and edit files in-place with the File System module",
	"Inspect SQLite databases and run queries in the Database module",
	"Import GPX routes and play them back with speed controls",
	"Send test push notifications to iOS simulators with custom JSON payloads",
	"Copy text between your clipboard and any device's clipboard",
	"Use keyboard arrows in the command palette to navigate, Enter to select",
];

const isMac = typeof navigator !== "undefined" && /Mac/.test(navigator.userAgent);
const modKey = isMac ? "\u2318" : "Ctrl";

export default function HomeScreen() {
	const tip = useMemo(() => tips[Math.floor(Math.random() * tips.length)], []);
	const allDevices = useDeviceStore((s) => s.devices);
	const devices = useMemo(() => allDevices.filter((d) => d.state === "booted"), [allDevices]);

	return (
		<div className="absolute inset-0 flex flex-col select-none">
			<div className="flex-1 flex items-center justify-center">
				<div className="flex flex-col items-center gap-10 max-w-xl px-8">
					<img
						src="/icon-1024.png"
						alt="simvyn"
						className="w-48 h-48 rounded-[2rem]"
						draggable={false}
					/>

					<h1
						className="text-4xl font-semibold text-text-primary tracking-wide"
						style={{ fontFamily: "var(--font-brand)" }}
					>
						simvyn
					</h1>

					<p className="text-base text-text-secondary text-center leading-relaxed">{tip}</p>

					<div className="flex items-center gap-2 text-sm text-text-secondary">
						<kbd className="px-2.5 py-1 rounded-md bg-bg-surface/60 border border-white/15 font-mono">
							{modKey}
						</kbd>
						<kbd className="px-2.5 py-1 rounded-md bg-bg-surface/60 border border-white/15 font-mono">
							K
						</kbd>
						<span className="ml-2">to search</span>
					</div>
				</div>
			</div>

			{devices.length > 0 && (
				<div className="flex flex-wrap items-center justify-center gap-2 px-8 pb-6">
					{devices.map((d) => (
						<div
							key={d.id}
							className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-bg-surface/40 border border-white/8 text-sm"
						>
							<span
								className="w-2 h-2 rounded-full shrink-0"
								style={{
									backgroundColor: d.state === "booted" ? "#4ade80" : "#6b7280",
								}}
							/>
							<span className="text-text-primary">{d.name}</span>
							<span className="text-text-muted text-xs">
								{d.platform === "ios" ? "iOS" : "Android"}
							</span>
						</div>
					))}
				</div>
			)}
		</div>
	);
}
