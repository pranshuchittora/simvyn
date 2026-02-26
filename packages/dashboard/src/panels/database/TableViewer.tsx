import { ArrowDown, ArrowUp, ChevronLeft, ChevronRight } from "lucide-react";
import { useState } from "react";
import { useDbStore } from "./stores/db-store";

interface TableViewerProps {
	deviceId: string;
	bundleId: string;
}

const TYPE_COLORS: Record<string, string> = {
	TEXT: "bg-accent-blue/15 text-accent-blue border-accent-blue/25",
	INTEGER: "bg-green-500/15 text-green-400 border-green-500/25",
	REAL: "bg-amber-500/15 text-amber-400 border-amber-500/25",
	BLOB: "bg-purple-500/15 text-purple-400 border-purple-500/25",
	NUMERIC: "bg-cyan-500/15 text-cyan-400 border-cyan-500/25",
};

export default function TableViewer({ deviceId, bundleId }: TableViewerProps) {
	const tableData = useDbStore((s) => s.tableData);
	const selectedDb = useDbStore((s) => s.selectedDb);
	const selectedTable = useDbStore((s) => s.selectedTable);
	const tables = useDbStore((s) => s.tables);
	const page = useDbStore((s) => s.page);
	const pageSize = useDbStore((s) => s.pageSize);
	const orderBy = useDbStore((s) => s.orderBy);
	const orderDir = useDbStore((s) => s.orderDir);
	const fetchTableData = useDbStore((s) => s.fetchTableData);
	const updateCell = useDbStore((s) => s.updateCell);
	const setPageSize = useDbStore((s) => s.setPageSize);

	const [editingCell, setEditingCell] = useState<{ rowIdx: number; col: string } | null>(null);
	const [editValue, setEditValue] = useState("");

	if (!tableData || !selectedTable) {
		return (
			<div className="flex items-center justify-center h-full text-text-secondary text-sm">
				Select a table to view data
			</div>
		);
	}

	const tableSchema = tables.find((t) => t.name === selectedTable);
	const { rows, columns, total } = tableData;
	const totalPages = Math.ceil(total / pageSize);
	const startRow = page * pageSize + 1;
	const endRow = Math.min((page + 1) * pageSize, total);

	const handleSort = (col: string) => {
		if (!selectedDb) return;
		if (orderBy === col) {
			if (orderDir === "ASC") {
				fetchTableData(deviceId, bundleId, selectedDb, selectedTable, 0, col, "DESC");
			} else {
				fetchTableData(deviceId, bundleId, selectedDb, selectedTable, 0, null);
			}
		} else {
			fetchTableData(deviceId, bundleId, selectedDb, selectedTable, 0, col, "ASC");
		}
	};

	const handlePageChange = (newPage: number) => {
		if (!selectedDb) return;
		fetchTableData(deviceId, bundleId, selectedDb, selectedTable, newPage, orderBy, orderDir);
	};

	const handlePageSizeChange = (size: number) => {
		if (!selectedDb) return;
		setPageSize(size);
		fetchTableData(deviceId, bundleId, selectedDb, selectedTable, 0, orderBy, orderDir);
	};

	const handleDoubleClick = (rowIdx: number, col: string, value: unknown) => {
		setEditingCell({ rowIdx, col });
		setEditValue(value == null ? "" : String(value));
	};

	const handleEditSave = () => {
		if (!editingCell || !selectedDb) return;
		const row = rows[editingCell.rowIdx];
		const rowid = row.rowid;
		if (rowid == null) return;
		const parsed =
			editValue === "" ? null : isNaN(Number(editValue)) ? editValue : Number(editValue);
		updateCell(deviceId, bundleId, selectedDb, selectedTable, rowid, editingCell.col, parsed);
		setEditingCell(null);
	};

	const handleEditCancel = () => setEditingCell(null);

	const handleEditKeyDown = (e: React.KeyboardEvent) => {
		if (e.key === "Enter") handleEditSave();
		if (e.key === "Escape") handleEditCancel();
	};

	const colNames =
		columns.length > 0
			? columns.map((c: any) => (typeof c === "string" ? c : c.name))
			: rows.length > 0
				? Object.keys(rows[0]).filter((k) => k !== "rowid")
				: [];

	return (
		<div className="flex flex-col h-full">
			{/* Table */}
			<div className="flex-1 overflow-auto">
				<table className="glass-table">
					<thead className="sticky top-0 z-10" style={{ background: "var(--color-bg-surface)" }}>
						<tr>
							{colNames.map((col: string) => {
								const schema = tableSchema?.columns.find((c) => c.name === col);
								return (
									<th key={col}>
										<button
											type="button"
											onClick={() => handleSort(col)}
											className="flex items-center gap-1 hover:text-text-primary transition-colors"
										>
											{col}
											{schema && (
												<span
													className={`glass-badge text-[9px] ml-1 ${TYPE_COLORS[schema.type.toUpperCase()] || "bg-neutral-500/15 text-neutral-400 border-neutral-500/25"}`}
												>
													{schema.type}
												</span>
											)}
											{orderBy === col &&
												(orderDir === "ASC" ? <ArrowUp size={12} /> : <ArrowDown size={12} />)}
										</button>
									</th>
								);
							})}
						</tr>
					</thead>
					<tbody>
						{rows.map((row: any, rowIdx: number) => (
							<tr key={rowIdx}>
								{colNames.map((col: string) => {
									const value = row[col];
									const isEditing = editingCell?.rowIdx === rowIdx && editingCell?.col === col;

									if (isEditing) {
										return (
											<td key={col}>
												<input
													autoFocus
													value={editValue}
													onChange={(e) => setEditValue(e.target.value)}
													onKeyDown={handleEditKeyDown}
													onBlur={handleEditSave}
													className="glass-input w-full text-xs py-0.5 px-1.5"
												/>
											</td>
										);
									}

									return (
										<td
											key={col}
											onDoubleClick={() => handleDoubleClick(rowIdx, col, value)}
											className={`text-xs cursor-default ${
												value == null
													? "text-text-muted italic"
													: typeof value === "number"
														? "text-text-primary text-right font-mono"
														: typeof value === "boolean"
															? "text-accent-blue"
															: "text-text-secondary"
											}`}
										>
											{value == null
												? "NULL"
												: typeof value === "boolean"
													? String(value)
													: String(value)}
										</td>
									);
								})}
							</tr>
						))}
					</tbody>
				</table>
			</div>

			{/* Pagination */}
			<div className="flex items-center justify-between border-t border-border px-3 py-2 text-xs text-text-secondary shrink-0">
				<span>
					Rows {startRow}-{endRow} of {total}
				</span>
				<div className="flex items-center gap-3">
					<select
						value={pageSize}
						onChange={(e) => handlePageSizeChange(Number(e.target.value))}
						className="glass-select text-xs"
					>
						{[25, 50, 100].map((s) => (
							<option key={s} value={s}>
								{s} rows
							</option>
						))}
					</select>
					<div className="flex items-center gap-1">
						<button
							type="button"
							disabled={page === 0}
							onClick={() => handlePageChange(page - 1)}
							className="glass-button p-1"
						>
							<ChevronLeft size={14} />
						</button>
						<span className="px-2">
							{page + 1} / {totalPages || 1}
						</span>
						<button
							type="button"
							disabled={page >= totalPages - 1}
							onClick={() => handlePageChange(page + 1)}
							className="glass-button p-1"
						>
							<ChevronRight size={14} />
						</button>
					</div>
				</div>
			</div>
		</div>
	);
}
