import type { Collection, DeviceStepStatus, ExecutionRun } from "@simvyn/types";
import { AlertTriangle, Check, Loader2, Play, SkipForward, X } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { useWs, useWsListener } from "../../hooks/use-ws";
import { useDeviceStore } from "../../stores/device-store";
import type { SerializedAction } from "./stores/collections-store";

const IOS_ONLY_ACTIONS = new Set([
	"set-status-bar",
	"clear-status-bar",
	"set-increase-contrast",
	"set-content-size",
]);

interface ApplyModalProps {
	collection: Collection;
	actions: SerializedAction[];
	open: boolean;
	onClose: () => void;
}

type Phase = "select" | "executing" | "complete";

function StatusIcon({ status }: { status: DeviceStepStatus }) {
	switch (status) {
		case "pending":
			return <span className="text-text-muted">—</span>;
		case "running":
			return <Loader2 size={14} className="animate-spin text-accent-blue" />;
		case "success":
			return <Check size={14} className="text-green-400" />;
		case "failed":
			return <X size={14} className="text-red-400" />;
		case "skipped":
			return <SkipForward size={14} className="text-yellow-400" />;
	}
}

export function ApplyModal({ collection, actions, open, onClose }: ApplyModalProps) {
	const devices = useDeviceStore((s) => s.devices);
	const bootedDevices = devices.filter((d) => d.state === "booted");
	const { send } = useWs();

	const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
	const [phase, setPhase] = useState<Phase>("select");
	const [runId, setRunId] = useState<string | null>(null);
	const [executionRun, setExecutionRun] = useState<ExecutionRun | null>(null);

	useEffect(() => {
		if (open) {
			setPhase("select");
			setRunId(null);
			setExecutionRun(null);
			send({ channel: "system", type: "subscribe", payload: { channel: "collections" } });
		}
		return () => {
			if (open) {
				send({ channel: "system", type: "unsubscribe", payload: { channel: "collections" } });
			}
		};
	}, [open, send]);

	const toggleDevice = (id: string) => {
		setSelectedIds((prev) => {
			const next = new Set(prev);
			if (next.has(id)) next.delete(id);
			else next.add(id);
			return next;
		});
	};

	const getSkipCount = (deviceId: string) => {
		const device = devices.find((d) => d.id === deviceId);
		if (!device || device.platform === "ios") return 0;
		return collection.steps.filter((step) => IOS_ONLY_ACTIONS.has(step.actionId)).length;
	};

	const handleApply = async () => {
		const deviceIds = Array.from(selectedIds);
		if (deviceIds.length === 0) return;
		try {
			const res = await fetch(`/api/modules/collections/${collection.id}/execute`, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ deviceIds }),
			});
			if (res.ok) {
				const data = await res.json();
				setRunId(data.runId);
				setPhase("executing");
			}
		} catch {
			// silent
		}
	};

	const handleStepProgress = useCallback(
		(payload: unknown) => {
			const run = payload as ExecutionRun;
			if (runId && run.runId === runId) {
				setExecutionRun(run);
			}
		},
		[runId],
	);

	const handleRunCompleted = useCallback(
		(payload: unknown) => {
			const run = payload as ExecutionRun;
			if (runId && run.runId === runId) {
				setExecutionRun(run);
				setPhase("complete");
			}
		},
		[runId],
	);

	const handleRunFailed = useCallback(
		(payload: unknown) => {
			const run = payload as ExecutionRun;
			if (runId && run.runId === runId) {
				setExecutionRun(run);
				setPhase("complete");
			}
		},
		[runId],
	);

	useWsListener("collections", "step-progress", handleStepProgress);
	useWsListener("collections", "run-completed", handleRunCompleted);
	useWsListener("collections", "run-failed", handleRunFailed);

	useEffect(() => {
		if (!open || phase !== "select") return;
		function onKeyDown(e: KeyboardEvent) {
			if ((e.metaKey || e.ctrlKey) && e.key === "Enter" && selectedIds.size > 0) {
				e.preventDefault();
				e.stopPropagation();
				handleApply();
			}
		}
		window.addEventListener("keydown", onKeyDown, true);
		return () => window.removeEventListener("keydown", onKeyDown, true);
	});

	const handleRunAgain = () => {
		setPhase("select");
		setRunId(null);
		setExecutionRun(null);
	};

	if (!open) return null;

	const selectedDevices = bootedDevices.filter((d) => selectedIds.has(d.id));
	const actionMap = new Map(actions.map((a) => [a.id, a]));

	const completionCounts = executionRun
		? executionRun.steps.reduce(
				(acc, step) => {
					for (const d of step.devices) {
						if (d.status === "success") acc.success++;
						else if (d.status === "failed") acc.failed++;
						else if (d.status === "skipped") acc.skipped++;
					}
					return acc;
				},
				{ success: 0, failed: 0, skipped: 0 },
			)
		: null;

	return (
		<div
			className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
			onClick={(e) => {
				if (e.target === e.currentTarget && phase !== "executing") onClose();
			}}
			onKeyDown={() => {}}
			role="presentation"
		>
			<div
				className="glass-panel max-w-lg w-full max-h-[80vh] overflow-y-auto mx-4"
				style={{ background: "rgba(22, 22, 32, 0.95)", backdropFilter: "blur(24px) saturate(1.3)" }}
			>
				<div className="flex items-center justify-between p-4 border-b border-glass-border">
					<span className="text-base font-medium text-text-primary">{collection.name}</span>
					<button
						type="button"
						onClick={onClose}
						className="p-1 rounded text-text-muted hover:text-text-primary transition-colors"
					>
						<X size={16} strokeWidth={1.8} />
					</button>
				</div>

				{phase === "select" && (
					<div className="p-4 space-y-3">
						<p className="text-xs text-text-secondary">Select target devices</p>
						{bootedDevices.length === 0 ? (
							<p className="text-xs text-text-muted text-center py-4">
								No booted devices available
							</p>
						) : (
							<div className="grid gap-2 grid-cols-1 sm:grid-cols-2">
								{bootedDevices.map((device) => {
									const checked = selectedIds.has(device.id);
									const skipCount = getSkipCount(device.id);
									const totalSteps = collection.steps.length;
									const runCount = totalSteps - skipCount;
									return (
										<button
											key={device.id}
											type="button"
											onClick={() => toggleDevice(device.id)}
											className={`glass-panel p-3 flex flex-col gap-2 text-left transition-all duration-150 ${
												checked
													? "border-accent-blue/60 bg-accent-blue/10"
													: "hover:border-glass-border-hover"
											}`}
										>
											<div className="flex items-start justify-between">
												<div className="min-w-0 flex-1">
													<div className="text-sm font-medium text-text-primary truncate">
														{device.name}
													</div>
													<div className="text-[10px] text-text-muted mt-0.5">
														{device.platform === "ios" ? "iOS" : "Android"} {device.osVersion}
													</div>
												</div>
												<span
													className={`flex items-center justify-center w-5 h-5 rounded-md border-2 shrink-0 transition-colors ${
														checked
															? "bg-accent-blue border-accent-blue"
															: "border-glass-border-hover"
													}`}
												>
													{checked && <Check size={12} className="text-white" />}
												</span>
											</div>
											{checked && skipCount > 0 && (
												<div className="flex items-center gap-1 text-[10px] text-yellow-400">
													<AlertTriangle size={10} className="shrink-0" />
													<span>
														{runCount}/{totalSteps} steps will run ({skipCount} skipped)
													</span>
												</div>
											)}
											{checked && skipCount === 0 && (
												<div className="text-[10px] text-green-400">
													All {totalSteps} steps will run
												</div>
											)}
										</button>
									);
								})}
							</div>
						)}

						<div className="flex items-center justify-between pt-2 border-t border-glass-border">
							<span className="text-[10px] text-text-muted">
								{selectedIds.size > 0
									? `${selectedIds.size} device${selectedIds.size !== 1 ? "s" : ""} selected`
									: "No devices selected"}
							</span>
							<button
								type="button"
								onClick={handleApply}
								disabled={selectedIds.size === 0}
								className="glass-button-primary flex items-center gap-1.5"
							>
								<Play size={14} strokeWidth={1.8} />
								Apply
								<kbd className="text-[10px] opacity-60 ml-1">⌘↵</kbd>
							</button>
						</div>
					</div>
				)}

				{(phase === "executing" || phase === "complete") && executionRun && (
					<div className="p-4 space-y-3">
						<div className="overflow-x-auto">
							<table className="w-full text-xs">
								<thead>
									<tr className="text-text-muted">
										<th className="text-left py-1 pr-3 font-normal">Step</th>
										{selectedDevices.map((d) => (
											<th
												key={d.id}
												className="text-center py-1 px-2 font-normal whitespace-nowrap"
											>
												{d.name}
											</th>
										))}
									</tr>
								</thead>
								<tbody>
									{executionRun.steps.map((step) => {
										const label = actionMap.get(step.actionId)?.label ?? step.label;
										return (
											<tr key={step.stepId} className="border-t border-glass-border/30">
												<td className="py-1.5 pr-3 text-text-secondary">{label}</td>
												{selectedDevices.map((device) => {
													const result = step.devices.find((d) => d.deviceId === device.id);
													const status = result?.status ?? "pending";
													return (
														<td
															key={device.id}
															className="text-center py-1.5 px-2"
															title={result?.error}
														>
															<div className="flex items-center justify-center">
																<StatusIcon status={status} />
															</div>
														</td>
													);
												})}
											</tr>
										);
									})}
								</tbody>
							</table>
						</div>

						{phase === "complete" && completionCounts && (
							<div className="space-y-3 pt-2 border-t border-glass-border">
								<div className="flex items-center gap-4 text-xs">
									<span className="text-green-400">{completionCounts.success} passed</span>
									<span className="text-red-400">{completionCounts.failed} failed</span>
									<span className="text-yellow-400">{completionCounts.skipped} skipped</span>
								</div>
								<div className="flex items-center gap-2 justify-end">
									<button type="button" onClick={handleRunAgain} className="glass-button text-xs">
										Run Again
									</button>
									<button type="button" onClick={onClose} className="glass-button-primary text-xs">
										Done
									</button>
								</div>
							</div>
						)}
					</div>
				)}
			</div>
		</div>
	);
}
