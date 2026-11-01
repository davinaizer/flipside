import { z } from "zod";

export const envSchema = z.object({
  DATABASE_URL: z.string().min(1),
  IMAGE_STORE_DRIVER: z.enum(["fs"]).default("fs"),
  IMAGE_STORE_PATH: z.string().min(1).default("./data/images"),
  PORT: z.coerce.number().int().min(1).max(65535).default(3000),
});

export type Env = z.infer<typeof envSchema>;

export function parseEnv(source: Record<string, string | undefined>): Env {
  return envSchema.parse(source);
}

let cached: Env | undefined;
export function getEnv(): Env {
  return (cached ??= parseEnv(process.env));
}
