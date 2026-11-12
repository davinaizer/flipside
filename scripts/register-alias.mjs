import { registerHooks } from "node:module";
import { resolve } from "./alias-hooks.mjs";
// registerHooks (Node 22.15+) runs the hook in-thread; module.register() is deprecated.
registerHooks({ resolve });
