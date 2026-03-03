import { useCallback, useState } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router";
import { useModuleStore } from "../stores/module-store";
import { moduleIconMap, moduleLabelMap } from "./icons/module-icons";

export default function Sidebar() {
	const modules = useModuleStore((s) => s.modules);
	const activeModule = useModuleStore((s) => s.activeModule);
	const navigate = useNavigate();
	const [tooltip, setTooltip] = useState<{ label: string; top: number; left: number } | null>(null);

	const showTooltip = useCallback((e: React.MouseEvent, label: string) => {
		const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
		setTooltip({ label, top: rect.top + rect.height / 2, left: rect.right + 8 });
	}, []);

	const hideTooltip = useCallback(() => setTooltip(null), []);

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
						onMouseEnter={(e) => showTooltip(e, label)}
						onMouseLeave={hideTooltip}
					>
						{Icon ? (
							<Icon size={24} />
						) : (
							<span className="text-sm">{mod.name[0]?.toUpperCase()}</span>
						)}
					</button>
				);
			})}

			{modules.length === 0 && (
				<div className="text-text-muted text-[10px] text-center px-1 py-4">No modules</div>
			)}

			{tooltip &&
				createPortal(
					<span className="dock-tooltip-fixed" style={{ top: tooltip.top, left: tooltip.left }}>
						{tooltip.label}
					</span>,
					document.body,
				)}
		</aside>
	);
}
