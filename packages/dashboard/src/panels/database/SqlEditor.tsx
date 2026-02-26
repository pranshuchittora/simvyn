import { Play } from "lucide-react";
import { useCallback, useState } from "react";
import { useDbStore } from "./stores/db-store";

interface SqlEditorProps {
	deviceId: string;
	bundleId: string;
}

export default function SqlEditor({ deviceId, bundleId }: SqlEditorProps) {
	const selectedDb = useDbStore((s) => s.selectedDb);
	const queryResult = useDbStore((s) => s.queryResult);
	const loading = useDbStore((s) => s.loading);
	const runQuery = useDbStore((s) => s.runQuery);

	const [sql, setSql] = useState("");
	const [history, setHistory] = useState<string[]>([]);

	const handleRun = useCallback(() => {
		if (!sql.trim() || !selectedDb) return;
		runQuery(deviceId, bundleId, selectedDb, sql.trim());
		setHistory((prev) => {
			const next = [sql.trim(), ...prev.filter((q) => q !== sql.trim())];
			return next.slice(0, 10);
		});
	}, [sql, selectedDb, deviceId, bundleId, runQuery]);

	const handleKeyDown = (e: React.KeyboardEvent) => {
		if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
			e.preventDefault();
			handleRun();
		}
	};

	if (!selectedDb) {
		return (
			<div className="glass-empty-state h-full flex items-center justify-center">
				Select a database first
			</div>
		);
	}

	return (
		<div className="flex flex-col gap-3 h-full">
			{/* Input */}
			<div className="flex flex-col gap-2">
				<div className="glass-panel overflow-hidden">
					<textarea
						value={sql}
						onChange={(e) => setSql(e.target.value)}
						onKeyDown={handleKeyDown}
						placeholder="SELECT * FROM ..."
						spellCheck={false}
						rows={4}
						className="glass-textarea"
					/>
				</div>
				<div className="flex items-center gap-2">
					<button
						type="button"
						onClick={handleRun}
						disabled={!sql.trim() || loading}
						className="glass-button-primary flex items-center gap-1.5"
					>
						<Play size={14} />
						Run
					</button>
					<span className="text-[11px] text-text-muted">Ctrl+Enter to execute</span>
				</div>
			</div>

			{/* History */}
			{history.length > 0 && (
				<div className="flex flex-wrap gap-1.5">
					{history.map((q, i) => (
						<button
							key={i}
							type="button"
							onClick={() => setSql(q)}
							className="glass-badge bg-bg-surface/60 px-2.5 py-0.5 text-[11px] text-text-muted hover:text-text-secondary truncate max-w-[200px] transition-colors cursor-pointer"
						>
							{q}
						</button>
					))}
				</div>
			)}

			{/* Results */}
			{queryResult && (
				<div className="flex-1 overflow-auto glass-panel">
					{queryResult.type === "error" && (
						<div className="p-4 text-sm text-red-400">{queryResult.message}</div>
					)}
					{queryResult.type === "run" && (
						<div className="p-4 text-sm text-text-secondary">
							{queryResult.changes} row{queryResult.changes !== 1 ? "s" : ""} affected
						</div>
					)}
					{queryResult.type === "rows" && (
						<table className="glass-table">
							<thead>
								<tr>
									{queryResult.columns.map((col: any) => (
										<th key={typeof col === "string" ? col : col.name}>
											{typeof col === "string" ? col : col.name}
										</th>
									))}
								</tr>
							</thead>
							<tbody>
								{queryResult.rows.map((row: any, i: number) => (
									<tr key={i}>
										{queryResult.columns.map((col: any) => {
											const name = typeof col === "string" ? col : col.name;
											const val = row[name];
											return (
												<td
													key={name}
													className={`text-xs ${val == null ? "text-text-muted italic" : "text-text-secondary"}`}
												>
													{val == null ? "NULL" : String(val)}
												</td>
											);
										})}
									</tr>
								))}
							</tbody>
						</table>
					)}
				</div>
			)}
		</div>
	);
}
