import { Command, Keyboard, Monitor, Smartphone } from "lucide-react";
import { useNavigate } from "react-router";
import { useDeviceStore } from "../stores/device-store";
import { useModuleStore } from "../stores/module-store";
import { moduleIconMap, moduleLabelMap } from "./icons/module-icons";

function QuickTips() {
	const tips = [
		{
			icon: <Keyboard size={14} strokeWidth={1.8} />,
			text: "Press Cmd+K to search modules and actions",
		},
		{
			icon: <Monitor size={14} strokeWidth={1.8} />,
			text: "Select a device from the top bar to get started",
		},
		{
			icon: <Command size={14} strokeWidth={1.8} />,
			text: "Click any module in the sidebar to open it",
		},
		{
			icon: <Keyboard size={14} strokeWidth={1.8} />,
			text: "Use Cmd+K to take screenshots or toggle dark mode",
		},
	];

	return (
		<div className="glass-panel p-4 space-y-2.5">
			<h2 className="text-sm font-medium text-text-primary">Quick Start</h2>
			<ul className="space-y-2">
				{tips.map((tip) => (
					<li key={tip.text} className="flex items-center gap-2.5 text-xs text-text-secondary">
						<span className="text-text-muted shrink-0">{tip.icon}</span>
						{tip.text}
					</li>
				))}
			</ul>
		</div>
	);
}

function DeviceSummary() {
	const devices = useDeviceStore((s) => s.devices);
	const count = devices.length;

	return (
		<div className="glass-panel p-4 space-y-2.5">
			<h2 className="text-sm font-medium text-text-primary">
				{count} device{count !== 1 ? "s" : ""} connected
			</h2>
			{count === 0 ? (
				<p className="text-xs text-text-muted">
					No devices connected — boot a simulator or emulator to get started
				</p>
			) : (
				<ul className="space-y-1.5">
					{devices.map((d) => (
						<li key={d.id} className="flex items-center gap-2 text-xs text-text-secondary">
							<span
								className="inline-block w-1.5 h-1.5 rounded-full shrink-0"
								style={{
									backgroundColor: d.state === "booted" ? "#4ade80" : "#6b7280",
								}}
							/>
							<Smartphone size={12} strokeWidth={1.5} className="text-text-muted shrink-0" />
							<span className="truncate">{d.name}</span>
							<span className="text-text-muted ml-auto shrink-0">
								{d.platform === "ios" ? "iOS" : "Android"}
							</span>
						</li>
					))}
				</ul>
			)}
		</div>
	);
}

function ModuleGrid() {
	const modules = useModuleStore((s) => s.modules);
	const navigate = useNavigate();

	return (
		<div className="space-y-2.5">
			<h2 className="text-sm font-medium text-text-primary">Modules</h2>
			<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
				{modules.map((mod) => {
					const Icon = moduleIconMap[mod.name];
					const label = moduleLabelMap[mod.name] ?? mod.name;

					return (
						<button
							key={mod.name}
							type="button"
							onClick={() => navigate(`/${mod.name}`)}
							className="glass-panel p-4 flex items-start gap-3 text-left transition-all hover:brightness-110 hover:scale-[1.01] cursor-pointer"
						>
							{Icon && (
								<span className="shrink-0 mt-0.5">
									<Icon size={24} />
								</span>
							)}
							<div className="min-w-0">
								<p className="text-sm font-medium text-text-primary">{label}</p>
								{mod.description && (
									<p className="text-xs text-text-muted mt-0.5 line-clamp-2">{mod.description}</p>
								)}
							</div>
						</button>
					);
				})}
			</div>
		</div>
	);
}

export default function HomeScreen() {
	return (
		<div className="h-full overflow-auto p-6 space-y-6">
			<div>
				<h1 className="text-xl font-semibold text-text-primary">Welcome to simvyn</h1>
				<p className="text-sm text-text-secondary mt-1">Universal mobile device devtool</p>
			</div>

			<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
				<QuickTips />
				<DeviceSummary />
			</div>

			<ModuleGrid />
		</div>
	);
}
