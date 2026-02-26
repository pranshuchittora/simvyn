import { useMemo } from "react";

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

	return (
		<div className="absolute inset-0 flex items-center justify-center select-none">
			<div className="flex flex-col items-center gap-8 max-w-lg px-6">
				<img
					src="/icon-192.png"
					alt="simvyn"
					className="w-32 h-32 rounded-3xl opacity-25"
					draggable={false}
				/>

				<h1 className="text-2xl font-semibold text-text-muted tracking-wide">simvyn</h1>

				<p className="text-sm text-text-muted/50 text-center leading-relaxed">{tip}</p>

				<div className="flex items-center gap-1.5 text-xs text-text-muted/35">
					<kbd className="px-2 py-1 rounded-md bg-bg-surface/30 border border-white/5 font-mono">
						{modKey}
					</kbd>
					<kbd className="px-2 py-1 rounded-md bg-bg-surface/30 border border-white/5 font-mono">
						K
					</kbd>
					<span className="ml-1.5">to search</span>
				</div>
			</div>
		</div>
	);
}
