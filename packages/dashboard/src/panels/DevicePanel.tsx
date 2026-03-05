import type { Device } from "@simvyn/types";
import { Copy, Pencil, Plus, ShieldCheck, Star, Trash2, Upload, X } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { useWsListener } from "../hooks/use-ws";
import { useDeviceStore } from "../stores/device-store";
import { useFavouriteStore } from "../stores/favourite-store";
import { registerPanel } from "../stores/panel-registry";

type ActionState = { deviceId: string; action: string } | null;

interface DeviceType {
	name: string;
	identifier: string;
}

interface SimRuntime {
	name: string;
	identifier: string;
	isAvailable: boolean;
}

function DevicePanel() {
	const devices = useDeviceStore((s) => s.devices);
	const setDevices = useDeviceStore((s) => s.setDevices);
	const [actionInFlight, setActionInFlight] = useState<ActionState>(null);
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		fetch("/api/modules/devices/list")
			.then((res) => res.json())
			.then((data: { devices: Device[] }) => setDevices(data.devices))
			.catch(() => {});
	}, [setDevices]);

	const handleDeviceList = useCallback(
		(payload: unknown) => setDevices(payload as Device[]),
		[setDevices],
	);
	useWsListener("devices", "device-list", handleDeviceList);

	async function doAction(deviceId: string, action: string) {
		if (
			action === "erase" &&
			!confirm("Are you sure you want to erase this device? All data will be lost.")
		) {
			return;
		}
		setActionInFlight({ deviceId, action });
		setError(null);
		try {
			const res = await fetch(`/api/modules/devices/${action}`, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ deviceId }),
			});
			if (!res.ok) {
				const data = await res.json().catch(() => ({ error: "Unknown error" }));
				setError(data.error || "Action failed");
			}
		} catch {
			setError("Network error");
		} finally {
			setActionInFlight(null);
		}
	}

	async function handleClone(device: Device) {
		const newName = window.prompt("New name for clone:", `${device.name} Copy`);
		if (!newName) return;
		setActionInFlight({ deviceId: device.id, action: "clone" });
		try {
			const res = await fetch("/api/modules/devices/clone", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ deviceId: device.id, newName }),
			});
			if (res.ok) toast.success("Simulator cloned");
			else toast.error("Clone failed");
		} catch {
			toast.error("Clone failed");
		} finally {
			setActionInFlight(null);
		}
	}

	async function handleRename(device: Device) {
		const newName = window.prompt("New name:", device.name);
		if (!newName || newName === device.name) return;
		setActionInFlight({ deviceId: device.id, action: "rename" });
		try {
			const res = await fetch("/api/modules/devices/rename", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ deviceId: device.id, newName }),
			});
			if (res.ok) toast.success("Simulator renamed");
			else toast.error("Rename failed");
		} catch {
			toast.error("Rename failed");
		} finally {
			setActionInFlight(null);
		}
	}

	async function handleDelete(device: Device) {
		if (!window.confirm("Delete simulator permanently? This cannot be undone.")) return;
		setActionInFlight({ deviceId: device.id, action: "delete" });
		try {
			const res = await fetch("/api/modules/devices/delete", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ deviceId: device.id }),
			});
			if (res.ok) toast.success("Simulator deleted");
			else toast.error("Delete failed");
		} catch {
			toast.error("Delete failed");
		} finally {
			setActionInFlight(null);
		}
	}

	async function handleRefresh() {
		try {
			const res = await fetch("/api/modules/devices/refresh", { method: "POST" });
			if (res.ok) {
				const data = await res.json();
				setDevices(data.devices);
			}
		} catch {}
	}

	const favouriteIds = useFavouriteStore((s) => s.favouriteIds);
	const favouriteDevices = devices.filter((d) => favouriteIds.has(d.id));

	const iosDevices = devices.filter((d) => d.platform === "ios");
	const androidDevices = devices.filter((d) => d.platform === "android");

	return (
		<div className="p-6 space-y-6">
			<div className="flex items-center justify-between">
				<h1 className="text-base font-medium text-text-primary">Device Management</h1>
				<button type="button" onClick={handleRefresh} className="glass-button">
					Refresh
				</button>
			</div>

			{error && (
				<div className="rounded-[var(--radius-button)] bg-red-900/40 border border-red-500/30 px-4 py-2 text-sm text-red-300">
					{error}
					<button
						type="button"
						onClick={() => setError(null)}
						className="ml-2 text-red-400 hover:text-red-200"
					>
						&times;
					</button>
				</div>
			)}

			{devices.length === 0 && (
				<div className="glass-empty-state">
					<p className="text-base font-medium text-text-primary mb-2">No Devices Detected</p>
					<p className="text-sm text-text-secondary">
						Make sure Xcode Simulator or Android Emulator tools are installed.
					</p>
				</div>
			)}

			{favouriteDevices.length > 0 && (
				<FavouritesSection
					devices={favouriteDevices}
					actionInFlight={actionInFlight}
					onAction={doAction}
					onClone={handleClone}
					onRename={handleRename}
					onDelete={handleDelete}
				/>
			)}

			{iosDevices.length > 0 && (
				<IosDeviceSection
					devices={iosDevices}
					actionInFlight={actionInFlight}
					onAction={doAction}
					onClone={handleClone}
					onRename={handleRename}
					onDelete={handleDelete}
				/>
			)}

			{androidDevices.length > 0 && (
				<DeviceSection
					title="Android Emulators"
					devices={androidDevices}
					actionInFlight={actionInFlight}
					onAction={doAction}
				/>
			)}

			{iosDevices.length > 0 && <KeychainSection devices={iosDevices} />}
		</div>
	);
}

