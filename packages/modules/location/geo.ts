const EARTH_RADIUS = 6371000; // meters

export function haversine(lat1: number, lon1: number, lat2: number, lon2: number): number {
	const toRad = (deg: number) => (deg * Math.PI) / 180;
	const dLat = toRad(lat2 - lat1);
	const dLon = toRad(lon2 - lon1);
	const a =
		Math.sin(dLat / 2) ** 2 +
		Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
	return EARTH_RADIUS * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function interpolatePoint(
	p1: [number, number],
	p2: [number, number],
	fraction: number,
): [number, number] {
	return [p1[0] + (p2[0] - p1[0]) * fraction, p1[1] + (p2[1] - p1[1]) * fraction];
}

export function cumulativeDistances(route: [number, number][]): number[] {
	const dists: number[] = [0];
	for (let i = 1; i < route.length; i++) {
		const prev = route[i - 1];
		const curr = route[i];
		dists.push(dists[i - 1] + haversine(prev[0], prev[1], curr[0], curr[1]));
	}
	return dists;
}

export function interpolateAlongRoute(
	route: [number, number][],
	distances: number[],
	targetDistance: number,
): [number, number] {
	if (targetDistance <= 0) return route[0];
	if (targetDistance >= distances[distances.length - 1]) return route[route.length - 1];

	for (let i = 1; i < distances.length; i++) {
		if (distances[i] >= targetDistance) {
			const segLen = distances[i] - distances[i - 1];
			const frac = segLen === 0 ? 0 : (targetDistance - distances[i - 1]) / segLen;
			return interpolatePoint(route[i - 1], route[i], frac);
		}
	}

	return route[route.length - 1];
}
