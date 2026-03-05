// adapters
export {
	createAndroidAdapter,
	createAvailableAdapters,
	createIosAdapter,
	getDevicectlStatus,
	isAndroidPhysical,
	isPhysicalDevice,
	stripPhysicalPrefix,
} from "./adapters/index.js";
export type { DevicectlStatus } from "./adapters/index.js";
export type { DeviceManager } from "./device-manager.js";
export { createDeviceManager } from "./device-manager.js";
// platform utils
export { hasBinary, isLinux, isMacOS } from "./platform.js";
export type { ProcessManager } from "./process-manager.js";
// services
export { createProcessManager } from "./process-manager.js";
export { createModuleStorage, getSimvynDir } from "./storage.js";
// favourites
export {
	addFavourite,
	cleanupStaleFavourites,
	getFavourites,
	removeFavourite,
} from "./favourites.js";
// verbose exec
export { setVerbose, verboseExec, verboseSpawn } from "./verbose-exec.js";
