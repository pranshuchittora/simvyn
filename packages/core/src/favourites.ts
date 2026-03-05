import { createModuleStorage } from "./storage.js";

const storage = createModuleStorage("favourites");
const KEY = "favourites";

export async function getFavourites(): Promise<string[]> {
	return (await storage.read<string[]>(KEY)) ?? [];
}

export async function addFavourite(id: string): Promise<void> {
	const favs = await getFavourites();
	if (favs.includes(id)) return;
	favs.push(id);
	favs.sort();
	await storage.write(KEY, favs);
}

export async function removeFavourite(id: string): Promise<void> {
	const favs = await getFavourites();
	const idx = favs.indexOf(id);
	if (idx === -1) return;
	favs.splice(idx, 1);
	await storage.write(KEY, favs);
}

export async function cleanupStaleFavourites(
	currentDeviceIds: string[],
	missCountMap: Map<string, number>,
	threshold = 3,
): Promise<string[]> {
	const favs = await getFavourites();
	const currentSet = new Set(currentDeviceIds);
	const toRemove: string[] = [];

	for (const id of favs) {
		if (currentSet.has(id)) {
			missCountMap.delete(id);
		} else {
			const count = (missCountMap.get(id) ?? 0) + 1;
			missCountMap.set(id, count);
			if (count > threshold) {
				toRemove.push(id);
			}
		}
	}

	if (toRemove.length > 0) {
		const cleaned = favs.filter((id) => !toRemove.includes(id));
		await storage.write(KEY, cleaned);
		for (const id of toRemove) {
			missCountMap.delete(id);
		}
		return cleaned;
	}

	return favs;
}
