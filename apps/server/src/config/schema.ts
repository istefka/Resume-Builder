import { z } from "zod";

export const configSchema = z.object({
  NODE_ENV: z.enum(["development", "production"]).default("production"),

  // Ports
  PORT: z.coerce.number().default(3000),

  // URLs
  PUBLIC_URL: z.string().url(),
  STORAGE_URL: z.string().url(),

  // Firebase Admin
  FIREBASE_SERVICE_ACCOUNT_PATH: z.string(),

  // Authentication Secrets
  ACCESS_TOKEN_SECRET: z.string(),
  REFRESH_TOKEN_SECRET: z.string(),

  // Browser
  CHROME_TOKEN: z.string(),
  CHROME_URL: z.string().url(),
  CHROME_IGNORE_HTTPS_ERRORS: z
    .string()
    .default("false")
    .transform((s) => s !== "false" && s !== "0"),

  // Mail Server
  MAIL_FROM: z.string().includes("@").optional().default("noreply@localhost"),
  SMTP_URL: z
    .string()
    .url()
    .refine((url) => url.startsWith("smtp://") || url.startsWith("smtps://"))
    .optional(),

  // Firebase Storage (configuration handled by Admin SDK)

  // Crowdin (Optional)
  CROWDIN_PROJECT_ID: z.coerce.number().optional(),
  CROWDIN_PERSONAL_TOKEN: z.string().optional(),

  // Feature Flags (Optional)
  DISABLE_SIGNUPS: z
    .string()
    .default("false")
    .transform((s) => s !== "false" && s !== "0"),
  DISABLE_EMAIL_AUTH: z
    .string()
    .default("false")
    .transform((s) => s !== "false" && s !== "0"),

  // GitHub (OAuth, Optional)
  GITHUB_CLIENT_ID: z.string().optional(),
  GITHUB_CLIENT_SECRET: z.string().optional(),
  GITHUB_CALLBACK_URL: z.string().url().optional(),

  // Google (OAuth, Optional)
  GOOGLE_CLIENT_ID: z.string().optional(),
  GOOGLE_CLIENT_SECRET: z.string().optional(),
  GOOGLE_CALLBACK_URL: z.string().url().optional(),

  // OpenID (Optional)
  VITE_OPENID_NAME: z.string().optional(),
  OPENID_AUTHORIZATION_URL: z.string().url().optional(),
  OPENID_CALLBACK_URL: z.string().url().optional(),
  OPENID_CLIENT_ID: z.string().optional(),
  OPENID_CLIENT_SECRET: z.string().optional(),
  OPENID_ISSUER: z.string().optional(),
  OPENID_SCOPE: z.string().optional(),
  OPENID_TOKEN_URL: z.string().url().optional(),
  OPENID_USER_INFO_URL: z.string().url().optional(),
});

export type Config = z.infer<typeof configSchema>;
