import { create } from "zustand";
import { toast } from "sonner";

interface DbInfo {
	name: string;
	path: string;
	size: number;
}

interface TableInfo {
	name: string;
	columns: Array<{ name: string; type: string; notnull: number; pk: number }>;
	rowCount: number;
}

type QueryResult =
	| { type: "rows"; rows: any[]; columns: any[] }
	| { type: "run"; changes: number }
	| { type: "error"; message: string };

interface DbStore {
	databases: DbInfo[];
	selectedDb: string | null;
	tables: TableInfo[];
	selectedTable: string | null;
	tableData: { rows: any[]; columns: any[]; total: number } | null;
	queryResult: QueryResult | null;
	prefs: any | null;
	page: number;
	pageSize: number;
	orderBy: string | null;
	orderDir: "ASC" | "DESC";
	loading: boolean;
	activeTab: "tables" | "query" | "prefs";

	setActiveTab: (tab: "tables" | "query" | "prefs") => void;
	setPageSize: (size: number) => void;
	fetchDatabases: (deviceId: string, bundleId: string) => Promise<void>;
	fetchTables: (deviceId: string, bundleId: string, dbPath: string) => Promise<void>;
	fetchTableData: (
		deviceId: string,
		bundleId: string,
		dbPath: string,
		table: string,
		page?: number,
		orderBy?: string | null,
		orderDir?: "ASC" | "DESC",
	) => Promise<void>;
	runQuery: (deviceId: string, bundleId: string, dbPath: string, sql: string) => Promise<void>;
	updateCell: (
		deviceId: string,
		bundleId: string,
		dbPath: string,
		table: string,
		rowid: number,
		column: string,
		value: unknown,
	) => Promise<void>;
	fetchPrefs: (deviceId: string, bundleId: string) => Promise<void>;
	setSelectedTable: (table: string | null) => void;
}

export type { DbInfo, TableInfo, QueryResult };

export const useDbStore = create<DbStore>((set, get) => ({
	databases: [],
	selectedDb: null,
	tables: [],
	selectedTable: null,
	tableData: null,
	queryResult: null,
	prefs: null,
	page: 0,
	pageSize: 50,
	orderBy: null,
	orderDir: "ASC",
	loading: false,
	activeTab: "tables",

	setActiveTab: (tab) => set({ activeTab: tab }),
	setPageSize: (size) => set({ pageSize: size }),
	setSelectedTable: (table) => set({ selectedTable: table }),

	fetchDatabases: async (deviceId, bundleId) => {
		set({ loading: true });
		try {
			const res = await fetch(`/api/modules/database/databases/${deviceId}/${bundleId}`);
			if (!res.ok) {
				set({ loading: false });
				return;
			}
			const data = await res.json();
			set({ databases: data.databases, loading: false });
		} catch {
			set({ loading: false });
		}
	},

	fetchTables: async (deviceId, bundleId, dbPath) => {
		set({ loading: true, selectedDb: dbPath });
		try {
			const res = await fetch(
				`/api/modules/database/tables/${deviceId}/${bundleId}?db=${encodeURIComponent(dbPath)}`,
			);
			if (!res.ok) {
				set({ loading: false });
				return;
			}
			const data = await res.json();
			set({ tables: data.tables, loading: false, selectedTable: null, tableData: null });
		} catch {
			set({ loading: false });
		}
	},

	fetchTableData: async (
		deviceId,
		bundleId,
		dbPath,
		table,
		page = 0,
		orderBy = null,
		orderDir = "ASC",
	) => {
		const { pageSize } = get();
		set({ loading: true, selectedTable: table, page, orderBy, orderDir });
		try {
			const params = new URLSearchParams({
				db: dbPath,
				table,
				limit: String(pageSize),
				offset: String(page * pageSize),
			});
			if (orderBy) {
				params.set("orderBy", orderBy);
				params.set("orderDir", orderDir);
			}
			const res = await fetch(`/api/modules/database/table-data/${deviceId}/${bundleId}?${params}`);
			if (!res.ok) {
				set({ loading: false });
				return;
			}
			const data = await res.json();
			set({ tableData: data, loading: false });
		} catch {
			set({ loading: false });
		}
	},

	runQuery: async (deviceId, bundleId, dbPath, sql) => {
		set({ loading: true });
		try {
			const res = await fetch(`/api/modules/database/query/${deviceId}/${bundleId}`, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ db: dbPath, sql }),
			});
			const data = await res.json();
			if (!res.ok) {
				set({
					queryResult: { type: "error", message: data.error || "Query failed" },
					loading: false,
				});
				return;
			}
			if (data.rows) {
				set({
					queryResult: { type: "rows", rows: data.rows, columns: data.columns },
					loading: false,
				});
			} else {
				set({ queryResult: { type: "run", changes: data.changes ?? 0 }, loading: false });
			}
		} catch {
			set({ queryResult: { type: "error", message: "Network error" }, loading: false });
		}
	},

	updateCell: async (deviceId, bundleId, dbPath, table, rowid, column, value) => {
		try {
			const res = await fetch(`/api/modules/database/update-cell/${deviceId}/${bundleId}`, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ db: dbPath, table, rowid, column, value }),
			});
			if (!res.ok) {
				const data = await res.json().catch(() => ({ error: "Update failed" }));
				toast.error(data.error || "Update failed");
				return;
			}
			toast.success("Cell updated");
			const { page, orderBy, orderDir } = get();
			get().fetchTableData(deviceId, bundleId, dbPath, table, page, orderBy, orderDir);
		} catch {
			toast.error("Update failed");
		}
	},

	fetchPrefs: async (deviceId, bundleId) => {
		set({ loading: true });
		try {
			const res = await fetch(`/api/modules/database/prefs/${deviceId}/${bundleId}`);
			if (!res.ok) {
				set({ loading: false, prefs: null });
				return;
			}
			const data = await res.json();
			set({ prefs: data, loading: false });
		} catch {
			set({ loading: false, prefs: null });
		}
	},
}));
