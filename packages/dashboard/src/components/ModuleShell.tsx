import { motion, useAnimationControls } from "framer-motion";
import type { ReactNode } from "react";
import { Suspense, useEffect } from "react";
import { useModuleStore } from "../stores/module-store";
import { usePanelRegistry } from "../stores/panel-registry";
import HomeScreen from "./HomeScreen";

const UNMOUNT_WHEN_HIDDEN = new Set(["logs"]);

const panelSpring = {
	type: "spring" as const,
	stiffness: 400,
	damping: 30,
	mass: 0.8,
};

function AnimatedPanel({ isActive, children }: { isActive: boolean; children: ReactNode }) {
	const controls = useAnimationControls();

	useEffect(() => {
		if (isActive) {
			controls.set({ opacity: 0, y: 8 });
			controls.start({ opacity: 1, y: 0 }, panelSpring);
		}
	}, [isActive, controls]);

	return (
		<motion.div className="h-full" animate={controls}>
			{children}
		</motion.div>
	);
}

function LoadingSkeleton() {
	return (
		<div className="p-6 space-y-4">
			<div className="h-7 w-48 rounded-lg bg-bg-surface/60 animate-pulse" />
			<div className="glass-panel p-6 space-y-3">
				<div className="h-4 w-full rounded bg-bg-surface/40 animate-pulse" />
				<div className="h-4 w-3/4 rounded bg-bg-surface/40 animate-pulse" />
				<div className="h-4 w-1/2 rounded bg-bg-surface/40 animate-pulse" />
			</div>
		</div>
	);
}

export default function ModuleShell() {
	const activeModule = useModuleStore((s) => s.activeModule);
	const modules = useModuleStore((s) => s.modules);
	const registry = usePanelRegistry();

	if (!activeModule) {
		return (
			<div className="relative flex-1 overflow-hidden h-full">
				<HomeScreen />
			</div>
		);
	}

	const moduleList = Array.isArray(modules) ? modules : [];

	return (
		<div className="relative flex-1 overflow-hidden">
			{moduleList.map((mod) => {
				const Panel = registry.getPanel(mod.name);
				const isActive = activeModule === mod.name;
				const shouldUnmount = UNMOUNT_WHEN_HIDDEN.has(mod.name) && !isActive;

				if (shouldUnmount) return null;

				return (
					<div
						key={mod.name}
						className="absolute inset-0 overflow-auto"
						style={{ display: isActive ? "block" : "none" }}
					>
						{Panel ? (
							<Suspense fallback={<LoadingSkeleton />}>
								<AnimatedPanel isActive={isActive}>
									<Panel />
								</AnimatedPanel>
							</Suspense>
						) : (
							isActive && (
								<div className="flex h-full items-center justify-center">
									<div className="text-center">
										<p className="text-sm text-text-secondary">
											No panel available for{" "}
											<span className="font-medium text-text-primary">{mod.name}</span>
										</p>
									</div>
								</div>
							)
						)}
					</div>
				);
			})}
		</div>
	);
}
