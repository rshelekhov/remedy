import { faker } from '@faker-js/faker';
import type { PrismaClient } from '@prisma/client';
import type { TestClient } from './test-client';
import { TEST_CONSTANTS } from './test-config';

export interface TestUser {
  email: string;
  password: string;
  name: string;
}

/**
 * Authenticated test user with tokens
 */
export interface AuthenticatedTestUser {
  email: string;
  password: string;
  name: string;
  tokens: {
    accessToken: string;
    refreshToken: string;
    expiresAt: string;
  };
  userId: string;
}

/**
 * Auth tokens returned from SSO
 */
export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresAt: string;
}

/**
 * Generate unique test user data using Faker
 */
export function generateTestUser(): TestUser {
  // Use custom test domain for easy identification and cleanup
  const username = `${faker.internet.username()}.${Date.now()}`;
  const email = `${username}${TEST_CONSTANTS.TEST_USER_EMAIL_DOMAIN}`;

  return {
    email,
    password: generateSecurePassword(),
    name: faker.person.fullName(),
  };
}

/**
 * Generate a secure password that meets validation requirements
 * (min 8 chars with uppercase, lowercase, digits, special chars)
 */
export function generateSecurePassword(): string {
  // Generate a strong password that meets common validation rules
  const password = faker.internet.password({
    length: 12,
    memorable: false,
    pattern: /[a-zA-Z0-9!@#$%^&*]/,
  });

  // Ensure it has at least one uppercase, one lowercase, one digit, and one special char
  return `${password}A1!`;
}

/**
 * Cleanup test user from database
 */
export async function cleanupTestUser(prisma: PrismaClient, email: string): Promise<void> {
  try {
    await prisma.user.delete({
      where: { email },
    });
  } catch (_error) {
    // User might not exist, ignore
  }
}

/**
 * Cleanup multiple test users
 */
export async function cleanupTestUsers(prisma: PrismaClient, emails: string[]): Promise<void> {
  for (const email of emails) {
    await cleanupTestUser(prisma, email);
  }

  // Small wait to ensure cleanup is complete
  await new Promise((resolve) => setTimeout(resolve, TEST_CONSTANTS.CLEANUP_WAIT));
}

/**
 * Create an authenticated test user (register and get tokens)
 * Useful for tests that require authentication
 */
export async function createAuthenticatedUser(client: TestClient): Promise<AuthenticatedTestUser> {
  const testUser = generateTestUser();

  const response = await client.auth.register.$post({
    json: {
      email: testUser.email,
      password: testUser.password,
      name: testUser.name,
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to create authenticated user: ${response.status}`);
  }

  const body = await response.json();

  if (!('data' in body)) {
    throw new Error('Expected data in response');
  }

  return {
    email: testUser.email,
    password: testUser.password,
    name: testUser.name,
    tokens: body.data.tokens,
    userId: body.data.user.id,
  };
}

/**
 * Refresh user tokens using a refresh token
 */
export async function refreshUserTokens(
  client: TestClient,
  refreshToken: string
): Promise<AuthTokens> {
  const response = await client.auth.refresh.$post({
    json: { refreshToken },
  });

  if (!response.ok) {
    throw new Error(`Failed to refresh tokens: ${response.status}`);
  }

  const body = await response.json();

  if (!('data' in body)) {
    throw new Error('Expected data in response');
  }

  return body.data.tokens;
}
