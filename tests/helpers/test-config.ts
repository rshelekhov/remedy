import { createConfig } from '../../src/config/config';

// Config is automatically loaded from config/.env.test when NODE_ENV=test
export const testConfig = createConfig(process.env);

// Test-specific constants
export const TEST_CONSTANTS = {
  SSO_STARTUP_TIMEOUT: 60000, // 60s for SSO to start
  DB_CONNECTION_TIMEOUT: 10000, // 10s for DB connection
  TEST_USER_EMAIL_DOMAIN: '@test.remedy.local',
  CLEANUP_WAIT: 1000, // 1s wait after cleanup
  DEFAULT_TEST_TIMEOUT: 30000, // 30s default timeout for tests
} as const;
