import { Command } from "cmdk";
import { Camera, Eraser, MapPin, Moon, Search, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { toast } from "sonner";
import { create } from "zustand";
import { useDeviceStore } from "../stores/device-store";
import { useModuleStore } from "../stores/module-store";
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

interface ActionItem {
	id: string;
	label: string;
	description: string;
	icon: React.ReactNode;
	action: () => void;
}

export default function CommandPalette() {
	const open = useCommandPaletteStore((s) => s.open);
	const setOpen = useCommandPaletteStore((s) => s.setOpen);
	const modules = useModuleStore((s) => s.modules);
	const navigate = useNavigate();
	const [search, setSearch] = useState("");

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

	function selectModule(name: string) {
		navigate(`/${name}`);
		setOpen(false);
		setSearch("");
	}

	const actions: ActionItem[] = [
		{
			id: "screenshot",
			label: "Take Screenshot",
			description: "Capture the current screen",
			icon: <Camera size={18} />,
			action: () => {
				const device = useDeviceStore.getState().selectedDevice();
				if (!device) {
					toast.error("No device selected");
					return;
				}
				fetch(`/api/modules/screenshot/capture?deviceId=${device.id}`, {
					method: "POST",
				})
					.then((r) => {
						if (r.ok) toast.success("Screenshot captured");
						else toast.error("Screenshot failed");
					})
					.catch(() => toast.error("Screenshot failed"));
			},
		},
		{
			id: "toggle-dark-mode",
			label: "Toggle Dark Mode",
			description: "Switch appearance mode",
			icon: <Moon size={18} />,
			action: () => {
				const device = useDeviceStore.getState().selectedDevice();
				if (!device) {
					toast.error("No device selected");
					return;
				}
				fetch(`/api/modules/settings/appearance?deviceId=${device.id}`, { method: "POST" })
					.then((r) => {
						if (r.ok) toast.success("Appearance toggled");
						else toast.error("Toggle failed");
					})
					.catch(() => toast.error("Toggle failed"));
			},
		},
		{
			id: "set-location",
			label: "Set Location",
			description: "Navigate to location module",
			icon: <MapPin size={18} />,
			action: () => navigate("/location"),
		},
		{
			id: "clear-logs",
			label: "Clear Logs",
			description: "Navigate to logs module",
			icon: <Trash2 size={18} />,
			action: () => navigate("/logs"),
		},
		{
			id: "erase-device",
			label: "Erase Device",
			description: "Navigate to devices module",
			icon: <Eraser size={18} />,
			action: () => navigate("/devices"),
		},
	];

	function handleAction(action: ActionItem) {
		action.action();
		setOpen(false);
		setSearch("");
	}

	return (
		<Command.Dialog
			open={open}
			onOpenChange={(v) => {
				setOpen(v);
				if (!v) setSearch("");
			}}
			label="Command palette"
			overlayClassName="cmdk-overlay"
			contentClassName="cmdk-dialog"
			loop
		>
			<div className="cmdk-search-row">
				<Search size={16} className="cmdk-search-icon" />
				<Command.Input
					placeholder="Search modules and actions..."
					value={search}
					onValueChange={setSearch}
				/>
			</div>
			<Command.List>
				<Command.Empty>No results found</Command.Empty>
				<Command.Group heading="Modules">
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
				<Command.Separator />
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
			</Command.List>
		</Command.Dialog>
	);
}
