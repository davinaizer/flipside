import { z } from "zod";

export const envSchema = z.object({
  DATABASE_URL: z.string().min(1),
  /** The shared app password (AG1); the cookie signing key derives from it (AG2). */
  ADMIN_PASSWORD: z.string().min(1),
  IMAGE_STORE_DRIVER: z.enum(["fs", "vercel-blob"]).default("fs"),
  IMAGE_STORE_PATH: z.string().min(1).default("./data/images"),
  /** Optional: on Vercel the blob SDK authenticates with OIDC when this is unset. */
  BLOB_READ_WRITE_TOKEN: z.string().min(1).optional(),
  PORT: z.coerce.number().int().min(1).max(65535).default(3000),
});

export type Env = z.infer<typeof envSchema>;

export function parseEnv(source: Record<string, string | undefined>): Env {
  return envSchema.parse(source);
}

let cached: Env | undefined;
export function getEnv(): Env {
  if (cached) return cached;
  try {
    return (cached = parseEnv(process.env));
  } catch (e) {
    if (e instanceof z.ZodError) {
      const bad = e.issues.map((i) => i.path.join(".")).join(", ");
      throw new Error(
        `Invalid environment (${bad}). Copy .env.example to .env and start the database with pnpm db:up.`,
        { cause: e },
      );
    }
    throw e;
  }
}
