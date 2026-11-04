import { z } from "zod";

export const loginRequestSchema = z.object({ password: z.string().min(1) });