// --- Create Simulator Form ---

function CreateSimulatorForm({ onCreated }: { onCreated: () => void }) {
	const [name, setName] = useState("");
	const [deviceTypes, setDeviceTypes] = useState<DeviceType[]>([]);
	const [runtimes, setRuntimes] = useState<SimRuntime[]>([]);
	const [selectedType, setSelectedType] = useState("");
	const [selectedRuntime, setSelectedRuntime] = useState("");
	const [creating, setCreating] = useState(false);
	const fetchedRef = useRef(false);

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
				if (filtered.length > 0) setSelectedType(filtered[0].identifier);

				const available = (rts.runtimes ?? rts ?? []).filter((r: SimRuntime) => r.isAvailable);
				setRuntimes(available);
				if (available.length > 0) setSelectedRuntime(available[0].identifier);
			})
			.catch(() => {});
	}, []);

	async function handleCreate() {
		if (!name.trim() || !selectedType || !selectedRuntime) return;
		setCreating(true);
		try {
			const res = await fetch("/api/modules/devices/create", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					name: name.trim(),
					deviceTypeId: selectedType,
					runtimeId: selectedRuntime,
				}),
			});
			if (res.ok) {
				toast.success("Simulator created");
				setName("");
				onCreated();
			} else {
				toast.error("Create failed");
			}
		} catch {
			toast.error("Create failed");
		} finally {
			setCreating(false);
		}
	}

	return (
		<div className="glass-panel p-4 space-y-3">
			<input
				type="text"
				value={name}
				onChange={(e) => setName(e.target.value)}
				placeholder="My iPhone 17 Pro"
				className="w-full bg-white/5 border border-glass-border rounded-lg px-3 py-2 text-sm text-text-primary placeholder:text-text-muted outline-none focus:border-accent-blue"
			/>
			<div className="grid grid-cols-2 gap-3">
				<select
					value={selectedType}
					onChange={(e) => setSelectedType(e.target.value)}
					className="bg-white/5 border border-glass-border rounded-lg px-3 py-2 text-sm text-text-primary outline-none"
				>
					{deviceTypes.map((dt) => (
						<option key={dt.identifier} value={dt.identifier}>
							{dt.name}
						</option>
					))}
				</select>
				<select
					value={selectedRuntime}
					onChange={(e) => setSelectedRuntime(e.target.value)}
					className="bg-white/5 border border-glass-border rounded-lg px-3 py-2 text-sm text-text-primary outline-none"
				>
					{runtimes.map((rt) => (
						<option key={rt.identifier} value={rt.identifier}>
							{rt.name}
						</option>
					))}
				</select>
			</div>
			<div className="flex gap-2">
				<button
					type="button"
					className="glass-button-primary"
					disabled={creating || !name.trim()}
					onClick={handleCreate}
				>
					{creating ? "Creating..." : "Create"}
				</button>
				<button type="button" className="glass-button" onClick={onCreated}>
					Cancel
				</button>
			</div>
		</div>
	);
}

// --- Favourites Section ---

