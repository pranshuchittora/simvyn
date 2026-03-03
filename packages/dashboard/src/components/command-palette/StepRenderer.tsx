import { ArrowLeft, Loader2 } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import CreateSimulatorPicker from "./CreateSimulatorPicker";
import DevicePicker from "./DevicePicker";
import LocalePicker from "./LocalePicker";
import LocationPicker from "./LocationPicker";
import type {
	ConfirmStep,
	DeviceSelectStep,
	MultiStepAction,
	ParameterStep,
	StepContext,
} from "./types";

interface StepRendererProps {
	action: MultiStepAction;
	search: string;
	onComplete: () => void;
	onBack: () => void;
	onStepChange?: (stepType: string) => void;
}

export default function StepRenderer({
	action,
	search,
	onComplete,
	onBack,
	onStepChange,
}: StepRendererProps) {
	const [stepIndex, setStepIndex] = useState(0);
	const [context, setContext] = useState<StepContext>({
		selectedDeviceIds: [],
		selectedDeviceNames: [],
		params: {},
	});
	const [executing, setExecuting] = useState(false);

	const currentStep = action.steps[stepIndex];

	useEffect(() => {
		if (currentStep) onStepChange?.(currentStep.type);
	}, [currentStep, onStepChange]);

	const handleBack = useCallback(() => {
		if (stepIndex === 0) {
			onBack();
		} else {
			setStepIndex((i) => i - 1);
		}
	}, [stepIndex, onBack]);

	const advance = useCallback(
		(updatedContext: StepContext) => {
			const nextIndex = stepIndex + 1;
			if (nextIndex >= action.steps.length) {
				setExecuting(true);
				action
					.execute(updatedContext)
					.then(() => onComplete())
					.catch(() => onComplete());
				return;
			}
			const nextStep = action.steps[nextIndex];
			if (nextStep.type === "execute") {
				setExecuting(true);
				action
					.execute(updatedContext)
					.then(() => onComplete())
					.catch(() => onComplete());
				return;
			}
			setStepIndex(nextIndex);
		},
		[stepIndex, action, onComplete],
	);

	function handleDeviceSelect(deviceIds: string[], deviceNames: string[]) {
		const updated = { ...context, selectedDeviceIds: deviceIds, selectedDeviceNames: deviceNames };
		setContext(updated);
		advance(updated);
	}

	function handleLocaleSelect(localeCode: string) {
		const updated = { ...context, params: { ...context.params, locale: localeCode } };
		setContext(updated);
		advance(updated);
	}

	function handleLocationSelect(location: { lat: number; lon: number; name: string }) {
		const updated = { ...context, params: { ...context.params, location } };
		setContext(updated);
		advance(updated);
	}

	function handleCreateSimulator(params: {
		name: string;
		deviceTypeId: string;
		runtimeId: string;
		deviceTypeName: string;
	}) {
		const updated = {
			...context,
			params: { ...context.params, ...params },
		};
		setContext(updated);
		advance(updated);
	}

	function handleParameter(paramKey: string, value: string) {
		const updated = { ...context, params: { ...context.params, [paramKey]: value } };
		setContext(updated);
		advance(updated);
	}

	function handleConfirm() {
		advance(context);
	}

	if (executing) {
		return (
			<div className="flex flex-col items-center justify-center py-10 gap-3">
				<Loader2 size={20} className="animate-spin text-accent-blue" />
				<span className="text-sm text-text-secondary">Executing...</span>
			</div>
		);
	}

	if (!currentStep) return null;

	const breadcrumbs = action.steps.slice(0, stepIndex + 1).map((s) => s.label);

	return (
		<>
			<div className="flex items-center gap-2 px-3 py-2 border-b border-glass-border text-xs text-text-secondary">
				<button
					type="button"
					onClick={handleBack}
					className="flex items-center justify-center w-5 h-5 rounded hover:bg-white/10 transition-colors"
				>
					<ArrowLeft size={14} />
				</button>
				<span className="font-medium text-text-primary">{action.label}</span>
				{breadcrumbs.map((crumb) => (
					<span key={crumb} className="flex items-center gap-2">
						<span className="text-text-muted">/</span>
						<span>{crumb}</span>
					</span>
				))}
			</div>

			<div className="transition-opacity duration-150">
				{currentStep.type === "device-select" && (
					<DevicePicker
						step={currentStep as DeviceSelectStep}
						search={search}
						onSelect={handleDeviceSelect}
					/>
				)}

				{currentStep.type === "locale-select" && (
					<LocalePicker search={search} onSelect={handleLocaleSelect} />
				)}

				{currentStep.type === "location-select" && (
					<LocationPicker search={search} onSelect={handleLocationSelect} />
				)}

				{currentStep.type === "create-simulator" && (
					<CreateSimulatorPicker onSelect={handleCreateSimulator} />
				)}

				{currentStep.type === "parameter" && (
					<ParameterInput
						step={currentStep as ParameterStep}
						onSubmit={(value) => handleParameter((currentStep as ParameterStep).paramKey, value)}
					/>
				)}

				{currentStep.type === "confirm" && (
					<ConfirmView
						step={currentStep as ConfirmStep}
						context={context}
						onConfirm={handleConfirm}
						onCancel={handleBack}
					/>
				)}
			</div>
		</>
	);
}

