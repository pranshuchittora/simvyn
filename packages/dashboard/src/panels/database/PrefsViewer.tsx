import { useState } from "react";
import { useDbStore } from "./stores/db-store";

const TYPE_BADGE_COLORS: Record<string, string> = {
	string: "bg-accent-blue/15 text-accent-blue border-accent-blue/25",
	int: "bg-green-500/15 text-green-400 border-green-500/25",
	long: "bg-green-500/15 text-green-400 border-green-500/25",
	float: "bg-amber-500/15 text-amber-400 border-amber-500/25",
	boolean: "bg-purple-500/15 text-purple-400 border-purple-500/25",
	set: "bg-cyan-500/15 text-cyan-400 border-cyan-500/25",
};

function CollapsibleValue({ value }: { value: unknown }) {
	const [expanded, setExpanded] = useState(false);

	if (typeof value === "object" && value !== null) {
		const json = JSON.stringify(value, null, 2);
		if (json.length > 80) {
			return (
				<div>
					<button
						type="button"
						onClick={() => setExpanded(!expanded)}
						className="text-accent-blue text-[11px] hover:underline"
					>
						{expanded ? "Collapse" : "Expand"} ({Array.isArray(value) ? `${(value as unknown[]).length} items` : "object"})
					</button>
					{expanded && (
						<pre className="mt-1 text-[11px] text-text-secondary font-mono whitespace-pre-wrap">{json}</pre>
					)}
				</div>
			);
		}
		return <span className="font-mono text-text-secondary">{json}</span>;
	}
	if (typeof value === "boolean") return <span className="text-purple-400">{String(value)}</span>;
	if (typeof value === "number") return <span className="text-green-400 font-mono">{value}</span>;
	return <span className="text-text-secondary">{String(value)}</span>;
}

export default function PrefsViewer() {
	const prefs = useDbStore((s) => s.prefs);
	const loading = useDbStore((s) => s.loading);

	if (loading) {
		return (
			<div className="flex items-center justify-center py-8 text-text-muted text-sm">
				<span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent mr-2" />
				Loading preferences...
			</div>
		);
	}

	if (!prefs) {
		return (
			<div className="flex items-center justify-center h-full text-text-secondary text-sm">
				No preferences found
			</div>
		);
	}

	// iOS: prefs = { platform: "ios", prefs: { key: value, ... } }
	if (prefs.platform === "ios") {
		const entries = Object.entries(prefs.prefs || {});
		if (entries.length === 0) {
			return <div className="p-4 text-sm text-text-secondary">No preferences found</div>;
		}
		return (
			<div className="glass-panel overflow-hidden">
				<table className="w-full text-sm">
					<thead>
						<tr className="border-b border-border text-left text-xs text-text-muted uppercase tracking-wider">
							<th className="px-4 py-2 font-medium">Key</th>
							<th className="px-4 py-2 font-medium">Value</th>
						</tr>
					</thead>
					<tbody>
						{entries.map(([key, value]) => (
							<tr key={key} className="border-b border-border/30 hover:bg-white/[0.02]">
								<td className="px-4 py-2 text-text-primary text-xs font-mono">{key}</td>
								<td className="px-4 py-2 text-xs">
									<CollapsibleValue value={value} />
								</td>
							</tr>
						))}
					</tbody>
				</table>
			</div>
		);
	}

	// Android: prefs = { platform: "android", prefs: [{ file, entries: [{ key, value, type }] }] }
	const files = prefs.prefs || [];
	if (files.length === 0) {
		return <div className="p-4 text-sm text-text-secondary">No preferences found</div>;
	}

	return (
		<div className="flex flex-col gap-4">
			{files.map((file: any) => (
				<div key={file.file} className="glass-panel overflow-hidden">
					<div className="px-4 py-2 border-b border-border text-xs text-text-primary font-medium font-mono">
						{file.file}
					</div>
					<table className="w-full text-sm">
						<thead>
							<tr className="border-b border-border text-left text-xs text-text-muted uppercase tracking-wider">
								<th className="px-4 py-2 font-medium">Key</th>
								<th className="px-4 py-2 font-medium">Value</th>
								<th className="px-4 py-2 font-medium">Type</th>
							</tr>
						</thead>
						<tbody>
							{(file.entries || []).map((entry: any) => (
								<tr key={entry.key} className="border-b border-border/30 hover:bg-white/[0.02]">
									<td className="px-4 py-2 text-text-primary text-xs font-mono">{entry.key}</td>
									<td className="px-4 py-2 text-xs">
										<CollapsibleValue value={entry.value} />
									</td>
									<td className="px-4 py-2">
										<span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-medium ${TYPE_BADGE_COLORS[entry.type] || "bg-neutral-500/15 text-neutral-400 border-neutral-500/25"}`}>
											{entry.type}
										</span>
									</td>
								</tr>
							))}
						</tbody>
					</table>
				</div>
			))}
		</div>
	);
}
