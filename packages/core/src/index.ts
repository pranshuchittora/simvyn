// adapters
export {
	createAndroidAdapter,
	createAvailableAdapters,
	createIosAdapter,
	isAndroidPhysical,
} from "./adapters/index.js";
export type { DeviceManager } from "./device-manager.js";
export { createDeviceManager } from "./device-manager.js";
// platform utils
export { hasBinary, isLinux, isMacOS } from "./platform.js";
export type { ProcessManager } from "./process-manager.js";
// services
export { createProcessManager } from "./process-manager.js";
export { createModuleStorage, getSimvynDir } from "./storage.js";
// verbose exec
export { setVerbose, verboseExec, verboseSpawn } from "./verbose-exec.js";
