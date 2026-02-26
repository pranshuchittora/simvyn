import {
	AppWindow,
	Bell,
	Camera,
	Database,
	ExternalLink,
	FolderOpen,
	MapPin,
	MonitorSmartphone,
	ScrollText,
} from "lucide-react";
import type { ComponentType } from "react";
import { useModuleStore } from "../stores/module-store";

const iconMap: Record<string, ComponentType<{ size?: number; strokeWidth?: number }>> = {
	devices: MonitorSmartphone,
	location: MapPin,
	apps: AppWindow,
	logs: ScrollText,
	screenshot: Camera,
	"deep-links": ExternalLink,
	push: Bell,
	fs: FolderOpen,
	database: Database,
};

const labelMap: Record<string, string> = {
	devices: "Devices",
	location: "Location",
	apps: "Apps",
	logs: "Logs",
	screenshot: "Screenshots",
	"deep-links": "Deep Links",
	push: "Push",
	fs: "Files",
	database: "Database",
};

export default function Sidebar() {
	const { modules, activeModule, setActiveModule } = useModuleStore();

	return (
		<aside className="dock-sidebar">
			{modules.map((mod) => {
				const isActive = activeModule === mod.name;
				const Icon = iconMap[mod.name];
				const label = labelMap[mod.name] ?? mod.name;

				return (
					<button
						key={mod.name}
						type="button"
						onClick={() => setActiveModule(mod.name)}
						className={`dock-icon ${isActive ? "active" : ""}`}
					>
						{Icon ? (
							<Icon size={20} strokeWidth={1.8} />
						) : (
							<span className="text-sm">{mod.name[0]?.toUpperCase()}</span>
						)}
						<span className="dock-tooltip">{label}</span>
					</button>
				);
			})}

			{modules.length === 0 && (
				<div className="text-text-muted text-[10px] text-center px-1 py-4">No modules</div>
			)}
		</aside>
	);
}
