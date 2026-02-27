import { FileDown, Loader2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

interface BugReportEntry {
	filename: string;
	downloadUrl: string;
	size: number;
}

async function apiPost(url: string, body: Record<string, unknown>) {
	const res = await fetch(url, {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify(body),
	});
	if (!res.ok) {
		const data = await res.json();
		throw new Error(data.error || "Request failed");
	}
	return res.json();
}

export default function BugReportsSection({ deviceId }: { deviceId: string }) {
	const [collecting, setCollecting] = useState(false);
	const [reports, setReports] = useState<BugReportEntry[]>([]);

	const collect = async () => {
		setCollecting(true);
		try {
			const data = await apiPost("/api/modules/device-settings/bugreport/collect", { deviceId });
			const entry: BugReportEntry = {
				filename: data.filename,
				downloadUrl: data.downloadUrl,
				size: data.size,
			};
			setReports((prev) => [entry, ...prev]);
			toast.success(`Bug report collected: ${entry.filename}`);
		} catch (err) {
			toast.error((err as Error).message);
		} finally {
			setCollecting(false);
		}
	};

	const formatSize = (bytes: number) => {
		if (bytes < 1024) return `${bytes} B`;
		if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
		return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
	};

	return (
		<div className="rounded-xl bg-bg-surface/10 border-b border-border p-4 space-y-3">
			<h2 className="text-sm font-medium text-text-secondary uppercase tracking-wide flex items-center gap-2">
				<FileDown size={14} />
				Bug Reports
			</h2>

			<button
				type="button"
				onClick={collect}
				disabled={collecting}
				className="glass-button-primary text-xs flex items-center gap-2"
			>
				{collecting && <Loader2 size={12} className="animate-spin" />}
				{collecting ? "Collecting... this may take several minutes" : "Collect Bug Report"}
			</button>

			{reports.length > 0 && (
				<div className="space-y-2">
					{reports.map((r) => (
						<div
							key={r.filename}
							className="flex items-center justify-between p-2 rounded-lg bg-bg-surface/5 border border-border/50"
						>
							<div className="text-xs">
								<p className="text-text-primary font-mono">{r.filename}</p>
								<p className="text-text-tertiary">{formatSize(r.size)}</p>
							</div>
							<a href={r.downloadUrl} download className="glass-button-primary text-xs">
								Download
							</a>
						</div>
					))}
				</div>
			)}
		</div>
	);
}