function FavouritesSection({
	devices,
	actionInFlight,
	onAction,
	onClone,
	onRename,
	onDelete,
}: {
	devices: Device[];
	actionInFlight: ActionState;
	onAction: (deviceId: string, action: string) => void;
	onClone: (device: Device) => void;
	onRename: (device: Device) => void;
	onDelete: (device: Device) => void;
}) {
	return (
		<div>
			<div className="flex items-center gap-2 mb-3">
				<Star size={14} className="text-amber-400" fill="currentColor" />
				<h2 className="text-sm font-medium text-text-muted uppercase tracking-wider">Favourites</h2>
			</div>
			<div className="grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
				{devices.map((device) => (
					<DeviceCard
						key={device.id}
						device={device}
						isLoading={actionInFlight?.deviceId === device.id}
						loadingAction={
							actionInFlight?.deviceId === device.id ? actionInFlight.action : undefined
						}
						onAction={onAction}
						onClone={device.platform === "ios" ? () => onClone(device) : undefined}
						onRename={device.platform === "ios" ? () => onRename(device) : undefined}
						onDelete={device.platform === "ios" ? () => onDelete(device) : undefined}
						showLifecycleActions={device.platform === "ios"}
					/>
				))}
			</div>
		</div>
	);
}

// --- iOS Device Section with Create button ---

function IosDeviceSection({
	devices,
	actionInFlight,
	onAction,
	onClone,
	onRename,
	onDelete,
}: {
	devices: Device[];
	actionInFlight: ActionState;
	onAction: (deviceId: string, action: string) => void;
	onClone: (device: Device) => void;
	onRename: (device: Device) => void;
	onDelete: (device: Device) => void;
}) {
	const [showCreate, setShowCreate] = useState(false);

	return (
		<div>
			<div className="flex items-center justify-between mb-3">
				<h2 className="text-sm font-medium text-text-muted uppercase tracking-wider">
					iOS Simulators
				</h2>
				<button
					type="button"
					className="glass-button flex items-center gap-1.5 text-xs"
					onClick={() => setShowCreate(!showCreate)}
				>
					{showCreate ? <X size={14} /> : <Plus size={14} />}
					{showCreate ? "Close" : "Create Simulator"}
				</button>
			</div>

			{showCreate && <CreateSimulatorForm onCreated={() => setShowCreate(false)} />}

			<div className="grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 mt-3">
				{devices.map((device) => (
					<DeviceCard
						key={device.id}
						device={device}
						isLoading={actionInFlight?.deviceId === device.id}
						loadingAction={
							actionInFlight?.deviceId === device.id ? actionInFlight.action : undefined
						}
						onAction={onAction}
						onClone={() => onClone(device)}
						onRename={() => onRename(device)}
						onDelete={() => onDelete(device)}
						showLifecycleActions
					/>
				))}
			</div>
		</div>
	);
}

// --- Android/Generic Device Section ---

function DeviceSection({
	title,
	devices,
	actionInFlight,
	onAction,
}: {
	title: string;
	devices: Device[];
	actionInFlight: ActionState;
	onAction: (deviceId: string, action: string) => void;
}) {
	return (
		<div>
			<h2 className="text-sm font-medium text-text-muted uppercase tracking-wider mb-3">{title}</h2>
			<div className="grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
				{devices.map((device) => (
					<DeviceCard
						key={device.id}
						device={device}
						isLoading={actionInFlight?.deviceId === device.id}
						loadingAction={
							actionInFlight?.deviceId === device.id ? actionInFlight.action : undefined
						}
						onAction={onAction}
					/>
				))}
			</div>
		</div>
	);
}

// --- Keychain Section ---