function ParameterInput({
	step,
	onSubmit,
}: {
	step: ParameterStep;
	onSubmit: (value: string) => void;
}) {
	const [value, setValue] = useState("");
	const inputRef = useRef<HTMLInputElement>(null);

	useEffect(() => {
		inputRef.current?.focus();
	}, []);

	return (
		<div className="px-3 py-4">
			<input
				ref={inputRef}
				type="text"
				value={value}
				onChange={(e) => setValue(e.target.value)}
				onKeyDown={(e) => {
					if (e.key === "Enter" && value.trim()) {
						e.preventDefault();
						onSubmit(value.trim());
					}
				}}
				placeholder={step.placeholder ?? step.label}
				className="w-full bg-white/5 border border-glass-border rounded-lg px-3 py-2 text-sm text-text-primary placeholder:text-text-muted outline-none focus:border-accent-blue"
			/>
			<p className="text-[10px] text-text-muted mt-2 px-1">
				Press <kbd className="cmdk-kbd">↵</kbd> to continue
			</p>
		</div>
	);
}

function ConfirmView({
	step,
	context,
	onConfirm,
	onCancel,
}: {
	step: ConfirmStep;
	context: StepContext;
	onConfirm: () => void;
	onCancel: () => void;
}) {
	const message = typeof step.message === "function" ? step.message(context) : step.message;

	useEffect(() => {
		function onKeyDown(e: KeyboardEvent) {
			if (e.key === "Enter") {
				e.preventDefault();
				onConfirm();
			} else if (e.key === "Escape") {
				e.preventDefault();
				onCancel();
			}
		}
		window.addEventListener("keydown", onKeyDown);
		return () => window.removeEventListener("keydown", onKeyDown);
	}, [onConfirm, onCancel]);

	return (
		<div className="flex flex-col items-center gap-4 px-6 py-8">
			<p className="text-sm text-text-primary text-center leading-relaxed">{message}</p>
			<div className="flex gap-3">
				<button type="button" className="glass-button text-xs px-4 py-2" onClick={onCancel}>
					Cancel <kbd className="cmdk-kbd">Esc</kbd>
				</button>
				<button
					type="button"
					className={`text-xs px-4 py-2 ${step.destructive ? "glass-button-destructive" : "glass-button-primary"}`}
					onClick={onConfirm}
				>
					{step.destructive ? "Delete" : "Confirm"} <kbd className="cmdk-kbd">↵</kbd>
				</button>
			</div>
		</div>
	);
}
