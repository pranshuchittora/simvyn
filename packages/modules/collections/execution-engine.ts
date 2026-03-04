import { isAndroidPhysical, isPhysicalDevice } from "@simvyn/core";
import type {
	ActionDescriptor,
	Collection,
	DeviceStepResult,
	ExecutionRun,
	PlatformAdapter,
	StepExecution,
} from "@simvyn/types";
import { getActionDescriptors } from "./action-registry.js";

const PHYSICAL_UNSUPPORTED_IOS = new Set([
	"set-location",
	"clear-location",
	"set-status-bar",
	"clear-status-bar",
	"set-clipboard",
	"set-appearance",
	"set-content-size",
	"set-increase-contrast",
	"erase-device",
]);

const PHYSICAL_UNSUPPORTED_ANDROID = new Set([
	"set-location",
	"clear-location",
	"set-locale",
	"erase-device",
]);

export interface RunCollectionOpts {
	collection: Collection;
	devices: Array<{ id: string; name: string; platform: string }>;
	getAdapter: (platform: string) => PlatformAdapter | undefined;
	onStepProgress: (run: ExecutionRun) => void;
	onComplete: (run: ExecutionRun) => void;
	onError: (run: ExecutionRun, error: Error) => void;
	timeoutMs?: number;
}

export function runCollection(opts: RunCollectionOpts): ExecutionRun {
	const {
		collection,
		devices,
		getAdapter,
		onStepProgress,
		onComplete,
		onError,
		timeoutMs = 30_000,
	} = opts;

	const actionMap = new Map<string, ActionDescriptor>();
	for (const desc of getActionDescriptors()) {
		actionMap.set(desc.id, desc);
	}

	const steps: StepExecution[] = collection.steps.map((step) => ({
		stepId: step.id,
		actionId: step.actionId,
		label: step.label ?? actionMap.get(step.actionId)?.label ?? step.actionId,
		devices: devices.map((d) => ({
			deviceId: d.id,
			deviceName: d.name,
			status: "pending" as const,
		})),
	}));

	const run: ExecutionRun = {
		runId: crypto.randomUUID(),
		collectionId: collection.id,
		collectionName: collection.name,
		deviceIds: devices.map((d) => d.id),
		status: "running",
		startedAt: new Date().toISOString(),
		currentStepIndex: 0,
		steps,
	};

	(async () => {
		try {
			for (let i = 0; i < collection.steps.length; i++) {
				const collectionStep = collection.steps[i];
				const stepExec = run.steps[i];
				run.currentStepIndex = i;

				const action = actionMap.get(collectionStep.actionId);
				if (!action) {
					for (const dr of stepExec.devices) {
						dr.status = "failed";
						dr.error = `Unknown action: ${collectionStep.actionId}`;
						dr.completedAt = new Date().toISOString();
					}
					onStepProgress(run);
					continue;
				}

				await Promise.all(
					devices.map(async (device, deviceIdx) => {
						const dr: DeviceStepResult = stepExec.devices[deviceIdx];
						const adapter = getAdapter(device.platform);

						if (!adapter || !action.isSupported(adapter)) {
							dr.status = "skipped";
							dr.completedAt = new Date().toISOString();
							return;
						}

						const isPhysDevice = isPhysicalDevice(device.id) || isAndroidPhysical(device.id);
						if (isPhysDevice) {
							const unsupported =
								device.platform === "ios" ? PHYSICAL_UNSUPPORTED_IOS : PHYSICAL_UNSUPPORTED_ANDROID;
							if (unsupported.has(collectionStep.actionId)) {
								dr.status = "skipped";
								dr.completedAt = new Date().toISOString();
								return;
							}
						}

						dr.status = "running";
						dr.startedAt = new Date().toISOString();

						try {
							await Promise.race([
								action.execute(adapter, device.id, collectionStep.params),
								new Promise<never>((_, reject) =>
									setTimeout(() => reject(new Error("Timeout: step exceeded 30s")), timeoutMs),
								),
							]);
							dr.status = "success";
						} catch (err) {
							dr.status = "failed";
							dr.error = err instanceof Error ? err.message : String(err);
						}

						dr.completedAt = new Date().toISOString();
					}),
				);

				onStepProgress(run);
			}

			run.status = "completed";
			run.completedAt = new Date().toISOString();
			onComplete(run);
		} catch (err) {
			run.status = "failed";
			run.completedAt = new Date().toISOString();
			onError(run, err instanceof Error ? err : new Error(String(err)));
		}
	})();

	return run;
}