function KeychainSection({ devices }: { devices: Device[] }) {
	const [selectedDeviceId, setSelectedDeviceId] = useState(
		() => devices.find((d) => d.state === "booted")?.id ?? devices[0]?.id ?? "",
	);
	const [certFile, setCertFile] = useState<File | null>(null);
	const [isRoot, setIsRoot] = useState(true);
	const [loading, setLoading] = useState<string | null>(null);
	const fileInputRef = useRef<HTMLInputElement>(null);

	async function handleAddCert() {
		if (!certFile || !selectedDeviceId) return;
		setLoading("add-cert");
		try {
			const buffer = await certFile.arrayBuffer();
			const bytes = new Uint8Array(buffer);
			let binary = "";
			for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
			const certBase64 = btoa(binary);
			const res = await fetch("/api/modules/devices/keychain/add-cert", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ deviceId: selectedDeviceId, certBase64, isRoot }),
			});
			if (res.ok) {
				toast.success("Certificate added");
				setCertFile(null);
				if (fileInputRef.current) fileInputRef.current.value = "";
			} else toast.error("Failed to add certificate");
		} catch {
			toast.error("Failed to add certificate");
		} finally {
			setLoading(null);
		}
	}

	async function handleResetKeychain() {
		if (!window.confirm("Reset keychain to defaults?")) return;
		setLoading("reset");
		try {
			const res = await fetch("/api/modules/devices/keychain/reset", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ deviceId: selectedDeviceId }),
			});
			if (res.ok) toast.success("Keychain reset");
			else toast.error("Reset failed");
		} catch {
			toast.error("Reset failed");
		} finally {
			setLoading(null);
		}
	}

	return (
		<div className="glass-panel p-4 space-y-4">
			<div className="flex items-center gap-2">
				<ShieldCheck size={18} className="text-accent-blue" />
				<h2 className="text-sm font-medium text-text-primary">SSL Certificates</h2>
			</div>
			<p className="text-xs text-text-secondary">
				Add root certificates for MITM proxy testing (mitmproxy, Charles Proxy)
			</p>

			<select
				value={selectedDeviceId}
				onChange={(e) => setSelectedDeviceId(e.target.value)}
				className="w-full bg-white/5 border border-glass-border rounded-lg px-3 py-2 text-sm text-text-primary outline-none"
			>
				{devices.map((d) => (
					<option key={d.id} value={d.id}>
						{d.name} ({d.state})
					</option>
				))}
			</select>

			<div className="flex items-center gap-3">
				<div className="flex-1">
					<input
						ref={fileInputRef}
						type="file"
						accept=".pem,.crt,.cer,.der,.p12"
						onChange={(e) => setCertFile(e.target.files?.[0] ?? null)}
						className="hidden"
					/>
					<button
						type="button"
						className="glass-button flex items-center gap-1.5 text-xs"
						onClick={() => fileInputRef.current?.click()}
					>
						<Upload size={14} />
						{certFile ? certFile.name : "Choose Certificate"}
					</button>
				</div>
				<label className="flex items-center gap-1.5 text-xs text-text-secondary cursor-pointer">
					<input
						type="checkbox"
						checked={isRoot}
						onChange={(e) => setIsRoot(e.target.checked)}
						className="rounded border-glass-border"
					/>
					Trust as root
				</label>
			</div>

			<div className="flex gap-2">
				<button
					type="button"
					className="glass-button-primary"
					disabled={!certFile || loading === "add-cert"}
					onClick={handleAddCert}
				>
					{loading === "add-cert" ? "Adding..." : "Add Certificate"}
				</button>
				<button
					type="button"
					className="glass-button-destructive"
					disabled={loading === "reset"}
					onClick={handleResetKeychain}
				>
					{loading === "reset" ? "Resetting..." : "Reset Keychain"}
				</button>
			</div>
		</div>
	);
}

// --- State Badge ---

function StateBadge({ state }: { state: Device["state"] }) {
	const styles: Record<string, { color: string; borderColor: string; bg: string }> = {
		booted: {
			color: "rgb(74, 222, 128)",
			borderColor: "rgba(34, 197, 94, 0.3)",
			bg: "rgba(34, 197, 94, 0.2)",
		},
		shutdown: {
			color: "rgb(163, 163, 163)",
			borderColor: "rgba(115, 115, 115, 0.3)",
			bg: "rgba(115, 115, 115, 0.2)",
		},
		"shutting-down": {
			color: "rgb(250, 204, 21)",
			borderColor: "rgba(234, 179, 8, 0.3)",
			bg: "rgba(234, 179, 8, 0.2)",
		},
		creating: {
			color: "rgb(96, 165, 250)",
			borderColor: "rgba(59, 130, 246, 0.3)",
			bg: "rgba(59, 130, 246, 0.2)",
		},
	};
	const label: Record<string, string> = {
		booted: "Booted",
		shutdown: "Shutdown",
		"shutting-down": "Shutting Down",
		creating: "Creating",
	};

	const s = styles[state] ?? styles.shutdown;

	return (
		<span
			className="glass-badge"
			style={{ color: s.color, borderColor: s.borderColor, background: s.bg }}
		>
			{label[state] ?? state}
		</span>
	);
}

// --- Device Card ---

