import { createModuleStorage } from "@simvyn/core";

export interface SavedLocation {
	id: string;
	name: string;
	lat: number;
	lon: number;
	createdAt: number;
}

export interface SavedRoute {
	id: string;
	name: string;
	waypoints: [number, number][];
	createdAt: number;
}

export const locationStorage = createModuleStorage("location");

export async function getLocations(): Promise<SavedLocation[]> {
	return (await locationStorage.read<SavedLocation[]>("locations")) ?? [];
}

export async function saveLocation(loc: SavedLocation): Promise<void> {
	const all = await getLocations();
	all.push(loc);
	await locationStorage.write("locations", all);
}

export async function deleteLocation(id: string): Promise<void> {
	const all = await getLocations();
	await locationStorage.write(
		"locations",
		all.filter((l) => l.id !== id),
	);
}

export async function getRoutes(): Promise<SavedRoute[]> {
	return (await locationStorage.read<SavedRoute[]>("routes")) ?? [];
}

export async function saveRoute(route: SavedRoute): Promise<void> {
	const all = await getRoutes();
	all.push(route);
	await locationStorage.write("routes", all);
}

export async function deleteRoute(id: string): Promise<void> {
	const all = await getRoutes();
	await locationStorage.write(
		"routes",
		all.filter((r) => r.id !== id),
	);
}
