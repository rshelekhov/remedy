import { afterAll, beforeAll } from 'bun:test';
import { TEST_CONSTANTS, testConfig } from '../helpers/test-config';
import { cleanupDatabase, disconnectTestDb, getTestPrisma } from '../helpers/test-db';
import { waitForServers } from '../helpers/test-server';

/**
 * Global setup for integration tests
 * Call this function at the top of each integration test file
 */
export function setupIntegrationTests() {
  beforeAll(
    async () => {
      console.log('Setting up integration tests...\n');

      // Wait for all services to be healthy
      const remedyHost = process.env.REMEDY_HOST || 'localhost';
      const allHealthy = await waitForServers([
        {
          name: 'SSO Server',
          url: testConfig.sso.apiUrl,
        },
        {
          name: 'Remedy App',
          url: `http://${remedyHost}:${testConfig.port}`,
        },
      ]);

      if (!allHealthy) {
        throw new Error('Not all services are healthy. Cannot run tests.');
      }

      // Ensure database is clean before tests
      const prisma = getTestPrisma();
      await cleanupDatabase(prisma);

      console.log('✓ Integration test setup complete!\n');
    },
    TEST_CONSTANTS.SSO_STARTUP_TIMEOUT + 10000 // 70s timeout for setup
  );

  afterAll(async () => {
    console.log('\nCleaning up after integration tests...');

    const prisma = getTestPrisma();
    await cleanupDatabase(prisma);
    await disconnectTestDb();

    console.log('✓ Integration test cleanup complete!');
  });
}