function DeviceCard({
	device,
	isLoading,
	loadingAction,
	onAction,
	onClone,
	onRename,
	onDelete,
	showLifecycleActions,
}: {
	device: Device;
	isLoading: boolean;
	loadingAction?: string;
	onAction: (deviceId: string, action: string) => void;
	onClone?: () => void;
	onRename?: () => void;
	onDelete?: () => void;
	showLifecycleActions?: boolean;
}) {
	const isFav = useFavouriteStore((s) => s.isFavourite)(device.id);
	const toggleFavourite = useFavouriteStore((s) => s.toggle);

	const truncatedId =
		device.id.length > 16 ? `${device.id.slice(0, 8)}…${device.id.slice(-6)}` : device.id;

	return (
		<div className="glass-panel p-4 flex flex-col gap-3 hover:border-glass-border-hover transition-all duration-150">
			<div className="flex items-start justify-between gap-2">
				<div className="min-w-0 flex-1">
					<div className="font-medium text-text-primary truncate">{device.name}</div>
					<div className="text-xs text-text-muted mt-0.5 font-mono">{truncatedId}</div>
				</div>
				<button
					type="button"
					onClick={() => toggleFavourite(device.id)}
					className="shrink-0 mt-0.5"
					title={isFav ? "Remove from Favourites" : "Add to Favourites"}
				>
					<Star
						size={16}
						className={`transition-colors cursor-pointer ${
							isFav ? "text-amber-400 fill-amber-400" : "text-text-muted/40 hover:text-amber-400/60"
						}`}
						fill={isFav ? "currentColor" : "none"}
					/>
				</button>
				<StateBadge state={device.state} />
			</div>

			<div className="flex items-center gap-3 text-xs text-text-secondary">
				<span>
					{device.platform === "ios" ? "iOS" : "Android"} {device.osVersion}
				</span>
				<span className="text-text-muted">{device.deviceType}</span>
			</div>

			<div className="flex items-center gap-2 pt-1 border-t border-border flex-wrap">
				{device.state === "shutdown" && (
					<ActionButton
						label="Boot"
						loading={isLoading && loadingAction === "boot"}
						disabled={isLoading}
						onClick={() => onAction(device.id, "boot")}
						variant="primary"
					/>
				)}
				{device.state === "booted" && (
					<ActionButton
						label="Shutdown"
						loading={isLoading && loadingAction === "shutdown"}
						disabled={isLoading}
						onClick={() => onAction(device.id, "shutdown")}
						variant="default"
					/>
				)}
				{device.platform === "ios" && (
					<ActionButton
						label="Erase"
						loading={isLoading && loadingAction === "erase"}
						disabled={isLoading}
						onClick={() => onAction(device.id, "erase")}
						variant="destructive"
					/>
				)}
				{showLifecycleActions && (
					<>
						<button
							type="button"
							className="glass-button flex items-center gap-1 text-xs"
							disabled={isLoading}
							onClick={onClone}
							title="Clone"
						>
							{isLoading && loadingAction === "clone" ? (
								<span className="h-3 w-3 animate-spin rounded-full border-2 border-current border-t-transparent" />
							) : (
								<Copy size={13} />
							)}
							Clone
						</button>
						<button
							type="button"
							className="glass-button flex items-center gap-1 text-xs"
							disabled={isLoading}
							onClick={onRename}
							title="Rename"
						>
							{isLoading && loadingAction === "rename" ? (
								<span className="h-3 w-3 animate-spin rounded-full border-2 border-current border-t-transparent" />
							) : (
								<Pencil size={13} />
							)}
							Rename
						</button>
						{device.state === "shutdown" && (
							<button
								type="button"
								className="glass-button-destructive flex items-center gap-1 text-xs"
								disabled={isLoading}
								onClick={onDelete}
								title="Delete"
							>
								{isLoading && loadingAction === "delete" ? (
									<span className="h-3 w-3 animate-spin rounded-full border-2 border-current border-t-transparent" />
								) : (
									<Trash2 size={13} />
								)}
								Delete
							</button>
						)}
					</>
				)}
			</div>
		</div>
	);
}

// --- Action Button ---

function ActionButton({
	label,
	loading,
	disabled,
	onClick,
	variant,
}: {
	label: string;
	loading: boolean;
	disabled: boolean;
	onClick: () => void;
	variant: "primary" | "default" | "destructive";
}) {
	const variants: Record<string, string> = {
		primary: "glass-button-primary",
		default: "glass-button",
		destructive: "glass-button-destructive",
	};

	return (
		<button type="button" onClick={onClick} disabled={disabled} className={variants[variant]}>
			{loading ? (
				<span className="inline-flex items-center gap-1">
					<span className="h-3 w-3 animate-spin rounded-full border-2 border-current border-t-transparent" />
					{label}
				</span>
			) : (
				label
			)}
		</button>
	);
}

registerPanel("devices", DevicePanel);

export default DevicePanel;
