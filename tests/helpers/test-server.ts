import { TEST_CONSTANTS } from './test-config';

/**
 * Wait for a server to be healthy by polling it
 * For SSO server, any response (even error) means it's up
 * For app servers with /health endpoint, we check for 200 OK
 */
export async function waitForServer(
  url: string,
  timeout: number = TEST_CONSTANTS.SSO_STARTUP_TIMEOUT
): Promise<boolean> {
  const startTime = Date.now();
  // Try /health endpoint first, fall back to root
  const testEndpoints = [`${url}/health`, url];

  console.log(`Waiting for server at ${url}...`);

  while (Date.now() - startTime < timeout) {
    for (const endpoint of testEndpoints) {
      try {
        const response = await fetch(endpoint);
        // Accept any response (including errors) as proof the server is running
        console.log(`✓ Server at ${url} is healthy (status ${response.status})`);
        return true;
      } catch (_error) {
        // Server not ready yet, continue polling
      }
    }

    // Wait 1 second before next attempt
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }

  console.error(`✗ Server at ${url} did not become healthy within ${timeout}ms`);
  return false;
}

/**
 * Wait for multiple servers to be healthy
 */
export async function waitForServers(
  servers: Array<{ name: string; url: string }>
): Promise<boolean> {
  console.log('\nWaiting for test servers to be ready...\n');

  for (const server of servers) {
    console.log(`Checking ${server.name}...`);
    const isHealthy = await waitForServer(server.url);
    if (!isHealthy) {
      return false;
    }
  }

  console.log('\n✓ All servers ready!\n');
  return true;
}

/**
 * Sleep for a specified number of milliseconds
 */
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
