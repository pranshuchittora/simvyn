import { useState } from "react";
import { useNavigate } from "react-router";
import { motion, AnimatePresence } from "framer-motion";
import { useModuleStore } from "../stores/module-store";
import { moduleIconMap, moduleLabelMap } from "./icons/module-icons";

const COLLAPSED_WIDTH = 52;
const EXPANDED_WIDTH = 172;

const sidebarTransition = { type: "spring" as const, stiffness: 400, damping: 30, mass: 0.8 };
const labelTransition = { duration: 0.15, ease: "easeOut" as const };

export default function Sidebar() {
	const modules = useModuleStore((s) => s.modules);
	const activeModule = useModuleStore((s) => s.activeModule);
	const navigate = useNavigate();
	const [isHovered, setIsHovered] = useState(false);

	return (
		<div
			className="dock-sidebar-hitarea"
			onMouseEnter={() => setIsHovered(true)}
			onMouseLeave={() => setIsHovered(false)}
		>
			<motion.aside
				className="dock-sidebar"
				animate={{ width: isHovered ? EXPANDED_WIDTH : COLLAPSED_WIDTH }}
				transition={sidebarTransition}
			>
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
							<span className="dock-icon-svg">
								{Icon ? (
									<Icon size={24} />
								) : (
									<span className="text-sm">{mod.name[0]?.toUpperCase()}</span>
								)}
							</span>

							<AnimatePresence>
								{isHovered && (
									<motion.span
										className="dock-label"
										initial={{ opacity: 0, width: 0 }}
										animate={{ opacity: 1, width: "auto" }}
										exit={{ opacity: 0, width: 0 }}
										transition={labelTransition}
									>
										{label}
									</motion.span>
								)}
							</AnimatePresence>
						</button>
					);
				})}

				{modules.length === 0 && (
					<div className="text-text-muted text-[10px] text-center px-1 py-4">No modules</div>
				)}
			</motion.aside>
		</div>
	);
}
