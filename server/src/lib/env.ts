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
  MAIL_MAILER: z.preprocess(
    (value) => (value === "" ? undefined : value),
    z.literal("smtp").optional(),
  ),
  MAIL_HOST: optionalText,
  MAIL_PORT: z.preprocess(
    (value) => (value === "" ? undefined : value),
    z.coerce.number().int().positive().optional(),
  ),
  MAIL_USERNAME: optionalText,
  MAIL_PASSWORD: optionalText,
  MAIL_ENCRYPTION: z.preprocess(
    (value) => (value === "" ? undefined : value),
    z.enum(["tls", "ssl"]).optional(),
  ),
  MAIL_FROM_ADDRESS: z.preprocess(
    (value) => (value === "" ? undefined : value),
    z.string().email().optional(),
  ),
  MAIL_FROM_NAME: z.preprocess(
    (value) => (value === "" ? undefined : value),
    z.string().max(100).optional(),
  ),
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
}).refine((values) => {
  const mailSettings = [
    values.MAIL_MAILER,
    values.MAIL_HOST,
    values.MAIL_PORT,
    values.MAIL_USERNAME,
    values.MAIL_PASSWORD,
    values.MAIL_ENCRYPTION,
    values.MAIL_FROM_ADDRESS,
  ];
  return mailSettings.every((value) => value === undefined) ||
    mailSettings.every((value) => value !== undefined);
}, { message: "Configure all SMTP and sender settings together." });

export const env = envSchema.parse(process.env);
