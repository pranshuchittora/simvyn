export interface NominatimResult {
	displayName: string;
	lat: number;
	lon: number;
	type: string;
	importance: number;
}

const USER_AGENT = "simvyn/0.1.0";
let lastRequestTime = 0;

async function rateLimitedFetch(url: string): Promise<Response> {
	const now = Date.now();
	const wait = Math.max(0, 1000 - (now - lastRequestTime));
	if (wait > 0) {
		await new Promise((r) => setTimeout(r, wait));
	}
	lastRequestTime = Date.now();
	return fetch(url, { headers: { "User-Agent": USER_AGENT } });
}

function parseResult(item: any): NominatimResult {
	return {
		displayName: item.display_name ?? "",
		lat: parseFloat(item.lat),
		lon: parseFloat(item.lon),
		type: item.type ?? "",
		importance: parseFloat(item.importance) || 0,
	};
}

export function createNominatimProxy() {
	return {
		async search(query: string, limit?: number): Promise<NominatimResult[]> {
			const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=${limit ?? 5}`;
			const res = await rateLimitedFetch(url);
			if (!res.ok) return [];
			const data = (await res.json()) as any[];
			return data.map(parseResult);
		},

		async reverse(lat: number, lon: number): Promise<NominatimResult | null> {
			const url = `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json`;
			const res = await rateLimitedFetch(url);
			if (!res.ok) return null;
			const data = (await res.json()) as any;
			if (data.error) return null;
			return parseResult(data);
		},
	};
}
