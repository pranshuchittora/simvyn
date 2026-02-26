import { useState } from "react";
import type { AppInfo } from "./stores/app-store";

interface AppActionsProps {
	app: AppInfo;
	deviceId: string;
	onRefresh: () => void;
}

export default function AppActions({ app, deviceId, onRefresh }: AppActionsProps) {
	const [loading, setLoading] = useState<string | null>(null);

	async function doAction(action: string, endpoint: string) {
		setLoading(action);
		try {
			const res = await fetch(`/api/modules/apps/${endpoint}`, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ deviceId, bundleId: app.bundleId }),
			});
			if (!res.ok) {
				const data = await res.json().catch(() => ({ error: "Action failed" }));
				console.error(`${action} failed:`, data.error);
			}
			if (action === "uninstall" || action === "clear-data") {
				onRefresh();
			}
		} catch (err) {
			console.error(`${action} failed:`, err);
		} finally {
			setLoading(null);
		}
	}

	const btnBase =
		"rounded-[var(--radius-button)] px-2 py-0.5 text-[11px] font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed";

	return (
		<div className="flex items-center gap-1.5">
			<button
				type="button"
				onClick={() => doAction("launch", "launch")}
				disabled={loading !== null}
				className={`${btnBase} bg-accent-blue/15 text-accent-blue border border-accent-blue/25 hover:bg-accent-blue/25`}
			>
				{loading === "launch" ? "..." : "Launch"}
			</button>
			<button
				type="button"
				onClick={() => doAction("terminate", "terminate")}
				disabled={loading !== null}
				className={`${btnBase} bg-bg-surface text-text-secondary border border-border hover:text-text-primary hover:bg-glass`}
			>
				{loading === "terminate" ? "..." : "Stop"}
			</button>
			<button
				type="button"
				onClick={() => doAction("uninstall", "uninstall")}
				disabled={loading !== null}
				className={`${btnBase} bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20`}
			>
				{loading === "uninstall" ? "..." : "Uninstall"}
			</button>
			{app.type === "user" && (
				<button
					type="button"
					onClick={() => doAction("clear-data", "clear-data")}
					disabled={loading !== null}
					className={`${btnBase} bg-yellow-500/10 text-yellow-400 border border-yellow-500/20 hover:bg-yellow-500/20`}
				>
					{loading === "clear-data" ? "..." : "Clear Data"}
				</button>
			)}
		</div>
	);
}
