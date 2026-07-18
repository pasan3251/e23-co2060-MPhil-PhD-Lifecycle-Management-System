import { z } from "zod";

import { sanitizedEmail, sanitizedString, securePassword } from "@/lib/validation/schemas";

export const loginCredentialsSchema = z.object({
  email: sanitizedEmail,
  password: securePassword,
});

export const createSessionRequestSchema = z.object({
  idToken: sanitizedString.min(1, "Missing idToken."),
});
