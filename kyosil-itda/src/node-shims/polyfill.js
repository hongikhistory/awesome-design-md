// Globals kordoc expects from Node. Imported before kordoc so they exist at module evaluation.
import { Buffer } from "buffer/index.js";
import CFB from "cfb";

globalThis.Buffer ??= Buffer;
globalThis.process ??= { env: {}, platform: "browser", versions: {}, cwd: () => "/", nextTick: (f, ...a) => queueMicrotask(() => f(...a)), emitWarning: () => {} };
globalThis.global ??= globalThis;
// kordoc loads the CommonJS "cfb" package through createRequire(); the shim returns this instance.
globalThis.__kordocCfb = CFB;
