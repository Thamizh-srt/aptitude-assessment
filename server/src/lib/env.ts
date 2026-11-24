import "dotenv/config";
import { z } from "zod";

const optionalText = z.preprocess(
  (value) => (value === "" ? undefined : value),
  z.string().min(1).optional(),
);

const envSchema = z.object({
  MONGO_URI: z.string().min(1),
  PORT: z.coerce.number().int().positive().default(4000),
  CLIENT_ORIGIN: z.string().url().default("http://localhost:5173"),
  ADMIN_EMAIL: z.string().email(),
  ADMIN_PASSWORD: z.string().min(8),
  BREVO_API_KEY: optionalText,
  MAIL_FROM: z.preprocess(
    (value) => (value === "" ? undefined : value),
    z.string().email().optional(),
  ),
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
}).refine((values) => {
  return (values.BREVO_API_KEY === undefined) === (values.MAIL_FROM === undefined);
}, { message: "Configure BREVO_API_KEY and MAIL_FROM together." });

export const env = envSchema.parse(process.env);
