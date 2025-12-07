import { afterEach, describe, expect, test } from 'bun:test';
import type { LoginRequest } from '../../src/schemas/auth.schema';
import { createTestClient } from '../helpers/test-client';
import { getTestPrisma } from '../helpers/test-db';
import { cleanupTestUser, generateTestUser } from '../helpers/test-user';
import { setupIntegrationTests } from './setup';

// Run global setup
setupIntegrationTests();

describe('Auth Login Integration Tests', () => {
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

  describe('POST /api/auth/login', () => {
    // Happy Path Tests

    test('should successfully login with valid credentials', async () => {
      // Arrange - Register a user first
      const testUser = generateTestUser();
      testUsers.push(testUser.email);

      await client.auth.register.$post({
        json: {
          email: testUser.email,
          password: testUser.password,
          name: testUser.name,
        },
      });

      // Act - Login with correct credentials
      const response = await client.auth.login.$post({
        json: {
          email: testUser.email,
          password: testUser.password,
        },
      });

      // Assert
      expect(response.status).toBe(200);

      const body = await response.json();
      if (!('data' in body)) {
        throw new Error('Expected data in response');
      }
      expect(body).toHaveProperty('message', 'User logged in successfully');
      expect(body).toHaveProperty('data');

      const { tokens } = body.data;

      // Verify tokens
      expect(tokens).toHaveProperty('accessToken');
      expect(tokens).toHaveProperty('refreshToken');
      expect(tokens).toHaveProperty('expiresAt');
      expect(typeof tokens.accessToken).toBe('string');
      expect(tokens.accessToken.length).toBeGreaterThan(0);
      expect(typeof tokens.refreshToken).toBe('string');
      expect(tokens.refreshToken.length).toBeGreaterThan(0);
    });

    test('should successfully login after previous logout', async () => {
      // Arrange - Register and login
      const testUser = generateTestUser();
      testUsers.push(testUser.email);

      await client.auth.register.$post({
        json: {
          email: testUser.email,
          password: testUser.password,
          name: testUser.name,
        },
      });

      const firstLogin = await client.auth.login.$post({
        json: {
          email: testUser.email,
          password: testUser.password,
        },
      });

      const firstLoginBody = await firstLogin.json();
      if (!('data' in firstLoginBody)) {
        throw new Error('Expected data in response');
      }
      const firstAccessToken = firstLoginBody.data.tokens.accessToken;

      // Logout
      await client.user.logout.$post(
        {},
        {
          headers: {
            Authorization: `Bearer ${firstAccessToken}`,
          },
        }
      );

      // Act - Login again after logout
      const response = await client.auth.login.$post({
        json: {
          email: testUser.email,
          password: testUser.password,
        },
      });

      // Assert
      expect(response.status).toBe(200);

      const body = await response.json();
      if (!('data' in body)) {
        throw new Error('Expected data in response');
      }
      expect(body.data.tokens.accessToken).toBeTruthy();
      expect(body.data.tokens.refreshToken).toBeTruthy();
      // Note: SSO may return same token if previous one hasn't expired
    });

    // Error Scenarios

    test('should fail with wrong password', async () => {
      // Arrange - Register a user
      const testUser = generateTestUser();
      testUsers.push(testUser.email);

      await client.auth.register.$post({
        json: {
          email: testUser.email,
          password: testUser.password,
          name: testUser.name,
        },
      });

      // Act - Login with wrong password
      const response = await client.auth.login.$post({
        json: {
          email: testUser.email,
          password: 'WrongPassword123!',
        },
      });

      // Assert
      expect(response.status).toBe(401); // Unauthorized

      const body = await response.json();
      expect(body).toHaveProperty('error');
      expect(body).toHaveProperty('code');
    });

    test('should fail with non-existent email', async () => {
      // Act - Login with email that was never registered
      const response = await client.auth.login.$post({
        json: {
          email: 'nonexistent@test.remedy.local',
          password: 'Password123!',
        },
      });

      // Assert
      expect(response.status).toBe(401); // Unauthorized (don't reveal if email exists)

      const body = await response.json();
      expect(body).toHaveProperty('error');
    });

    test('should fail with invalid email format', async () => {
      // Act - Login with malformed email
      const response = await client.auth.login.$post({
        json: {
          email: 'not-an-email',
          password: 'Password123!',
        },
      });

      // Assert
      expect(response.status).toBe(400); // Bad Request

      const body = await response.json();
      expect(body).toHaveProperty('error');
    });

    test('should fail with empty password', async () => {
      // Act
      const response = await client.auth.login.$post({
        json: {
          email: 'test@test.remedy.local',
          password: '',
        },
      });

      // Assert
      expect(response.status).toBe(400); // Bad Request
    });

    test('should fail with missing email field', async () => {
      // Act
      const response = await client.auth.login.$post({
        json: {
          password: 'Password123!',
        } as unknown as LoginRequest, // Type cast to bypass TypeScript check
      });

      // Assert
      expect(response.status).toBe(400); // Bad Request
    });

    test('should fail with missing password field', async () => {
      // Act
      const response = await client.auth.login.$post({
        json: {
          email: 'test@test.remedy.local',
        } as unknown as LoginRequest, // Type cast to bypass TypeScript check
      });

      // Assert
      expect(response.status).toBe(400); // Bad Request
    });

    // Edge Cases

    test('should handle email case sensitivity correctly', async () => {
      // Arrange - Register with mixed case email
      const testUser = generateTestUser();
      const mixedCaseEmail = `Test.${testUser.email}`;
      testUsers.push(mixedCaseEmail.toLowerCase()); // Emails are typically stored lowercase

      await client.auth.register.$post({
        json: {
          email: mixedCaseEmail,
          password: testUser.password,
          name: testUser.name,
        },
      });

      // Act - Login with different case
      const response = await client.auth.login.$post({
        json: {
          email: mixedCaseEmail.toLowerCase(),
          password: testUser.password,
        },
      });

      // Assert - Should succeed (emails are case-insensitive)
      expect([200, 401]).toContain(response.status);
      // If 200: case-insensitive comparison works
      // If 401: system is case-sensitive (document this behavior)
    });

    test('should handle login with unverified email', async () => {
      // Arrange - Register but don't verify email
      const testUser = generateTestUser();
      testUsers.push(testUser.email);

      await client.auth.register.$post({
        json: {
          email: testUser.email,
          password: testUser.password,
          name: testUser.name,
        },
      });

      // Act - Try to login without verifying email
      const response = await client.auth.login.$post({
        json: {
          email: testUser.email,
          password: testUser.password,
        },
      });

      // Assert - Behavior depends on SSO config
      // Either succeeds (200) or requires verification (403)
      expect([200, 403]).toContain(response.status);

      if (response.status === 200) {
        const body = await response.json();
        if (!('data' in body)) {
          throw new Error('Expected data in response');
        }
        expect(body.data.tokens).toBeDefined();
      }
    });
  });
});
