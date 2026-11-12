import { z } from "zod";
import { PASSWORD_MIN_LENGTH } from "@/shared/constants";

export const loginRequestSchema = z.object({ email: z.string(), password: z.string().min(1) });

/** Stored trimmed and lower-cased (AU4), so a duplicate in any case is the same email. */
export const emailSchema = z.string().trim().toLowerCase().pipe(z.email());

export const newPasswordSchema = z.string().min(PASSWORD_MIN_LENGTH);

/** Change password (AU8): the current password, the new one twice. Length and match are checked by the service. */
export const changePasswordRequestSchema = z.object({
  current: z.string(),
  new: z.string(),
  confirm: z.string(),
});
