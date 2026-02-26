import { useModuleStore } from "../stores/module-store";

const defaultIcons: Record<string, string> = {
	location: "📍",
	apps: "📱",
	logs: "📋",
	network: "🌐",
	settings: "⚙️",
	files: "📁",
	media: "🎬",
	accessibility: "♿",
};

export default function Sidebar() {
	const { modules, activeModule, setActiveModule } = useModuleStore();

	return (
		<aside className="flex w-56 shrink-0 flex-col border-r border-glass-border bg-glass/40 backdrop-blur-xl">
			<div className="px-4 py-3 text-xs font-semibold uppercase text-text-muted">
				Modules
			</div>

			<nav className="flex-1 space-y-0.5 px-2">
				{modules.map((mod) => {
					const isActive = activeModule === mod.name;
					const icon = mod.icon ?? defaultIcons[mod.name] ?? "📦";

					return (
						<button
							key={mod.name}
							type="button"
							onClick={() => setActiveModule(mod.name)}
							className={`flex w-full items-center gap-3 rounded-[var(--radius-button)] px-3 py-2 text-left text-sm transition-colors ${
								isActive
									? "bg-accent-blue/20 text-accent-blue"
									: "text-text-secondary hover:bg-bg-surface hover:text-text-primary"
							}`}
						>
							<span className="text-base">{icon}</span>
							<span className="truncate">{mod.name}</span>
						</button>
					);
				})}

				{modules.length === 0 && (
					<div className="px-3 py-8 text-center text-sm text-text-muted">
						No modules loaded
					</div>
				)}
			</nav>
		</aside>
	);
}
