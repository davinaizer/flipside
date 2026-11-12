import { z } from "zod";
import { PASSWORD_MIN_LENGTH } from "@/shared/constants";

export const loginRequestSchema = z.object({ password: z.string().min(1) });

/** Stored trimmed and lower-cased (AU4), so a duplicate in any case is the same email. */
export const emailSchema = z.string().trim().toLowerCase().pipe(z.email());

export const newPasswordSchema = z.string().min(PASSWORD_MIN_LENGTH);
