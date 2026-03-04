import type { CollectionStep } from "@simvyn/types";
import { Reorder } from "framer-motion";
import { ArrowLeft, Play, Plus } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { ActionPicker } from "./ActionPicker";
import { ApplyModal } from "./ApplyModal";
import { StepCard } from "./StepCard";
import { useCollectionsStore } from "./stores/collections-store";

interface StepBuilderProps {
	collectionId: string;
	onBack: () => void;
}

export function StepBuilder({ collectionId, onBack }: StepBuilderProps) {
	const collection = useCollectionsStore((s) => s.collections.find((c) => c.id === collectionId));
	const actions = useCollectionsStore((s) => s.actions);
	const updateCollection = useCollectionsStore((s) => s.updateCollection);

	const [steps, setSteps] = useState<CollectionStep[]>(collection?.steps ?? []);
	const [name, setName] = useState(collection?.name ?? "");
	const [showActionPicker, setShowActionPicker] = useState(false);
	const [showApplyModal, setShowApplyModal] = useState(false);

	const saveTimerRef = useRef<ReturnType<typeof setTimeout>>(null);

	useEffect(() => {
		if (collection) {
			setSteps(collection.steps);
			setName(collection.name);
		}
	}, [collection]);

	const saveSteps = useCallback(
		(newSteps: CollectionStep[]) => {
			updateCollection(collectionId, { steps: newSteps });
		},
		[collectionId, updateCollection],
	);

	const debouncedSaveSteps = useCallback(
		(newSteps: CollectionStep[]) => {
			if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
			saveTimerRef.current = setTimeout(() => saveSteps(newSteps), 500);
		},
		[saveSteps],
	);

	const handleReorder = (newOrder: CollectionStep[]) => {
		setSteps(newOrder);
		saveSteps(newOrder);
	};

	const handleAddStep = (actionId: string) => {
		const action = actions.find((a) => a.id === actionId);
		const params: Record<string, unknown> = {};
		if (action) {
			for (const p of action.params) {
				if (p.defaultValue !== undefined) params[p.key] = p.defaultValue;
			}
		}
		const newStep: CollectionStep = {
			id: crypto.randomUUID(),
			actionId,
			params,
		};
		const newSteps = [...steps, newStep];
		setSteps(newSteps);
		saveSteps(newSteps);
	};

	const handleRemoveStep = (stepId: string) => {
		const newSteps = steps.filter((s) => s.id !== stepId);
		setSteps(newSteps);
		saveSteps(newSteps);
	};

	const handleUpdateParams = (stepId: string, params: Record<string, unknown>) => {
		const newSteps = steps.map((s) => (s.id === stepId ? { ...s, params } : s));
		setSteps(newSteps);
		debouncedSaveSteps(newSteps);
	};

	const handleNameSave = () => {
		const trimmed = name.trim();
		if (trimmed && trimmed !== collection?.name) {
			updateCollection(collectionId, { name: trimmed });
		}
	};

	const handleNameKeyDown = (e: React.KeyboardEvent) => {
		if (e.key === "Enter") {
			(e.target as HTMLInputElement).blur();
		}
	};

	if (!collection) {
		return (
			<div className="p-6">
				<button type="button" onClick={onBack} className="glass-button flex items-center gap-1.5">
					<ArrowLeft size={14} strokeWidth={1.8} />
					Back
				</button>
				<div className="glass-panel mt-4">
					<p className="glass-empty-state">Collection not found</p>
				</div>
			</div>
		);
	}

	return (
		<div className="p-6 space-y-4">
			<div className="flex items-center gap-3">
				<button type="button" onClick={onBack} className="glass-button flex items-center gap-1.5">
					<ArrowLeft size={14} strokeWidth={1.8} />
					Back
				</button>
				<input
					type="text"
					value={name}
					onChange={(e) => setName(e.target.value)}
					onBlur={handleNameSave}
					onKeyDown={handleNameKeyDown}
					className="glass-input text-base font-medium flex-1 py-1 px-2"
				/>
				<span className="text-text-muted text-xs shrink-0">
					{steps.length} step{steps.length !== 1 ? "s" : ""}
				</span>
				<button
					type="button"
					onClick={() => setShowApplyModal(true)}
					className="glass-button-primary flex items-center gap-1.5"
				>
					<Play size={14} strokeWidth={1.8} />
					Apply
				</button>
			</div>

			<div className="relative">
				<button
					type="button"
					onClick={() => setShowActionPicker(!showActionPicker)}
					className="glass-button-primary flex items-center gap-1.5"
				>
					<Plus size={14} strokeWidth={1.8} />
					Add Step
				</button>
				<ActionPicker
					actions={actions}
					onAdd={handleAddStep}
					onClose={() => setShowActionPicker(false)}
					open={showActionPicker}
				/>
			</div>

			{steps.length === 0 ? (
				<div className="glass-panel">
					<p className="glass-empty-state">
						No steps yet — click "Add Step" to browse available actions
					</p>
				</div>
			) : (
				<Reorder.Group axis="y" values={steps} onReorder={handleReorder} className="space-y-2">
					{steps.map((step, i) => (
						<Reorder.Item key={step.id} value={step}>
							<StepCard
								step={step}
								action={actions.find((a) => a.id === step.actionId)}
								index={i}
								onRemove={() => handleRemoveStep(step.id)}
								onUpdateParams={(params) => handleUpdateParams(step.id, params)}
							/>
						</Reorder.Item>
					))}
				</Reorder.Group>
			)}

			{collection && showApplyModal && (
				<ApplyModal
					collection={collection}
					actions={actions}
					open={showApplyModal}
					onClose={() => setShowApplyModal(false)}
				/>
			)}
		</div>
	);
}
