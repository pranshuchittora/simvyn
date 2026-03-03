interface UpdateResult {
	latest: string;
	needsUpdate: boolean;
}

function isNewer(latest: string, current: string): boolean {
	const l = latest.split(".").map(Number);
	const c = current.split(".").map(Number);
	for (let i = 0; i < 3; i++) {
		if ((l[i] ?? 0) > (c[i] ?? 0)) return true;
		if ((l[i] ?? 0) < (c[i] ?? 0)) return false;
	}
	return false;
}

export async function checkForUpdate(currentVersion: string): Promise<UpdateResult | null> {
	try {
		const controller = new AbortController();
		const timeout = setTimeout(() => controller.abort(), 3000);
		const res = await fetch("https://registry.npmjs.org/simvyn/latest", {
			signal: controller.signal,
		});
		clearTimeout(timeout);
		if (!res.ok) return null;
		const data = (await res.json()) as { version: string };
		const latest = data.version;
		return { latest, needsUpdate: isNewer(latest, currentVersion) };
	} catch {
		return null;
	}
}
