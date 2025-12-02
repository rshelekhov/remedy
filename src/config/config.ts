import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { config as dotenvConfig } from 'dotenv';
import { z } from 'zod';

export const NODE_ENV = {
  DEV: 'development',
  PROD: 'production',
  LOCAL: 'local',
  TEST: 'test',
} as const;

// Load .env files only when:
// - Not in production (12-factor app pattern)
// - Not explicitly disabled (e.g., in Docker where env vars are already set)
if (process.env.SKIP_DOTENV_LOAD !== 'true' && process.env.NODE_ENV !== NODE_ENV.PROD) {
  const envFile = process.env.NODE_ENV === NODE_ENV.TEST ? '.env.test' : '.env.local';
  // Get the directory of this module file (ESM compatible)
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = dirname(__filename);
  const envPath = resolve(__dirname, '../../config', envFile);

  const result = dotenvConfig({ path: envPath, override: true });

  if (result.error) {
    console.warn(`Warning: Could not load ${envFile} from ${envPath}`);
  }
}
// In production and Docker, environment variables are provided by the deployment platform

const envSchema = z.object({
  NODE_ENV: z
    .enum([NODE_ENV.DEV, NODE_ENV.PROD, NODE_ENV.LOCAL, NODE_ENV.TEST])
    .default(NODE_ENV.DEV),
  PORT: z.string().default('3000'),
  DATABASE_URL: z.url(),
  SSO_CLIENT_ID: z.string(),
  SSO_API_URL: z.url(),
  SSO_EMAIL_VERIFICATION_URL: z.url(),
  SSO_PASSWORD_RESET_URL: z.url(),
  S3_ENDPOINT: z.url(),
  S3_BUCKET: z.string(),
  S3_ACCESS_KEY: z.string(),
  S3_SECRET_KEY: z.string(),
});

/**
 * Create and validate configuration from environment variables
 * @param env - Environment variables object (defaults to process.env)
 * @returns Validated configuration object
 */
export function createConfig(env: NodeJS.ProcessEnv = process.env) {
  try {
    const validated = envSchema.parse(env);

    return {
      isDev: validated.NODE_ENV === NODE_ENV.DEV,
      isProd: validated.NODE_ENV === NODE_ENV.PROD,
      isLocal: validated.NODE_ENV === NODE_ENV.LOCAL,
      isTest: validated.NODE_ENV === NODE_ENV.TEST,
      port: validated.PORT,
      sso: {
        apiUrl: validated.SSO_API_URL,
        clientId: validated.SSO_CLIENT_ID,
        emailVerificationUrl: validated.SSO_EMAIL_VERIFICATION_URL,
        passwordResetUrl: validated.SSO_PASSWORD_RESET_URL,
      },
      database: {
        url: validated.DATABASE_URL,
      },
      s3: {
        endpoint: validated.S3_ENDPOINT,
        bucket: validated.S3_BUCKET,
        accessKey: validated.S3_ACCESS_KEY,
        secretKey: validated.S3_SECRET_KEY,
      },
    };
  } catch (error) {
    // Validation error
    if (error instanceof z.ZodError) {
      console.error('Configuration validation failed:');
      console.error('');

      for (const issue of error.issues) {
        console.error(`  • ${issue.path.join('.')}: ${issue.message}`);
      }

      console.error('');
      console.error('Hint: Check your .env file or environment variables');
      process.exit(1);
    }

    // Unexpected error
    console.error('Failed to load configuration:', error);
    process.exit(1);
  }
}

export const config = createConfig();
