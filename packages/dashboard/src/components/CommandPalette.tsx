import { Command } from "cmdk";
import { Clock, Home, Search } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router";
import { create } from "zustand";
import { useCollectionsStore } from "../panels/collections/stores/collections-store";
import { useModuleStore } from "../stores/module-store";
import { getActions } from "./command-palette/actions";
import StepRenderer from "./command-palette/StepRenderer";
import type { MultiStepAction } from "./command-palette/types";
import { moduleIconMap, moduleLabelMap } from "./icons/module-icons";

interface CommandPaletteStore {
	open: boolean;
	toggle: () => void;
	setOpen: (v: boolean) => void;
}

export const useCommandPaletteStore = create<CommandPaletteStore>((set) => ({
	open: false,
	toggle: () => set((s) => ({ open: !s.open })),
	setOpen: (v) => set({ open: v }),
}));

interface RecentEntry {
	id: string;
	type: "module" | "action";
	label: string;
}

const RECENT_KEY = "simvyn-cmdk-recent";
const MAX_RECENT = 5;

function getRecent(): RecentEntry[] {
	try {
		return JSON.parse(localStorage.getItem(RECENT_KEY) || "[]");
	} catch {
		return [];
	}
}

function pushRecent(entry: RecentEntry) {
	const list = getRecent().filter((r) => r.id !== entry.id);
	list.unshift(entry);
	localStorage.setItem(RECENT_KEY, JSON.stringify(list.slice(0, MAX_RECENT)));
}

