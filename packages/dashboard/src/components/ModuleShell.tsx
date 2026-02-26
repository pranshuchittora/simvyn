import { Suspense } from "react";
import { useModuleStore } from "../stores/module-store";
import { usePanelRegistry } from "../stores/panel-registry";

function LoadingSkeleton() {
	return (
		<div className="glass-panel m-4 animate-pulse p-6">
			<div className="mb-4 h-6 w-48 rounded bg-bg-surface" />
			<div className="mb-3 h-4 w-full rounded bg-bg-surface" />
			<div className="mb-3 h-4 w-3/4 rounded bg-bg-surface" />
			<div className="h-4 w-1/2 rounded bg-bg-surface" />
		</div>
	);
}

export default function ModuleShell() {
	const activeModule = useModuleStore((s) => s.activeModule);
	const modules = useModuleStore((s) => s.modules);
	const registry = usePanelRegistry();

	if (!activeModule) {
		return (
			<div className="flex flex-1 items-center justify-center">
				<div className="text-center">
					<div className="mb-2 text-4xl">🧩</div>
					<div className="text-lg text-text-secondary">
						Select a module from the sidebar
					</div>
				</div>
			</div>
		);
	}

	return (
		<div className="relative flex-1 overflow-hidden">
			{modules.map((mod) => {
				const Panel = registry.getPanel(mod.name);
				const isActive = activeModule === mod.name;

				return (
					<div
						key={mod.name}
						className="absolute inset-0 overflow-auto"
						style={{ display: isActive ? "block" : "none" }}
					>
						{Panel ? (
							<Suspense fallback={<LoadingSkeleton />}>
								<Panel />
							</Suspense>
						) : (
							isActive && (
								<div className="flex h-full items-center justify-center">
									<div className="text-center">
										<div className="mb-2 text-4xl">🚧</div>
										<div className="text-lg text-text-secondary">
											No panel available for <span className="text-text-primary">{mod.name}</span>
										</div>
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
