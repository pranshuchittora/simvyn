import { useWs } from "../hooks/use-ws";
import DeviceSelector from "./DeviceSelector";

export default function TopBar() {
	const { connected } = useWs();

	return (
		<header className="relative z-30 flex h-12 shrink-0 items-center justify-between border-b border-glass-border/60 bg-[oklch(0.11_0.018_265_/_0.7)] px-4 backdrop-blur-2xl backdrop-saturate-[1.3]">
			<div className="text-base font-semibold tracking-tight bg-gradient-to-r from-accent-blue to-accent-purple bg-clip-text text-transparent">
				simvyn
			</div>

			<div className="flex items-center gap-4">
				<DeviceSelector />
				<div className="flex items-center gap-2">
					<span
						className={`h-2 w-2 rounded-full ${
							connected ? "bg-green-500 ring-2 ring-green-500/20 animate-pulse" : "bg-red-500"
						}`}
						style={connected ? { animationDuration: "2s" } : undefined}
					/>
					<span className="text-xs text-text-muted">
						{connected ? "Connected" : "Disconnected"}
					</span>
				</div>
			</div>
		</header>
	);
}
