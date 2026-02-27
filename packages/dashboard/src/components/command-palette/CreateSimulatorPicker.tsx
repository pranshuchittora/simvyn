import { Command } from "cmdk";
import { useCallback, useEffect, useRef, useState } from "react";

interface DeviceType {
	name: string;
	identifier: string;
}

interface SimRuntime {
	name: string;
	identifier: string;
	isAvailable: boolean;
}

interface CreateSimulatorPickerProps {
	onSelect: (params: {
		name: string;
		deviceTypeId: string;
		runtimeId: string;
		deviceTypeName: string;
	}) => void;
}

type Phase = "name" | "deviceType" | "runtime";

export default function CreateSimulatorPicker({ onSelect }: CreateSimulatorPickerProps) {
	const [phase, setPhase] = useState<Phase>("name");
	const [name, setName] = useState("");
	const [deviceTypes, setDeviceTypes] = useState<DeviceType[]>([]);
	const [runtimes, setRuntimes] = useState<SimRuntime[]>([]);
	const [selectedTypeId, setSelectedTypeId] = useState("");
	const [selectedTypeName, setSelectedTypeName] = useState("");
	const [search, setSearch] = useState("");
	const fetchedRef = useRef(false);
	const inputRef = useRef<HTMLInputElement>(null);
	const searchRef = useCallback((el: HTMLInputElement | null) => {
		if (el) el.focus();
	}, []);

	useEffect(() => {
		if (fetchedRef.current) return;
		fetchedRef.current = true;
		Promise.all([
			fetch("/api/modules/devices/device-types").then((r) => r.json()),
			fetch("/api/modules/devices/runtimes").then((r) => r.json()),
		])
			.then(([types, rts]) => {
				const filtered = (types.deviceTypes ?? types ?? []).filter(
					(t: DeviceType) => t.name.startsWith("iPhone") || t.name.startsWith("iPad"),
				);
				setDeviceTypes(filtered);
				const available = (rts.runtimes ?? rts ?? []).filter((r: SimRuntime) => r.isAvailable);
				setRuntimes(available);
			})
			.catch(() => {});
	}, []);

	useEffect(() => {
		if (phase === "name") inputRef.current?.focus();
	}, [phase]);

	const phases: Phase[] = ["name", "deviceType", "runtime"];
	const phaseLabels = { name: "Name", deviceType: "Device Type", runtime: "Runtime" };

	function handleNameSubmit() {
		if (!name.trim()) return;
		setPhase("deviceType");
		setSearch("");
	}

	function handleTypeSelect(dt: DeviceType) {
		setSelectedTypeId(dt.identifier);
		setSelectedTypeName(dt.name);
		setPhase("runtime");
		setSearch("");
	}

	function handleRuntimeSelect(rt: SimRuntime) {
		onSelect({
			name: name.trim(),
			deviceTypeId: selectedTypeId,
			runtimeId: rt.identifier,
			deviceTypeName: selectedTypeName,
		});
	}

	const query = search.toLowerCase().trim();

	return (
		<div>
			<div className="flex items-center gap-2 px-3 py-2 text-xs text-text-muted">
				{phases.map((p, i) => (
					<span key={p} className="flex items-center gap-1.5">
						{i > 0 && <span className="text-text-muted/50">&rarr;</span>}
						<span
							className={
								p === phase
									? "text-text-primary font-medium"
									: phases.indexOf(p) < phases.indexOf(phase)
										? "text-accent-blue"
										: "text-text-muted"
							}
						>
							{phaseLabels[p]}
						</span>
					</span>
				))}
			</div>

			{phase === "name" && (
				<div className="px-3 py-4">
					<input
						ref={inputRef}
						type="text"
						value={name}
						onChange={(e) => setName(e.target.value)}
						onKeyDown={(e) => {
							if (e.key === "Enter") {
								e.preventDefault();
								handleNameSubmit();
							}
						}}
						placeholder="Simulator name (e.g., My iPhone)"
						className="w-full bg-white/5 border border-glass-border rounded-lg px-3 py-2 text-sm text-text-primary placeholder:text-text-muted outline-none focus:border-accent-blue"
					/>
					<p className="text-[10px] text-text-muted mt-2 px-1">Press Enter to continue</p>
				</div>
			)}

			{phase === "deviceType" && (
				<>
					<div className="px-3 pt-2 pb-1">
						<input
							ref={searchRef}
							type="text"
							value={search}
							onChange={(e) => setSearch(e.target.value)}
							placeholder="Search device types..."
							className="w-full bg-white/5 border border-glass-border rounded-lg px-3 py-1.5 text-sm text-text-primary placeholder:text-text-muted outline-none focus:border-accent-blue"
						/>
					</div>
					<Command.Group heading="Device Types">
						{deviceTypes
							.filter((dt) => !query || dt.name.toLowerCase().includes(query))
							.map((dt) => (
								<Command.Item
									key={dt.identifier}
									value={dt.name}
									onSelect={() => handleTypeSelect(dt)}
								>
									<div className="cmdk-item-text">
										<span>{dt.name}</span>
										<span className="cmdk-item-description">{dt.identifier}</span>
									</div>
								</Command.Item>
							))}
					</Command.Group>
				</>
			)}

			{phase === "runtime" && (
				<>
					<div className="px-3 pt-2 pb-1">
						<input
							ref={searchRef}
							type="text"
							value={search}
							onChange={(e) => setSearch(e.target.value)}
							placeholder="Search runtimes..."
							className="w-full bg-white/5 border border-glass-border rounded-lg px-3 py-1.5 text-sm text-text-primary placeholder:text-text-muted outline-none focus:border-accent-blue"
						/>
					</div>
					<Command.Group heading="Runtimes">
						{runtimes
							.filter((rt) => !query || rt.name.toLowerCase().includes(query))
							.map((rt) => (
								<Command.Item
									key={rt.identifier}
									value={rt.name}
									onSelect={() => handleRuntimeSelect(rt)}
								>
									<div className="cmdk-item-text">
										<span>{rt.name}</span>
										<span className="cmdk-item-description">{rt.identifier}</span>
									</div>
								</Command.Item>
							))}
					</Command.Group>
				</>
			)}
		</div>
	);
}
