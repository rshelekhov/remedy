import { afterEach, describe, expect, test } from 'bun:test';
import type { RegisterRequest } from '../../src/schemas/auth.schema';
import { createTestClient } from '../helpers/test-client';
import { getTestPrisma } from '../helpers/test-db';
import { cleanupTestUser, generateTestUser } from '../helpers/test-user';
import { setupIntegrationTests } from './setup';

// Run global setup
setupIntegrationTests();

describe('Auth Integration Tests', () => {
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

  describe('POST /api/auth/register', () => {
    test('should successfully register a new user', async () => {
      // Arrange
      const testUser = generateTestUser();
      testUsers.push(testUser.email);

      // Act
      const response = await client.auth.register.$post({
        json: {
          email: testUser.email,
          password: testUser.password,
          name: testUser.name,
        },
      });

      // Assert
      expect(response.status).toBe(201);

      const body = await response.json();

      expect(body).toHaveProperty('message', 'User registered successfully');
      expect(body).toHaveProperty('data');

      if (!('data' in body)) {
        throw new Error('Expected data in response');
      }
      const { user, tokens } = body.data;

      // Verify user data
      expect(user).toHaveProperty('id');
      expect(user.id).toBeTypeOf('string');
      expect(user.email).toBe(testUser.email);
      expect(user.name).toBe(testUser.name);

      // Verify tokens
      expect(tokens).toHaveProperty('accessToken');
      expect(tokens).toHaveProperty('refreshToken');
      expect(tokens).toHaveProperty('expiresAt');
      expect(typeof tokens.accessToken).toBe('string');
      expect(tokens.accessToken.length).toBeGreaterThan(0);
      expect(typeof tokens.refreshToken).toBe('string');
      expect(tokens.refreshToken.length).toBeGreaterThan(0);

      // Verify user was saved to database
      const dbUser = await prisma.user.findUnique({
        where: { email: testUser.email },
      });

      expect(dbUser).not.toBeNull();
      expect(dbUser?.email).toBe(testUser.email);
      expect(dbUser?.name).toBe(testUser.name);
      expect(dbUser?.id).toBe(user.id);
    });

    test('should fail with duplicate email', async () => {
      // Arrange - create first user
      const testUser = generateTestUser();
      testUsers.push(testUser.email);

      await client.auth.register.$post({
        json: {
          email: testUser.email,
          password: testUser.password,
          name: testUser.name,
        },
      });

      // Act - try to register again with same email
      const response = await client.auth.register.$post({
        json: {
          email: testUser.email,
          password: 'DifferentPassword123!',
          name: 'Different Name',
        },
      });

      // Assert
      expect(response.status).toBe(409); // Conflict

      const body = await response.json();
      expect(body).toHaveProperty('error');
      expect(body).toHaveProperty('code');
    });

    test('should fail with invalid email format', async () => {
      // Arrange
      const testUser = generateTestUser();

      // Act
      const response = await client.auth.register.$post({
        json: {
          email: 'not-an-email',
          password: testUser.password,
          name: testUser.name,
        },
      });

      // Assert
      expect(response.status).toBe(400); // Bad Request
    });

    test('should fail with weak password', async () => {
      // Arrange
      const testUser = generateTestUser();

      // Act
      const response = await client.auth.register.$post({
        json: {
          email: testUser.email,
          password: 'weak',
          name: testUser.name,
        },
      });

      // Assert
      expect(response.status).toBe(400); // Bad Request
    });

    test('should fail with missing required field', async () => {
      // Arrange
      const testUser = generateTestUser();

      // Act
      const response = await client.auth.register.$post({
        json: {
          email: testUser.email,
          password: testUser.password,
          // name is missing
        } as unknown as RegisterRequest, // Type cast to bypass TypeScript check
      });

      // Assert
      expect(response.status).toBe(400); // Bad Request
    });

    test('should fail with empty string values', async () => {
      // Act
      const response = await client.auth.register.$post({
        json: {
          email: '',
          password: '',
          name: '',
        },
      });

      // Assert
      expect(response.status).toBe(400); // Bad Request
    });

    test('should handle SQL injection attempt safely', async () => {
      // Arrange - Try SQL injection in email field with unique timestamp
      const maliciousEmail = `admin'--${Date.now()}@example.com`;

      // Track email for cleanup in case it succeeds
      testUsers.push(maliciousEmail);

      // Act
      const response = await client.auth.register.$post({
        json: {
          email: maliciousEmail,
          password: 'Password123!',
          name: "Robert'); DROP TABLE users;--",
        },
      });

      // Assert - Should either fail validation or handle safely
      // (Either 400 for invalid email or successful registration with sanitized data)
      expect([400, 201]).toContain(response.status);

      // If it succeeded, verify no SQL injection occurred
      if (response.status === 201) {
        await response.json();

        // Verify user was created safely
        const dbUser = await prisma.user.findUnique({
          where: { email: maliciousEmail },
        });
        expect(dbUser).not.toBeNull();
      }
    });

    test('should handle very long input strings', async () => {
      // Arrange - Create strings longer than reasonable limits
      const longString = 'a'.repeat(1001);
      const uniqueEmail = `test.${Date.now()}@example.com`; // Use normal email

      // Track email for cleanup
      testUsers.push(uniqueEmail);

      // Act
      const response = await client.auth.register.$post({
        json: {
          email: uniqueEmail,
          password: longString,
          name: longString,
        },
      });

      // Assert - SSO may accept or reject very long strings
      // Either 400 (validation failed) or 201 (accepted)
      expect([400, 201]).toContain(response.status);

      // If successful, verify it was stored
      if (response.status === 201) {
        const body = await response.json();
        if (!('data' in body)) {
          throw new Error('Expected data in response');
        }
        expect(body.data.user.email).toBe(uniqueEmail);
      }
    });
  });
});
