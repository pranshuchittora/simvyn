import { Search } from "lucide-react";
import { useNavigate } from "react-router";
import { useWs } from "../hooks/use-ws";
import { useCommandPaletteStore } from "./CommandPalette";
import DeviceSelector from "./DeviceSelector";

function isMac() {
	return navigator.platform.toUpperCase().includes("MAC");
}

export default function TopBar() {
	const { connected } = useWs();
	const toggle = useCommandPaletteStore((s) => s.toggle);
	const navigate = useNavigate();

	return (
		<header className="top-bar relative z-30 flex h-12 shrink-0 items-center justify-between px-4">
			<button
				type="button"
				onClick={() => navigate("/")}
				className="flex items-center gap-2 hover:opacity-80 transition-opacity cursor-pointer bg-transparent border-none p-0"
			>
				<img src="/icon-512.png" alt="" className="w-6 h-6 rounded-md" draggable={false} />
				<span className="text-base font-semibold tracking-tight bg-gradient-to-r from-accent-blue to-accent-purple bg-clip-text text-transparent">
					simvyn
				</span>
			</button>

			<div className="flex items-center gap-4">
				<button type="button" onClick={toggle} className="cmdk-hint">
					<Search size={13} />
					<span>{isMac() ? "\u2318K" : "Ctrl+K"}</span>
				</button>
				<DeviceSelector />
				<div className="flex items-center gap-2">
					<span
						className={`h-2 w-2 rounded-full ${
							connected
								? "bg-green-500 ring-2 ring-green-500/20 animate-pulse [animation-duration:2s]"
								: "bg-red-500"
						}`}
					/>
					<span className="text-xs text-text-muted">
						{connected ? "Connected" : "Disconnected"}
					</span>
				</div>
			</div>
		</header>
	);
}
