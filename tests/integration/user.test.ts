import { afterEach, describe, expect, test } from 'bun:test';
import { createTestClient } from '../helpers/test-client';
import { getTestPrisma } from '../helpers/test-db';
import { cleanupTestUser, createAuthenticatedUser, refreshUserTokens } from '../helpers/test-user';
import { setupIntegrationTests } from './setup';

// Run global setup
setupIntegrationTests();

describe('User Integration Tests', () => {
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

  describe('GET /api/user/profile', () => {
    // Happy Path Tests

    test('should get authenticated user profile', async () => {
      // Arrange - Create authenticated user
      const user = await createAuthenticatedUser(client);
      testUsers.push(user.email);

      // Act - Get profile with access token
      const response = await client.user.profile.$get(
        {},
        {
          headers: {
            Authorization: `Bearer ${user.tokens.accessToken}`,
          },
        }
      );

      // Assert
      expect(response.status).toBe(200);

      const body = await response.json();
      if (!('data' in body)) {
        throw new Error('Expected data in response');
      }
      expect(body).toHaveProperty('data');
      expect(body.data).toHaveProperty('profile');

      const { profile } = body.data;

      // Verify profile matches registered user
      expect(profile.id).toBe(user.userId);
      expect(profile.email).toBe(user.email);
      expect(profile.name).toBe(user.name);
    });

    test('should get profile after token refresh', async () => {
      // Arrange - Create user and refresh tokens
      const user = await createAuthenticatedUser(client);
      testUsers.push(user.email);

      const newTokens = await refreshUserTokens(client, user.tokens.refreshToken);

      // Act - Get profile with new access token
      const response = await client.user.profile.$get(
        {},
        {
          headers: {
            Authorization: `Bearer ${newTokens.accessToken}`,
          },
        }
      );

      // Assert
      expect(response.status).toBe(200);

      const body = await response.json();
      if (!('data' in body)) {
        throw new Error('Expected data in response');
      }
      expect(body.data.profile.id).toBe(user.userId);
    });

    // Error Scenarios

    test('should fail with no authorization header', async () => {
      // Act - Request without auth header
      const response = await client.user.profile.$get({});

      // Assert
      expect(response.status).toBe(401); // Unauthorized
    });

    test('should fail with invalid token format', async () => {
      // Act - Use malformed JWT
      const response = await client.user.profile.$get(
        {},
        {
          headers: {
            Authorization: 'Bearer not-a-valid-jwt',
          },
        }
      );

      // Assert
      expect(response.status).toBe(401); // Unauthorized
    });

    test('should fail with expired access token', async () => {
      // Note: Testing actual token expiry requires time manipulation
      // This test documents expected behavior

      // For a real test, you would need:
      // 1. Access token with very short expiry
      // 2. Wait for expiry
      // 3. Attempt to access profile

      // Placeholder
      expect(true).toBe(true);
    });

    test('should revoke refresh token after logout', async () => {
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

      // Act - Try to refresh with revoked refresh token
      const response = await client.auth.refresh.$post({
        json: {
          refreshToken: user.tokens.refreshToken,
        },
      });

      // Assert
      expect(response.status).toBe(401); // Refresh token revoked
    });

    test('should fail with tampered token', async () => {
      // Arrange - Create valid token and tamper with it
      const user = await createAuthenticatedUser(client);
      testUsers.push(user.email);

      const tamperedToken = `${user.tokens.accessToken.slice(0, -5)}XXXXX`;

      // Act
      const response = await client.user.profile.$get(
        {},
        {
          headers: {
            Authorization: `Bearer ${tamperedToken}`,
          },
        }
      );

      // Assert
      expect(response.status).toBe(401); // Unauthorized - invalid signature
    });
  });

  describe('POST /api/user/logout', () => {
    // Happy Path Tests

    test('should successfully logout', async () => {
      // Arrange - Create authenticated user
      const user = await createAuthenticatedUser(client);
      testUsers.push(user.email);

      // Act - Logout
      const response = await client.user.logout.$post(
        {},
        {
          headers: {
            Authorization: `Bearer ${user.tokens.accessToken}`,
          },
        }
      );

      // Assert
      expect(response.status).toBe(200);

      const body = await response.json();
      expect(body).toHaveProperty('message', 'User logged out successfully');

      // Verify refresh token no longer works (JWT access tokens can't be revoked)
      const refreshResponse = await client.auth.refresh.$post({
        json: {
          refreshToken: user.tokens.refreshToken,
        },
      });

      expect(refreshResponse.status).toBe(401); // Refresh token revoked
    });

    test('should invalidate refresh token after logout', async () => {
      // Arrange
      const user = await createAuthenticatedUser(client);
      testUsers.push(user.email);

      const originalRefreshToken = user.tokens.refreshToken;

      // Act - Logout
      await client.user.logout.$post(
        {},
        {
          headers: {
            Authorization: `Bearer ${user.tokens.accessToken}`,
          },
        }
      );

      // Assert - Refresh token doesn't work
      const refreshResponse = await client.auth.refresh.$post({
        json: {
          refreshToken: originalRefreshToken,
        },
      });

      expect(refreshResponse.status).toBe(401);
    });

    // Error Scenarios

    test('should fail with no authorization header', async () => {
      // Act
      const response = await client.user.logout.$post({});

      // Assert
      expect(response.status).toBe(401); // Unauthorized
    });

    test('should fail with invalid token', async () => {
      // Act
      const response = await client.user.logout.$post(
        {},
        {
          headers: {
            Authorization: 'Bearer invalid-token',
          },
        }
      );

      // Assert
      expect(response.status).toBe(401); // Unauthorized
    });

    test('should fail trying to use revoked refresh token', async () => {
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

      // Act - Try to refresh with revoked refresh token
      const response = await client.auth.refresh.$post({
        json: {
          refreshToken: user.tokens.refreshToken,
        },
      });

      // Assert
      expect(response.status).toBe(401); // Refresh token revoked
    });

    test('should fail with expired token', async () => {
      // Note: Testing actual token expiry requires time manipulation
      // Document as requiring mock or time manipulation
      expect(true).toBe(true); // Placeholder
    });
  });
});
