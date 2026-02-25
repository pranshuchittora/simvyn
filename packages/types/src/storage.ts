export interface ModuleStorage {
	read<T>(key: string): Promise<T | null>;
	write<T>(key: string, data: T): Promise<void>;
	delete(key: string): Promise<void>;
}
