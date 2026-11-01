// Node resolve hook so scripts can import src/ files: maps "@/x" to src/x and adds .ts.
import { existsSync } from "node:fs";
import { fileURLToPath, pathToFileURL } from "node:url";
import { dirname, resolve as resolvePath } from "node:path";

const src = fileURLToPath(new URL("../src/", import.meta.url));

function withExt(path) {
  for (const c of [path, `${path}.ts`, `${path}/index.ts`]) {
    if (existsSync(c) && /\.ts$/.test(c)) return c;
  }
  return null;
}

export async function resolve(specifier, context, next) {
  let target = null;
  if (specifier.startsWith("@/")) target = withExt(resolvePath(src, specifier.slice(2)));
  else if (specifier.startsWith(".") && context.parentURL?.startsWith("file:")) {
    target = withExt(resolvePath(dirname(fileURLToPath(context.parentURL)), specifier));
  }
  if (target) return next(pathToFileURL(target).href, context);
  return next(specifier, context);
}
