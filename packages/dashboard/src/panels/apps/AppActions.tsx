import { useState } from "react";
import { toast } from "sonner";
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
				toast.error(data.error || "Action failed");
			}
			if (action === "uninstall" || action === "clear-data") {
				onRefresh();
			}
		} catch {
			toast.error("Action failed");
		} finally {
			setLoading(null);
		}
	}

	return (
		<div className="flex items-center gap-1.5">
			<button
				type="button"
				onClick={() => doAction("launch", "launch")}
				disabled={loading !== null}
				className="glass-button-primary"
			>
				{loading === "launch" ? "..." : "Launch"}
			</button>
			<button
				type="button"
				onClick={() => doAction("terminate", "terminate")}
				disabled={loading !== null}
				className="glass-button"
			>
				{loading === "terminate" ? "..." : "Stop"}
			</button>
			<button
				type="button"
				onClick={() => doAction("uninstall", "uninstall")}
				disabled={loading !== null}
				className="glass-button-destructive"
			>
				{loading === "uninstall" ? "..." : "Uninstall"}
			</button>
			<button
				type="button"
				onClick={() => doAction("clear-data", "clear-data")}
				disabled={loading !== null}
				className="glass-button-destructive"
			>
				{loading === "clear-data" ? "..." : "Clear Data"}
			</button>
		</div>
	);
}
