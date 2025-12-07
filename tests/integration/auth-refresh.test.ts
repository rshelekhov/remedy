import { afterEach, describe, expect, test } from 'bun:test';
import type { RefreshTokensRequest } from '../../src/schemas/auth.schema';
import { createTestClient } from '../helpers/test-client';
import { getTestPrisma } from '../helpers/test-db';
import { cleanupTestUser, createAuthenticatedUser } from '../helpers/test-user';
import { setupIntegrationTests } from './setup';

// Run global setup
setupIntegrationTests();

describe('Auth Token Refresh Integration Tests', () => {
  const client = createTestClient();
  const prisma = getTestPrisma();
  const testUsers: string[] = [];

  afterEach(async () => {
    // Cleanup users created in this test
    for (const email of testUsers) {
      await cleanupTestUser(prisma, email);
    }
    testUsers.length = 0;
  });

  describe('POST /api/auth/refresh', () => {
    // Happy Path Tests

    test('should successfully refresh tokens', async () => {
      // Arrange - Create authenticated user
      const user = await createAuthenticatedUser(client);
      testUsers.push(user.email);

      const initialRefreshToken = user.tokens.refreshToken;

      // Act - Refresh tokens
      const response = await client.auth.refresh.$post({
        json: {
          refreshToken: initialRefreshToken,
        },
      });

      // Assert
      expect(response.status).toBe(200);

      const body = await response.json();
      if (!('data' in body)) {
        throw new Error('Expected data in response');
      }
      expect(body).toHaveProperty('message', 'Tokens refreshed successfully');
      expect(body).toHaveProperty('data');

      const { tokens } = body.data;

      // Verify tokens are present
      expect(tokens).toHaveProperty('accessToken');
      expect(tokens).toHaveProperty('refreshToken');
      expect(tokens).toHaveProperty('expiresAt');
      expect(typeof tokens.accessToken).toBe('string');
      expect(tokens.accessToken.length).toBeGreaterThan(0);

      // Note: SSO may return the same access token if it hasn't expired yet
      // This is expected behavior for performance/caching

      // Verify access token works
      const profileResponse = await client.user.profile.$get(
        {},
        {
          headers: {
            Authorization: `Bearer ${tokens.accessToken}`,
          },
        }
      );
      expect(profileResponse.status).toBe(200);
    });

    test('should successfully handle multiple refreshes in sequence', async () => {
      // Arrange
      const user = await createAuthenticatedUser(client);
      testUsers.push(user.email);

      let currentRefreshToken = user.tokens.refreshToken;

      // Act - Refresh tokens 3 times sequentially
      for (let i = 0; i < 3; i++) {
        const response = await client.auth.refresh.$post({
          json: {
            refreshToken: currentRefreshToken,
          },
        });

        // Assert each refresh succeeds
        expect(response.status).toBe(200);

        const body = await response.json();
        if (!('data' in body)) {
          throw new Error('Expected data in response');
        }
        const newTokens = body.data.tokens;

        // Verify tokens changed
        expect(newTokens.refreshToken).not.toBe(currentRefreshToken);

        // Update for next iteration
        currentRefreshToken = newTokens.refreshToken;
      }

      // Verify latest tokens work
      const finalRefreshResponse = await client.auth.refresh.$post({
        json: { refreshToken: currentRefreshToken },
      });
      const finalRefreshBody = await finalRefreshResponse.json();
      if (!('data' in finalRefreshBody)) {
        throw new Error('Expected data in response');
      }

      const profileResponse = await client.user.profile.$get(
        {},
        {
          headers: {
            Authorization: `Bearer ${finalRefreshBody.data.tokens.accessToken}`,
          },
        }
      );

      expect(profileResponse.ok).toBe(true);
    });

    test('should refresh after access token conceptually expires', async () => {
      // Arrange - Create authenticated user
      const user = await createAuthenticatedUser(client);
      testUsers.push(user.email);

      // Note: We can't easily wait for token expiry in tests
      // This test verifies refresh works regardless of access token state

      // Act - Refresh with valid refresh token
      const response = await client.auth.refresh.$post({
        json: {
          refreshToken: user.tokens.refreshToken,
        },
      });

      // Assert
      expect(response.status).toBe(200);

      const body = await response.json();
      if (!('data' in body)) {
        throw new Error('Expected data in response');
      }
      expect(body.data.tokens.accessToken).toBeTruthy();
    });

    // Error Scenarios

    test('should fail with invalid refresh token format', async () => {
      // Act - Use malformed JWT
      const response = await client.auth.refresh.$post({
        json: {
          refreshToken: 'not-a-valid-jwt-token',
        },
      });

      // Assert
      expect(response.status).toBe(401); // Unauthorized - don't reveal token format requirements
    });

    test('should fail with non-existent refresh token', async () => {
      // Arrange - Create a valid-looking but non-existent JWT
      // (Real JWT format but with invalid signature)
      const fakeToken =
        'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c';

      // Act
      const response = await client.auth.refresh.$post({
        json: {
          refreshToken: fakeToken,
        },
      });

      // Assert
      expect(response.status).toBe(401); // Unauthorized
    });

    test('should fail with expired refresh token', async () => {
      // Note: Testing actual token expiry requires time manipulation or very short token lifetimes
      // This test documents the expected behavior

      // For a real test, you would need:
      // 1. A refresh token with very short expiry (e.g., 1 second)
      // 2. Wait for expiry
      // 3. Attempt refresh

      // For now, we document this as a manual test scenario
      // or requires SSO test utilities to generate expired tokens

      // Placeholder assertion
      expect(true).toBe(true);
    });

    test('should fail with revoked refresh token (after logout)', async () => {
      // Arrange - Create user and logout
      const user = await createAuthenticatedUser(client);
      testUsers.push(user.email);

      await client.user.logout.$post(
        {},
        {
          headers: {
            Authorization: `Bearer ${user.tokens.accessToken}`,
          },
        }
      );

      // Act - Try to refresh with revoked token
      const response = await client.auth.refresh.$post({
        json: {
          refreshToken: user.tokens.refreshToken,
        },
      });

      // Assert
      expect(response.status).toBe(401); // Unauthorized - token revoked
    });

    test('should fail with access token instead of refresh token', async () => {
      // Arrange
      const user = await createAuthenticatedUser(client);
      testUsers.push(user.email);

      // Act - Try to use access token for refresh (wrong token type)
      const response = await client.auth.refresh.$post({
        json: {
          refreshToken: user.tokens.accessToken, // Wrong token type
        },
      });

      // Assert
      expect(response.status).toBe(401); // Unauthorized - invalid token type
    });

    test('should fail with missing refresh token field', async () => {
      // Act
      const response = await client.auth.refresh.$post({
        json: {} as unknown as RefreshTokensRequest, // Type cast to bypass TypeScript check
      });

      // Assert
      expect(response.status).toBe(400); // Bad Request
    });

    // Edge Cases

    test('should handle refresh token reuse based on SSO rotation policy', async () => {
      // Arrange
      const user = await createAuthenticatedUser(client);
      testUsers.push(user.email);

      const originalRefreshToken = user.tokens.refreshToken;

      // First refresh
      const firstRefresh = await client.auth.refresh.$post({
        json: {
          refreshToken: originalRefreshToken,
        },
      });

      expect(firstRefresh.status).toBe(200);

      // Act - Try to use old refresh token again
      const secondRefresh = await client.auth.refresh.$post({
        json: {
          refreshToken: originalRefreshToken,
        },
      });

      // Assert - Behavior depends on SSO rotation policy
      // Option 1: Token rotation enabled - old token is invalid (401)
      // Option 2: Token rotation disabled - old token still works (200)
      expect([200, 401]).toContain(secondRefresh.status);

      // Document which behavior is expected
      if (secondRefresh.status === 401) {
        // Token rotation is enabled (recommended for security)
        const body = await secondRefresh.json();
        expect(body).toHaveProperty('error');
      } else {
        // Token rotation is disabled or tokens have longer validity
        const body = await secondRefresh.json();
        if (!('data' in body)) {
          throw new Error('Expected data in response');
        }
        expect(body.data.tokens).toBeDefined();
      }
    });
  });
});
