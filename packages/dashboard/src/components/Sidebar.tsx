import { useNavigate } from "react-router";
import { useModuleStore } from "../stores/module-store";
import { moduleIconMap, moduleLabelMap } from "./icons/module-icons";

export default function Sidebar() {
	const modules = useModuleStore((s) => s.modules);
	const activeModule = useModuleStore((s) => s.activeModule);
	const navigate = useNavigate();

	return (
		<aside className="dock-sidebar">
			{modules.map((mod) => {
				const isActive = activeModule === mod.name;
				const Icon = moduleIconMap[mod.name];
				const label = moduleLabelMap[mod.name] ?? mod.name;

				return (
					<button
						key={mod.name}
						type="button"
						onClick={() => navigate(`/${mod.name}`)}
						className={`dock-icon ${isActive ? "active" : ""}`}
					>
						{Icon ? (
							<Icon size={20} />
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
