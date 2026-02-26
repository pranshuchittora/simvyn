import { Database, Table } from "lucide-react";
import { type DbInfo, type TableInfo, useDbStore } from "./stores/db-store";

interface DatabaseBrowserProps {
	deviceId: string;
	bundleId: string;
}

function formatSize(bytes: number) {
	if (!bytes) return "";
	if (bytes < 1024) return `${bytes} B`;
	if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
	return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function DatabaseBrowser({ deviceId, bundleId }: DatabaseBrowserProps) {
	const databases = useDbStore((s) => s.databases);
	const selectedDb = useDbStore((s) => s.selectedDb);
	const tables = useDbStore((s) => s.tables);
	const selectedTable = useDbStore((s) => s.selectedTable);
	const fetchTables = useDbStore((s) => s.fetchTables);
	const fetchTableData = useDbStore((s) => s.fetchTableData);

	const handleDbClick = (db: DbInfo) => {
		fetchTables(deviceId, bundleId, db.path);
	};

	const handleTableClick = (table: TableInfo) => {
		if (!selectedDb) return;
		fetchTableData(deviceId, bundleId, selectedDb, table.name);
	};

	return (
		<div className="flex flex-col gap-1 h-full overflow-y-auto pr-1">
			<div className="text-[11px] text-text-muted uppercase tracking-wider px-2 py-1 font-medium">
				Databases
			</div>

			{databases.length === 0 && (
				<div className="glass-empty-state py-4 text-xs">No databases found</div>
			)}

			{databases.map((db) => (
				<div key={db.path}>
					<button
						type="button"
						onClick={() => handleDbClick(db)}
						className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-left text-xs transition-colors ${
							selectedDb === db.path
								? "bg-accent-blue/15 text-accent-blue"
								: "text-text-secondary hover:text-text-primary hover:bg-white/[0.03]"
						}`}
					>
						<Database size={14} className="shrink-0" />
						<span className="truncate">{db.name}</span>
						{db.size > 0 && (
							<span className="ml-auto text-[10px] text-text-muted shrink-0">
								{formatSize(db.size)}
							</span>
						)}
					</button>

					{selectedDb === db.path && tables.length > 0 && (
						<div className="ml-3 pl-3 border-l border-border/50 mt-1 flex flex-col gap-0.5">
							{tables.map((t) => (
								<button
									key={t.name}
									type="button"
									onClick={() => handleTableClick(t)}
									className={`w-full flex items-center gap-2 px-2 py-1 rounded-md text-left text-xs transition-colors ${
										selectedTable === t.name
											? "bg-accent-blue/10 text-accent-blue"
											: "text-text-secondary hover:text-text-primary hover:bg-white/[0.02]"
									}`}
								>
									<Table size={12} className="shrink-0" />
									<span className="truncate">{t.name}</span>
									<span className="glass-badge ml-auto text-[10px] text-text-muted shrink-0 bg-bg-surface/60">
										{t.rowCount}
									</span>
								</button>
							))}
						</div>
					)}
				</div>
			))}
		</div>
	);
}
