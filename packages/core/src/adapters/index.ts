import type { PlatformAdapter } from "@simvyn/types";
import { createAndroidAdapter } from "./android.js";
import { createIosAdapter } from "./ios.js";

export {
	createIosAdapter,
	isPhysicalDevice,
	stripPhysicalPrefix,
	getDevicectlStatus,
} from "./ios.js";
export type { DevicectlStatus } from "./ios.js";
export { createAndroidAdapter, isAndroidPhysical } from "./android.js";

export async function createAvailableAdapters(): Promise<PlatformAdapter[]> {
	const adapters = [createIosAdapter(), createAndroidAdapter()];
	const results: PlatformAdapter[] = [];

	for (const adapter of adapters) {
		if (await adapter.isAvailable()) {
			results.push(adapter);
		}
	}

	return results;
}
