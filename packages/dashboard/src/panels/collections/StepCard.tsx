import type { CollectionStep } from "@simvyn/types";
import { GripVertical, X } from "lucide-react";
import { LocaleSearchPicker } from "../../components/LocaleSearchPicker";
import type { SerializedAction } from "./stores/collections-store";

const IOS_ONLY_ACTIONS = new Set([
	"set-status-bar",
	"clear-status-bar",
	"set-increase-contrast",
	"set-content-size",
]);

function AppleBadge() {
	return (
		<span className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 bg-bg-surface/60 text-[10px] text-text-muted">
			<svg width="10" height="12" viewBox="0 0 14 17" fill="currentColor">
				<path d="M10.3 0c.1.9-.3 1.8-.8 2.4-.6.7-1.4 1.2-2.3 1.1-.1-.9.3-1.8.9-2.4C8.7.5 9.6.1 10.3 0zm3.1 5.8c-.1.1-1.7 1-1.7 3 0 2.3 2 3.1 2.1 3.1 0 .1-.3 1.1-1.1 2.2-.7 1-1.4 1.9-2.5 1.9s-1.4-.6-2.6-.6c-1.2 0-1.6.6-2.6.7-1.1 0-1.8-1-2.6-2C1.3 12.5.3 10.2.3 8c0-3.2 2.1-4.9 4.1-4.9 1.1 0 2 .7 2.6.7.6 0 1.6-.8 2.9-.7.5 0 1.9.2 2.8 1.5l.7.2z" />
			</svg>
		</span>
	);
}

function AndroidBadge() {
	return (
		<span className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 bg-bg-surface/60 text-[10px] text-text-muted">
			<svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
				<path d="M6 18c0 .55.45 1 1 1h1v3.5c0 .83.67 1.5 1.5 1.5s1.5-.67 1.5-1.5V19h2v3.5c0 .83.67 1.5 1.5 1.5s1.5-.67 1.5-1.5V19h1c.55 0 1-.45 1-1V8H6v10zM3.5 8C2.67 8 2 8.67 2 9.5v7c0 .83.67 1.5 1.5 1.5S5 17.33 5 16.5v-7C5 8.67 4.33 8 3.5 8zm17 0c-.83 0-1.5.67-1.5 1.5v7c0 .83.67 1.5 1.5 1.5s1.5-.67 1.5-1.5v-7c0-.83-.67-1.5-1.5-1.5zm-4.97-5.84l1.3-1.3c.2-.2.2-.51 0-.71-.2-.2-.51-.2-.71 0l-1.48 1.48C13.85 1.23 12.95 1 12 1c-.96 0-1.86.23-2.66.63L7.85.15c-.2-.2-.51-.2-.71 0-.2.2-.2.51 0 .71l1.31 1.31C6.97 3.26 6 5.01 6 7h12c0-1.99-.97-3.75-2.47-4.84zM10 5H9V4h1v1zm5 0h-1V4h1v1z" />
			</svg>
		</span>
	);
}

interface StepCardProps {
	step: CollectionStep;
	action: SerializedAction | undefined;
	index: number;
	onRemove: () => void;
	onUpdateParams: (params: Record<string, unknown>) => void;
}

export function StepCard({ step, action, index, onRemove, onUpdateParams }: StepCardProps) {
	if (!action) {
		return (
			<div className="glass-panel px-3 py-2.5">
				<span className="text-xs text-red-400/70">Unknown action: {step.actionId}</span>
			</div>
		);
	}

	const iosOnly = IOS_ONLY_ACTIONS.has(action.id);

	const handleParamChange = (key: string, value: unknown) => {
		onUpdateParams({ ...step.params, [key]: value });
	};

	return (
		<div className="glass-panel px-3 py-2.5 space-y-2 group">
			<div className="flex items-center gap-2">
				<GripVertical size={14} className="text-text-muted cursor-grab shrink-0" />
				<span className="text-[10px] text-text-muted font-medium">#{index + 1}</span>
				<span className="text-sm font-medium text-text-primary flex-1 truncate">
					{action.label}
				</span>
				<div className="flex items-center gap-1">
					<AppleBadge />
					{!iosOnly && <AndroidBadge />}
				</div>
				<button
					type="button"
					onClick={onRemove}
					className="opacity-0 group-hover:opacity-100 transition-opacity p-0.5 text-text-muted hover:text-red-400"
				>
					<X size={14} strokeWidth={1.8} />
				</button>
			</div>

			{action.params.length > 0 && (
				<div className="space-y-1.5 pl-6">
					{action.params.map((param) => (
						<div key={param.key}>
							<label className="text-[10px] text-text-muted font-medium block mb-0.5">
								{param.label}
							</label>
							{param.type === "select" && (
								<select
									className="glass-input text-xs py-1 px-2 w-full"
									value={(step.params[param.key] as string) ?? (param.defaultValue as string) ?? ""}
									onChange={(e) => handleParamChange(param.key, e.target.value)}
								>
									<option value="" disabled>
										Select...
									</option>
									{param.options?.map((opt) => (
										<option key={opt.value} value={opt.value}>
											{opt.label}
										</option>
									))}
								</select>
							)}
							{param.type === "string" &&
								step.actionId === "set-locale" &&
								param.key === "locale" && (
									<LocaleSearchPicker
										value={(step.params[param.key] as string) ?? ""}
										onChange={(code) => handleParamChange(param.key, code)}
									/>
								)}
							{param.type === "string" &&
								!(step.actionId === "set-locale" && param.key === "locale") && (
									<input
										type="text"
										className="glass-input text-xs py-1 px-2 w-full"
										placeholder={param.placeholder}
										value={
											(step.params[param.key] as string) ?? (param.defaultValue as string) ?? ""
										}
										onChange={(e) => handleParamChange(param.key, e.target.value)}
									/>
								)}
							{param.type === "number" && (
								<input
									type="number"
									className="glass-input text-xs py-1 px-2 w-full"
									placeholder={param.placeholder}
									value={(step.params[param.key] as string) ?? (param.defaultValue as string) ?? ""}
									onChange={(e) => handleParamChange(param.key, Number(e.target.value))}
								/>
							)}
							{param.type === "boolean" && (
								<button
									type="button"
									className={`glass-button text-xs py-1 px-3 ${
										(step.params[param.key] ?? param.defaultValue) === true
											? "bg-accent-blue/20 border-accent-blue/30 text-accent-blue"
											: ""
									}`}
									onClick={() =>
										handleParamChange(
											param.key,
											!(step.params[param.key] ?? param.defaultValue ?? false),
										)
									}
								>
									{(step.params[param.key] ?? param.defaultValue) === true ? "On" : "Off"}
								</button>
							)}
						</div>
					))}
				</div>
			)}
		</div>
	);
}
