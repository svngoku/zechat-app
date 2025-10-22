import { z } from "zod";

const envSchema = z.object({
  ZEROENTROPY_API_KEY: z
    .string()
    .min(1, "ZEROENTROPY_API_KEY is required")
    .describe("ZeroEntropy API key from https://dashboard.zeroentropy.dev/"),
  OPENAI_API_KEY: z
    .string()
    .min(1, "OPENAI_API_KEY is required")
    .describe("OpenAI API key for LLM provider"),
  ZEROENTROPY_COLLECTION_NAME: z
    .string()
    .optional()
    .default("animal-facts")
    .describe("Default collection name for ZeroEntropy searches"),
  NODE_ENV: z
    .enum(["development", "production", "test"])
    .optional()
    .default("development"),
});

export type Env = z.infer<typeof envSchema>;

let cachedEnv: Env | null = null;

/**
 * Validates and returns environment variables.
 * Caches the result after first validation.
 * Throws in development, logs warning in production.
 */
export function getEnv(): Env {
  if (cachedEnv) {
    return cachedEnv;
  }

  const result = envSchema.safeParse(process.env);

  if (!result.success) {
    const errors = result.error.flatten().fieldErrors;
    const errorMessage = Object.entries(errors)
      .map(([key, messages]) => `${key}: ${messages?.join(", ")}`)
      .join("\n");

    if (process.env.NODE_ENV === "development") {
      throw new Error(
        `Environment validation failed:\n${errorMessage}\n\nPlease check your .env.local file.`
      );
    } else {
      console.error("Environment validation failed:", errorMessage);
      // In production, we'll let individual API calls fail gracefully
      // rather than crashing the entire app
    }
  }

  cachedEnv = result.data as Env;
  return cachedEnv;
}

/**
 * Checks if environment is properly configured without throwing
 */
export function isEnvConfigured(): boolean {
  try {
    getEnv();
    return true;
  } catch {
    return false;
  }
}
