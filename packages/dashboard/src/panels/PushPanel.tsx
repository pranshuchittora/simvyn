import { ChevronDown, ChevronUp, Send, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { useDeviceStore } from "../stores/device-store";
import { registerPanel } from "../stores/panel-registry";
import { usePushStore } from "./push/stores/push-store";

function PushPanel() {
	const selectedDeviceId = useDeviceStore((s) => s.selectedDeviceIds[0] ?? null);
	const selectedDevice = useDeviceStore((s) =>
		s.devices.find((d) => d.id === s.selectedDeviceIds[0]),
	);
	const [bundleId, setBundleId] = useState("");
	const [payloadText, setPayloadText] = useState(
		'{\n  "aps": {\n    "alert": {\n      "title": "Test",\n      "body": "Hello from Simvyn"\n    },\n    "sound": "default"\n  }\n}',
	);
	const [jsonValid, setJsonValid] = useState(true);
	const [showHistory, setShowHistory] = useState(false);
	const [saveName, setSaveName] = useState("");
	const [showSaveForm, setShowSaveForm] = useState(false);

	const {
		templates,
		savedPayloads,
		history,
		loading,
		sendPush,
		fetchTemplates,
		fetchPayloads,
		deletePayload,
		savePayload,
		fetchHistory,
	} = usePushStore();

	const isAndroid = selectedDevice?.platform === "android";

	useEffect(() => {
		fetchTemplates();
		fetchPayloads();
		fetchHistory();
	}, [fetchTemplates, fetchPayloads, fetchHistory]);

	useEffect(() => {
		try {
			JSON.parse(payloadText);
			setJsonValid(true);
		} catch {
			setJsonValid(false);
		}
	}, [payloadText]);

	const handleSend = () => {
		if (!selectedDeviceId || !bundleId.trim() || !jsonValid) return;
		try {
			const payload = JSON.parse(payloadText);
			sendPush(selectedDeviceId, bundleId.trim(), payload);
		} catch {
			// jsonValid already handles this
		}
	};

	const handleSavePayload = () => {
		if (!saveName.trim() || !jsonValid) return;
		try {
			const payload = JSON.parse(payloadText);
			savePayload(saveName.trim(), bundleId.trim() || undefined, payload);
			setSaveName("");
			setShowSaveForm(false);
		} catch {
			// ignore
		}
	};

	return (
		<div className="p-6 space-y-4">
			{/* Header */}
			<div className="flex items-center justify-between">
				<div className="flex items-center gap-2">
					<h1 className="text-base font-medium text-text-primary">Push Notifications</h1>
					{isAndroid && (
						<span
							className="glass-badge"
							style={{ color: "var(--color-accent-blue)", borderColor: "rgba(0, 122, 255, 0.3)" }}
						>
							iOS only
						</span>
					)}
				</div>
			</div>

			{/* No device */}
			{!selectedDeviceId && (
				<div className="glass-panel">
					<p className="glass-empty-state">Select a booted device to send push notifications</p>
				</div>
			)}

			{selectedDeviceId && (
				<>
					{/* Send form */}
					<div className="space-y-3">
						<input
							type="text"
							value={bundleId}
							onChange={(e) => setBundleId(e.target.value)}
							placeholder="Bundle ID (e.g. com.example.app)"
							className="glass-input w-full"
						/>
						<textarea
							value={payloadText}
							onChange={(e) => setPayloadText(e.target.value)}
							className={`glass-textarea min-h-[200px] resize-y ${
								!jsonValid ? "border border-red-500/50" : ""
							}`}
							spellCheck={false}
						/>
						{!jsonValid && <p className="text-[10px] text-red-400">Invalid JSON</p>}
						<div className="flex items-center gap-2">
							<button
								type="button"
								onClick={handleSend}
								disabled={!bundleId.trim() || !jsonValid}
								className="glass-button-primary flex items-center gap-2"
							>
								<Send size={14} strokeWidth={1.8} />
								Send
							</button>
							<button
								type="button"
								onClick={() => setShowSaveForm(!showSaveForm)}
								className="glass-button"
							>
								Save Current
							</button>
						</div>
						{showSaveForm && (
							<div className="flex items-center gap-2">
								<input
									type="text"
									value={saveName}
									onChange={(e) => setSaveName(e.target.value)}
									placeholder="Payload name"
									className="glass-input flex-1 text-xs"
								/>
								<button
									type="button"
									onClick={handleSavePayload}
									disabled={!saveName.trim() || !jsonValid}
									className="glass-button-primary"
								>
									Save
								</button>
							</div>
						)}
					</div>

					{/* Templates */}
					{templates.length > 0 && (
						<div className="space-y-2">
							<h2 className="text-sm font-medium text-text-secondary">Templates</h2>
							<div className="flex flex-wrap gap-2">
								{templates.map((t) => (
									<button
										key={t.id}
										type="button"
										onClick={() => setPayloadText(JSON.stringify(t.payload, null, 2))}
										className="glass-panel px-3 py-2 text-left hover:bg-glass-hover transition-colors"
									>
										<p className="text-xs text-text-primary">{t.name}</p>
										<p className="text-[10px] text-text-muted">{t.description}</p>
									</button>
								))}
							</div>
						</div>
					)}

					{/* Saved payloads */}
					<div className="space-y-2">
						<h2 className="text-sm font-medium text-text-secondary">Saved Payloads</h2>
						{savedPayloads.length === 0 && (
							<div className="glass-panel">
								<p className="glass-empty-state">No saved payloads — use "Save Current" above</p>
							</div>
						)}
						{savedPayloads.length > 0 && (
							<div className="space-y-1.5">
								{savedPayloads.map((sp) => (
									<div
										key={sp.id}
										className="glass-panel px-3 py-2 flex items-center justify-between group"
									>
										<button
											type="button"
											onClick={() => {
												setPayloadText(JSON.stringify(sp.payload, null, 2));
												if (sp.bundleId) setBundleId(sp.bundleId);
											}}
											className="flex-1 text-left min-w-0"
										>
											<div className="flex items-center gap-2">
												<span className="text-sm text-text-primary">{sp.name}</span>
												{sp.bundleId && (
													<span className="shrink-0 rounded bg-bg-surface/80 px-1.5 py-0.5 text-[10px] text-text-muted">
														{sp.bundleId}
													</span>
												)}
											</div>
											<p className="text-[10px] text-text-muted truncate">
												{JSON.stringify(sp.payload).slice(0, 80)}
											</p>
										</button>
										<button
											type="button"
											onClick={() => deletePayload(sp.id)}
											className="ml-2 shrink-0 p-1 rounded text-text-muted hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all"
										>
											<Trash2 size={13} strokeWidth={1.8} />
										</button>
									</div>
								))}
							</div>
						)}
					</div>

					{/* Send history */}
					<div className="space-y-2">
						<button
							type="button"
							onClick={() => setShowHistory(!showHistory)}
							className="flex items-center gap-1 text-sm font-medium text-text-secondary hover:text-text-primary transition-colors"
						>
							{showHistory ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
							Send History
						</button>
						{showHistory && (
							<>
								{loading && <p className="text-xs text-text-muted">Loading...</p>}
								{!loading && history.length === 0 && (
									<div className="glass-panel">
										<p className="glass-empty-state">No sends yet</p>
									</div>
								)}
								{!loading && history.length > 0 && (
									<div className="space-y-1">
										{history.map((entry, i) => (
											<div
												key={`${entry.bundleId}-${entry.timestamp}-${i}`}
												className="px-2 py-1.5 rounded-lg hover:bg-bg-surface/30 transition-colors"
											>
												<div className="flex items-center gap-2">
													<span className="text-xs text-text-primary">{entry.bundleId}</span>
													<span className="text-[10px] text-text-muted">{entry.deviceName}</span>
												</div>
												<p className="text-[10px] text-text-muted truncate">
													{JSON.stringify(entry.payload).slice(0, 100)}
												</p>
												<p className="text-[10px] text-text-muted">
													{new Date(entry.timestamp).toLocaleString()}
												</p>
											</div>
										))}
									</div>
								)}
							</>
						)}
					</div>
				</>
			)}
		</div>
	);
}

registerPanel("push", PushPanel);

export default PushPanel;
