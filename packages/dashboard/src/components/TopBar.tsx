import { useWs } from "../hooks/use-ws";
import DeviceSelector from "./DeviceSelector";

export default function TopBar() {
	const { connected } = useWs();

	return (
		<header className="flex h-14 shrink-0 items-center justify-between border-b border-glass-border bg-glass/80 px-4 backdrop-blur-xl">
			<div className="text-lg font-medium text-accent-blue">simvyn</div>

			<div className="flex items-center gap-4">
				<DeviceSelector />
				<div className="flex items-center gap-2">
					<span
						className={`h-2.5 w-2.5 rounded-full ${connected ? "bg-green-500" : "bg-red-500"}`}
					/>
					<span className="text-xs text-text-muted">
						{connected ? "Connected" : "Disconnected"}
					</span>
				</div>
			</div>
		</header>
	);
}
