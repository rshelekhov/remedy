import { hc } from 'hono/client';
import type { AppType } from '../../src/app';
import { testConfig } from './test-config';

/**
 * Create a type-safe Hono client for testing
 * This uses Hono's built-in client with full TypeScript support
 *
 * Modes:
 * - Docker: REMEDY_HOST=remedy (tests run in Docker container)
 * - Local: REMEDY_HOST=localhost (tests run on host machine)
 *
 * Note: The AppType is exported from apiRoutes (not the main app) to preserve
 * route types for the RPC client. The /api prefix is included in the base URL.
 */
export function createTestClient() {
  // Default to localhost for local development, override with REMEDY_HOST for Docker
  const host = process.env.REMEDY_HOST || 'localhost';
  return hc<AppType>(`http://${host}:${testConfig.port}/api`);
}

/**
 * Type alias for the test client
 */
export type TestClient = ReturnType<typeof createTestClient>;
