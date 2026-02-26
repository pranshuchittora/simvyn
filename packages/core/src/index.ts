// adapters
export { createIosAdapter, createAndroidAdapter, createAvailableAdapters } from "./adapters/index.js";

// services
export { createProcessManager } from "./process-manager.js";
export type { ProcessManager } from "./process-manager.js";
export { createModuleStorage, getSimvynDir } from "./storage.js";
export { createDeviceManager } from "./device-manager.js";
export type { DeviceManager } from "./device-manager.js";

// platform utils
export { isMacOS, isLinux, hasBinary } from "./platform.js";
