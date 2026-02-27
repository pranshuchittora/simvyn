import { Network } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

interface PortMapping {
	local: string;
	remote: string;
}

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

export default function PortForwardingSection({ deviceId }: { deviceId: string }) {
	const [activeTab, setActiveTab] = useState<"forward" | "reverse">("forward");
	const [forwards, setForwards] = useState<PortMapping[]>([]);
	const [reverses, setReverses] = useState<PortMapping[]>([]);
	const [fwdLocal, setFwdLocal] = useState("");
	const [fwdRemote, setFwdRemote] = useState("");
	const [revRemote, setRevRemote] = useState("");
	const [revLocal, setRevLocal] = useState("");

	const fetchForwards = async () => {
		try {
			const res = await fetch(`/api/modules/device-settings/forward/list?deviceId=${deviceId}`);
			if (res.ok) {
				const data = await res.json();
				setForwards(data.forwards ?? []);
			}
		} catch {}
	};

	const fetchReverses = async () => {
		try {
			const res = await fetch(`/api/modules/device-settings/reverse/list?deviceId=${deviceId}`);
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
			await apiPost("/api/modules/device-settings/forward/add", {
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
			await apiPost("/api/modules/device-settings/forward/remove", { deviceId, local });
			toast.success("Forward removed");
			fetchForwards();
		} catch (err) {
			toast.error((err as Error).message);
		}
	};

	const addReverse = async () => {
		if (!revRemote.trim() || !revLocal.trim()) return;
		try {
			await apiPost("/api/modules/device-settings/reverse/add", {
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
			await apiPost("/api/modules/device-settings/reverse/remove", { deviceId, remote });
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
