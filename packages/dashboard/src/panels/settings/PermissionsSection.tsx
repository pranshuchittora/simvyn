import { RotateCcw, ShieldCheck, ShieldOff } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

interface Props {
	deviceId: string;
	platform: "ios" | "android";
	canReset: boolean;
}

interface AppOption {
	bundleId: string;
	name: string;
}

const IOS_PERMISSIONS = [
	"photos",
	"camera",
	"microphone",
	"contacts",
	"calendar",
	"reminders",
	"location",
	"motion",
	"health",
	"homekit",
	"siri",
	"speech",
	"media-library",
	"bluetooth-peripheral",
] as const;

const ANDROID_PERMISSIONS = [
	"CAMERA",
	"READ_CONTACTS",
	"RECORD_AUDIO",
	"ACCESS_FINE_LOCATION",
	"READ_CALENDAR",
	"READ_EXTERNAL_STORAGE",
	"SEND_SMS",
	"CALL_PHONE",
] as const;

export default function PermissionsSection({ deviceId, platform, canReset }: Props) {
	const [apps, setApps] = useState<AppOption[]>([]);
	const [selectedApp, setSelectedApp] = useState<string>("");
	const [selectedPermission, setSelectedPermission] = useState<string>("");

	const permissions = platform === "ios" ? IOS_PERMISSIONS : ANDROID_PERMISSIONS;

	useEffect(() => {
		fetch(`/api/modules/apps/list/${deviceId}`)
			.then((r) => r.json())
			.then((data) => {
				const appList = (data.apps || [])
					.filter((a: AppOption & { type: string }) => a.type === "user")
					.map((a: AppOption) => ({ bundleId: a.bundleId, name: a.name }));
				setApps(appList);
				if (appList.length > 0) setSelectedApp((prev) => prev || appList[0].bundleId);
			})
			.catch(() => setApps([]));
	}, [deviceId]);

	useEffect(() => {
		setSelectedPermission(permissions[0]);
	}, [permissions[0]]);

	const handleGrant = async () => {
		if (!selectedApp || !selectedPermission) return;
		try {
			const res = await fetch("/api/modules/device-settings/permission/grant", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ deviceId, bundleId: selectedApp, permission: selectedPermission }),
			});
			if (!res.ok) {
				const data = await res.json();
				throw new Error(data.error || "Failed to grant");
			}
			toast.success(`Granted ${selectedPermission} to ${selectedApp}`);
		} catch (err) {
			toast.error((err as Error).message);
		}
	};

	const handleRevoke = async () => {
		if (!selectedApp || !selectedPermission) return;
		try {
			const res = await fetch("/api/modules/device-settings/permission/revoke", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ deviceId, bundleId: selectedApp, permission: selectedPermission }),
			});
			if (!res.ok) {
				const data = await res.json();
				throw new Error(data.error || "Failed to revoke");
			}
			toast.success(`Revoked ${selectedPermission} from ${selectedApp}`);
		} catch (err) {
			toast.error((err as Error).message);
		}
	};

	const handleReset = async () => {
		if (!selectedApp) return;
		try {
			const res = await fetch("/api/modules/device-settings/permission/reset", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ deviceId, bundleId: selectedApp }),
			});
			if (!res.ok) {
				const data = await res.json();
				throw new Error(data.error || "Failed to reset");
			}
			toast.success(`Reset all permissions for ${selectedApp}`);
		} catch (err) {
			toast.error((err as Error).message);
		}
	};

	return (
		<div className="rounded-xl bg-bg-surface/10 border-b border-border p-4 space-y-3">
			<h2 className="text-sm font-medium text-text-secondary uppercase tracking-wide">
				Permissions
			</h2>

			<div className="space-y-2">
				<select
					value={selectedApp}
					onChange={(e) => setSelectedApp(e.target.value)}
					className="glass-select w-full"
				>
					<option value="">Select app</option>
					{apps.map((a) => (
						<option key={a.bundleId} value={a.bundleId}>
							{a.bundleId}
						</option>
					))}
				</select>

				<select
					value={selectedPermission}
					onChange={(e) => setSelectedPermission(e.target.value)}
					className="glass-select w-full"
				>
					<option value="">Select permission</option>
					{permissions.map((p) => (
						<option key={p} value={p}>
							{p}
						</option>
					))}
				</select>
			</div>

			<div className="flex items-center gap-2">
				<button
					type="button"
					onClick={handleGrant}
					disabled={!selectedApp || !selectedPermission}
					className="glass-button-primary flex items-center gap-1.5"
				>
					<ShieldCheck size={12} strokeWidth={1.8} />
					Grant
				</button>
				<button
					type="button"
					onClick={handleRevoke}
					disabled={!selectedApp || !selectedPermission}
					className="glass-button-destructive flex items-center gap-1.5"
				>
					<ShieldOff size={12} strokeWidth={1.8} />
					Revoke
				</button>
				{canReset && (
					<button
						type="button"
						onClick={handleReset}
						disabled={!selectedApp}
						className="glass-button-destructive flex items-center gap-1.5"
					>
						<RotateCcw size={12} strokeWidth={1.8} />
						Reset All
					</button>
				)}
			</div>
		</div>
	);
}