export default function CommandPalette() {
	const open = useCommandPaletteStore((s) => s.open);
	const setOpen = useCommandPaletteStore((s) => s.setOpen);
	const modules = useModuleStore((s) => s.modules);
	const navigate = useNavigate();
	const [search, setSearch] = useState("");
	const [recent, setRecent] = useState<RecentEntry[]>([]);
	const [activeAction, setActiveAction] = useState<MultiStepAction | null>(null);
	const [currentStepType, setCurrentStepType] = useState<string | null>(null);

	const collections = useCollectionsStore((s) => s.collections);
	const fetchCollections = useCollectionsStore((s) => s.fetchCollections);

	useEffect(() => {
		if (collections.length === 0) fetchCollections();
	}, [collections.length, fetchCollections]);

	const actions = useMemo(() => getActions(navigate, collections), [navigate, collections]);

	useEffect(() => {
		if (open) setRecent(getRecent());
	}, [open]);

	useEffect(() => {
		function handleKeyDown(e: KeyboardEvent) {
			if ((e.metaKey || e.ctrlKey) && e.key === "k") {
				e.preventDefault();
				useCommandPaletteStore.getState().toggle();
			}
		}
		window.addEventListener("keydown", handleKeyDown);
		return () => window.removeEventListener("keydown", handleKeyDown);
	}, []);

	const close = useCallback(() => {
		setOpen(false);
		setSearch("");
		setActiveAction(null);
		setCurrentStepType(null);
	}, [setOpen]);

	const handleStepChange = useCallback((stepType: string) => {
		setCurrentStepType(stepType);
		setSearch("");
	}, []);

	function selectModule(name: string) {
		const label = moduleLabelMap[name] ?? name;
		pushRecent({ id: `mod:${name}`, type: "module", label });
		navigate(`/${name}`);
		close();
	}

	function handleAction(action: MultiStepAction) {
		pushRecent({ id: `act:${action.id}`, type: "action", label: action.label });
		if (action.steps.length > 0) {
			setActiveAction(action);
			setSearch("");
		} else {
			action.execute({ selectedDeviceIds: [], selectedDeviceNames: [], params: {} });
			close();
		}
	}

	const actionMap = useMemo(() => new Map(actions.map((a) => [`act:${a.id}`, a])), [actions]);

	function handleRecent(entry: RecentEntry) {
		if (entry.type === "module") {
			const name = entry.id.replace("mod:", "");
			navigate(`/${name}`);
			close();
		} else {
			const action = actionMap.get(entry.id);
			if (action) {
				handleAction(action);
				return;
			}
			close();
		}
		pushRecent(entry);
	}

	const showRecent = !search && recent.length > 0 && !activeAction;

	const placeholder = !activeAction
		? "Search modules and actions..."
		: currentStepType === "device-select"
			? "Search devices..."
			: currentStepType === "locale-select"
				? "Search locales..."
				: currentStepType === "location-select"
					? "Search for a location..."
					: currentStepType === "create-simulator"
						? ""
						: currentStepType === "parameter"
							? ""
							: "";

	const hideSearch =
		activeAction &&
		(currentStepType === "confirm" ||
			currentStepType === "create-simulator" ||
			currentStepType === "parameter");

	return (
		<Command.Dialog
			open={open}
			onOpenChange={(v) => {
				if (!v) {
					close();
				} else {
					setOpen(true);
				}
			}}
			label="Command palette"
			overlayClassName="cmdk-overlay"
			contentClassName="cmdk-dialog"
			loop
			shouldFilter={!activeAction}
		>
			{!hideSearch && (
				<div className="cmdk-search-row">
					<Search size={16} className="cmdk-search-icon" />
					<Command.Input placeholder={placeholder} value={search} onValueChange={setSearch} />
				</div>
			)}
			<Command.List>
				{activeAction ? (
					<StepRenderer
						action={activeAction}
						search={search}
						onComplete={close}
						onBack={() => {
							setActiveAction(null);
							setCurrentStepType(null);
							setSearch("");
						}}
						onStepChange={handleStepChange}
					/>
				) : (
					<>
						<Command.Empty>No results found</Command.Empty>
						{showRecent && (
							<>
								<Command.Group heading="Recent">
									{recent.map((entry) => {
										const modName = entry.type === "module" ? entry.id.replace("mod:", "") : null;
										const Icon = modName ? moduleIconMap[modName] : null;
										const action = entry.type === "action" ? actionMap.get(entry.id) : null;
										return (
											<Command.Item
												key={entry.id}
												value={`recent-${entry.label}`}
												onSelect={() => handleRecent(entry)}
											>
												{Icon ? <Icon size={18} /> : action ? action.icon : <Clock size={18} />}
												<div className="cmdk-item-text">
													<span>{entry.label}</span>
													<span className="cmdk-item-description">
														{entry.type === "module" ? "Page" : "Action"}
													</span>
												</div>
											</Command.Item>
										);
									})}
								</Command.Group>
								<Command.Separator />
							</>
						)}
						<Command.Group heading="Actions">
							{actions.map((action) => (
								<Command.Item
									key={action.id}
									value={action.label}
									keywords={[action.description]}
									onSelect={() => handleAction(action)}
								>
									{action.icon}
									<div className="cmdk-item-text">
										<span>{action.label}</span>
										<span className="cmdk-item-description">{action.description}</span>
									</div>
								</Command.Item>
							))}
						</Command.Group>
						<Command.Separator />
						<Command.Group heading="Pages">
							<Command.Item
								key="__home"
								value="Home"
								keywords={["home", "dashboard", "landing", "welcome"]}
								onSelect={() => {
									pushRecent({ id: "mod:__home", type: "module", label: "Home" });
									navigate("/");
									close();
								}}
							>
								<Home size={18} />
								<div className="cmdk-item-text">
									<span>Home</span>
									<span className="cmdk-item-description">Go to the home screen</span>
								</div>
							</Command.Item>
							{modules.map((mod) => {
								const Icon = moduleIconMap[mod.name];
								const label = moduleLabelMap[mod.name] ?? mod.name;
								return (
									<Command.Item
										key={mod.name}
										value={label}
										keywords={[mod.name, mod.description]}
										onSelect={() => selectModule(mod.name)}
									>
										{Icon && <Icon size={18} />}
										<div className="cmdk-item-text">
											<span>{label}</span>
											{mod.description && (
												<span className="cmdk-item-description">{mod.description}</span>
											)}
										</div>
									</Command.Item>
								);
							})}
						</Command.Group>
					</>
				)}
			</Command.List>
		</Command.Dialog>
	);
}
