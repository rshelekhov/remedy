import { afterEach, describe, expect, test } from 'bun:test';
import { faker } from '@faker-js/faker';
import type { CreateFamilyRequest } from '../../src/schemas/family.schema';
import { createTestClient } from '../helpers/test-client';
import { getTestPrisma } from '../helpers/test-db';
import {
  cleanupTestFamily,
  createFamilyMemberWithUser,
  createTestFamily,
} from '../helpers/test-family';
import { cleanupTestUser, createAuthenticatedUser } from '../helpers/test-user';
import { setupIntegrationTests } from './setup';

// Run global setup
setupIntegrationTests();

describe('Family Integration Tests', () => {
  const client = createTestClient();
  const prisma = getTestPrisma();
  const testUsers: string[] = [];
  const testFamilies: string[] = [];

  afterEach(async () => {
    // Cleanup families first (due to foreign key constraints)
    for (const familyId of testFamilies) {
      await cleanupTestFamily(prisma, familyId);
    }
    testFamilies.length = 0;

    // Then cleanup users
    for (const email of testUsers) {
      await cleanupTestUser(prisma, email);
    }
    testUsers.length = 0;
  });

  describe('POST /api/families/', () => {
    // Happy Path Tests

    test('should successfully create a new family', async () => {
      // Arrange
      const user = await createAuthenticatedUser(client);
      testUsers.push(user.email);

      const familyName = `${faker.company.name()} Family`;

      // Act
      const response = await client.families.$post(
        {
          json: {
            name: familyName,
          },
        },
        {
          headers: {
            Authorization: `Bearer ${user.tokens.accessToken}`,
          },
        }
      );

      // Assert
      expect(response.status).toBe(201);

      const body = await response.json();
      expect(body).toHaveProperty('message', 'Family created successfully');
      expect(body).toHaveProperty('data');

      if (!('data' in body)) {
        throw new Error('Expected data in response');
      }

      const { family } = body.data;
      testFamilies.push(family.id);

      // Verify family data
      expect(family).toHaveProperty('id');
      expect(family.id).toBeTypeOf('string');
      expect(family.name).toBe(familyName);
      expect(family.ownerId).toBe(user.userId);
      expect(family).toHaveProperty('createdAt');
      expect(family).toHaveProperty('updatedAt');

      // Verify family was saved to database
      const dbFamily = await prisma.family.findUnique({
        where: { id: family.id },
      });

      expect(dbFamily).not.toBeNull();
      expect(dbFamily?.name).toBe(familyName);
      expect(dbFamily?.ownerId).toBe(user.userId);
    });

    // Error Scenarios

    test('should fail when user already owns a family', async () => {
      // Arrange - Create user and their first family
      const user = await createAuthenticatedUser(client);
      testUsers.push(user.email);

      const firstFamily = await createTestFamily(client, user, 'First Family');
      testFamilies.push(firstFamily.id);

      // Act - Try to create a second family
      const response = await client.families.$post(
        {
          json: {
            name: 'Second Family',
          },
        },
        {
          headers: {
            Authorization: `Bearer ${user.tokens.accessToken}`,
          },
        }
      );

      // Assert
      expect(response.status).toBe(409); // Conflict

      const body = await response.json();
      expect(body).toHaveProperty('error');
    });

    test('should fail with no authorization header', async () => {
      // Act
      const response = await client.families.$post({
        json: {
          name: 'Test Family',
        },
      });

      // Assert
      expect(response.status).toBe(401); // Unauthorized
    });

    test('should fail with invalid token', async () => {
      // Act
      const response = await client.families.$post(
        {
          json: {
            name: 'Test Family',
          },
        },
        {
          headers: {
            Authorization: 'Bearer invalid-token',
          },
        }
      );

      // Assert
      expect(response.status).toBe(401); // Unauthorized
    });

    test('should fail with empty family name', async () => {
      // Arrange
      const user = await createAuthenticatedUser(client);
      testUsers.push(user.email);

      // Act
      const response = await client.families.$post(
        {
          json: {
            name: '',
          },
        },
        {
          headers: {
            Authorization: `Bearer ${user.tokens.accessToken}`,
          },
        }
      );

      // Assert
      expect(response.status).toBe(400); // Bad Request
    });

    test('should fail with missing name field', async () => {
      // Arrange
      const user = await createAuthenticatedUser(client);
      testUsers.push(user.email);

      // Act
      const response = await client.families.$post(
        {
          json: {} as unknown as CreateFamilyRequest, // Missing name field
        },
        {
          headers: {
            Authorization: `Bearer ${user.tokens.accessToken}`,
          },
        }
      );

      // Assert
      expect(response.status).toBe(400); // Bad Request
    });
  });

  describe('GET /api/families/:id', () => {
    // Happy Path Tests

    test('should successfully get family details', async () => {
      // Arrange
      const user = await createAuthenticatedUser(client);
      testUsers.push(user.email);

      const family = await createTestFamily(client, user, 'Test Family');
      testFamilies.push(family.id);

      // Act
      const response = await client.families[':id'].$get(
        {
          param: { id: family.id },
        },
        {
          headers: {
            Authorization: `Bearer ${user.tokens.accessToken}`,
          },
        }
      );

      // Assert
      expect(response.status).toBe(200);

      const body = await response.json();
      expect(body).toHaveProperty('message', 'Family details retrieved successfully');
      expect(body).toHaveProperty('data');

      if (!('data' in body)) {
        throw new Error('Expected data in response');
      }

      const { family: returnedFamily } = body.data;
      expect(returnedFamily.id).toBe(family.id);
      expect(returnedFamily.name).toBe(family.name);
      expect(returnedFamily.ownerId).toBe(user.userId);
    });

    // Error Scenarios

    test('should fail with non-existent family ID', async () => {
      // Arrange
      const user = await createAuthenticatedUser(client);
      testUsers.push(user.email);

      const nonExistentId = '00000000-0000-0000-0000-000000000000';

      // Act
      const response = await client.families[':id'].$get(
        {
          param: { id: nonExistentId },
        },
        {
          headers: {
            Authorization: `Bearer ${user.tokens.accessToken}`,
          },
        }
      );

      // Assert
      expect(response.status).toBe(404); // Not Found

      const body = await response.json();
      expect(body).toHaveProperty('error');
    });

    test('should fail when user is not the family owner', async () => {
      // Arrange - Create two users
      const user1 = await createAuthenticatedUser(client);
      testUsers.push(user1.email);

      const user2 = await createAuthenticatedUser(client);
      testUsers.push(user2.email);

      // User1 creates a family
      const family = await createTestFamily(client, user1, 'User1 Family');
      testFamilies.push(family.id);

      // Act - User2 tries to get User1's family
      const response = await client.families[':id'].$get(
        {
          param: { id: family.id },
        },
        {
          headers: {
            Authorization: `Bearer ${user2.tokens.accessToken}`,
          },
        }
      );

      // Assert
      expect(response.status).toBe(404); // Not Found (family doesn't belong to user2)
    });

    test('should fail with no authorization header', async () => {
      // Arrange
      const user = await createAuthenticatedUser(client);
      testUsers.push(user.email);

      const family = await createTestFamily(client, user);
      testFamilies.push(family.id);

      // Act
      const response = await client.families[':id'].$get({
        param: { id: family.id },
      });

      // Assert
      expect(response.status).toBe(401); // Unauthorized
    });

    test('should fail with invalid family ID format', async () => {
      // Arrange
      const user = await createAuthenticatedUser(client);
      testUsers.push(user.email);

      // Act
      const response = await client.families[':id'].$get(
        {
          param: { id: 'not-a-uuid' },
        },
        {
          headers: {
            Authorization: `Bearer ${user.tokens.accessToken}`,
          },
        }
      );

      // Assert
      expect(response.status).toBe(400); // Bad Request
    });
  });

  describe('PATCH /api/families/:id', () => {
    // Happy Path Tests

    test('should successfully update family name', async () => {
      // Arrange
      const user = await createAuthenticatedUser(client);
      testUsers.push(user.email);

      const family = await createTestFamily(client, user, 'Original Name');
      testFamilies.push(family.id);

      const newName = `${faker.company.name()} Family Updated`;

      // Act
      const response = await client.families[':id'].$patch(
        {
          param: { id: family.id },
          json: {
            name: newName,
          },
        },
        {
          headers: {
            Authorization: `Bearer ${user.tokens.accessToken}`,
          },
        }
      );

      // Assert
      expect(response.status).toBe(200);

      const body = await response.json();
      expect(body).toHaveProperty('message', 'Family updated successfully');
      expect(body).toHaveProperty('data');

      if (!('data' in body)) {
        throw new Error('Expected data in response');
      }

      const { family: updatedFamily } = body.data;
      expect(updatedFamily.id).toBe(family.id);
      expect(updatedFamily.name).toBe(newName);
      expect(updatedFamily.ownerId).toBe(user.userId);

      // Verify in database
      const dbFamily = await prisma.family.findUnique({
        where: { id: family.id },
      });

      expect(dbFamily?.name).toBe(newName);
    });

    // Error Scenarios

    test('should fail with non-existent family ID', async () => {
      // Arrange
      const user = await createAuthenticatedUser(client);
      testUsers.push(user.email);

      const nonExistentId = '00000000-0000-0000-0000-000000000000';

      // Act
      const response = await client.families[':id'].$patch(
        {
          param: { id: nonExistentId },
          json: {
            name: 'New Name',
          },
        },
        {
          headers: {
            Authorization: `Bearer ${user.tokens.accessToken}`,
          },
        }
      );

      // Assert
      expect(response.status).toBe(404); // Not Found
    });

    test('should fail when user is not the family owner', async () => {
      // Arrange - Create two users
      const user1 = await createAuthenticatedUser(client);
      testUsers.push(user1.email);

      const user2 = await createAuthenticatedUser(client);
      testUsers.push(user2.email);

      // User1 creates a family
      const family = await createTestFamily(client, user1, 'User1 Family');
      testFamilies.push(family.id);

      // Act - User2 tries to update User1's family
      const response = await client.families[':id'].$patch(
        {
          param: { id: family.id },
          json: {
            name: 'Hacked Name',
          },
        },
        {
          headers: {
            Authorization: `Bearer ${user2.tokens.accessToken}`,
          },
        }
      );

      // Assert
      expect(response.status).toBe(404); // Not Found
    });

    test('should fail with empty family name', async () => {
      // Arrange
      const user = await createAuthenticatedUser(client);
      testUsers.push(user.email);

      const family = await createTestFamily(client, user);
      testFamilies.push(family.id);

      // Act
      const response = await client.families[':id'].$patch(
        {
          param: { id: family.id },
          json: {
            name: '',
          },
        },
        {
          headers: {
            Authorization: `Bearer ${user.tokens.accessToken}`,
          },
        }
      );

      // Assert
      expect(response.status).toBe(400); // Bad Request
    });

    test('should fail with no authorization header', async () => {
      // Arrange
      const user = await createAuthenticatedUser(client);
      testUsers.push(user.email);

      const family = await createTestFamily(client, user);
      testFamilies.push(family.id);

      // Act
      const response = await client.families[':id'].$patch({
        param: { id: family.id },
        json: {
          name: 'New Name',
        },
      });

      // Assert
      expect(response.status).toBe(401); // Unauthorized
    });
  });

  describe('DELETE /api/families/:id', () => {
    // Happy Path Tests

    test('should successfully delete a family', async () => {
      // Arrange
      const user = await createAuthenticatedUser(client);
      testUsers.push(user.email);

      const family = await createTestFamily(client, user, 'Family to Delete');
      // Don't add to testFamilies since we're testing deletion

      // Act
      const response = await client.families[':id'].$delete(
        {
          param: { id: family.id },
        },
        {
          headers: {
            Authorization: `Bearer ${user.tokens.accessToken}`,
          },
        }
      );

      // Assert
      expect(response.status).toBe(200);

      const body = await response.json();
      expect(body).toHaveProperty('message', 'Family deleted successfully');
      expect(body).toHaveProperty('data');

      if (!('data' in body) || !body.data || typeof body.data !== 'object') {
        throw new Error('Expected data in response');
      }

      const data = body.data as { familyId: string };
      expect(data.familyId).toBe(family.id);

      // Verify family was deleted from database
      const dbFamily = await prisma.family.findUnique({
        where: { id: family.id },
      });

      expect(dbFamily).toBeNull();
    });

    // Error Scenarios

    test('should fail with non-existent family ID', async () => {
      // Arrange
      const user = await createAuthenticatedUser(client);
      testUsers.push(user.email);

      const nonExistentId = '00000000-0000-0000-0000-000000000000';

      // Act
      const response = await client.families[':id'].$delete(
        {
          param: { id: nonExistentId },
        },
        {
          headers: {
            Authorization: `Bearer ${user.tokens.accessToken}`,
          },
        }
      );

      // Assert
      expect(response.status).toBe(404); // Not Found
    });

    test('should fail when user is not the family owner', async () => {
      // Arrange - Create two users
      const user1 = await createAuthenticatedUser(client);
      testUsers.push(user1.email);

      const user2 = await createAuthenticatedUser(client);
      testUsers.push(user2.email);

      // User1 creates a family
      const family = await createTestFamily(client, user1, 'User1 Family');
      testFamilies.push(family.id);

      // Act - User2 tries to delete User1's family
      const response = await client.families[':id'].$delete(
        {
          param: { id: family.id },
        },
        {
          headers: {
            Authorization: `Bearer ${user2.tokens.accessToken}`,
          },
        }
      );

      // Assert
      expect(response.status).toBe(404); // Not Found
    });

    test('should fail with no authorization header', async () => {
      // Arrange
      const user = await createAuthenticatedUser(client);
      testUsers.push(user.email);

      const family = await createTestFamily(client, user);
      testFamilies.push(family.id);

      // Act
      const response = await client.families[':id'].$delete({
        param: { id: family.id },
      });

      // Assert
      expect(response.status).toBe(401); // Unauthorized
    });
  });

  describe('PATCH /api/families/:id/ownership', () => {
    // Happy Path Tests

    test('should successfully transfer family ownership', async () => {
      // Arrange - Create two users
      const currentOwner = await createAuthenticatedUser(client);
      testUsers.push(currentOwner.email);

      const newOwner = await createAuthenticatedUser(client);
      testUsers.push(newOwner.email);

      // Current owner creates a family
      const family = await createTestFamily(client, currentOwner, 'Family to Transfer');
      testFamilies.push(family.id);

      // Create a family member linked to the new owner
      await createFamilyMemberWithUser(prisma, family.id, newOwner.userId, 'New Owner Member');

      // Act - Current owner transfers ownership to new owner
      const response = await client.families[':id'].ownership.$patch(
        {
          param: { id: family.id },
          json: {
            newOwnerId: newOwner.userId,
          },
        },
        {
          headers: {
            Authorization: `Bearer ${currentOwner.tokens.accessToken}`,
          },
        }
      );

      // Assert
      expect(response.status).toBe(200);

      const body = await response.json();

      expect(body).toHaveProperty('message', 'Family ownership transferred successfully');
      expect(body).toHaveProperty('data');

      if (!('data' in body)) {
        throw new Error('Expected data in response');
      }

      const { family: updatedFamily } = body.data;
      expect(updatedFamily.id).toBe(family.id);
      expect(updatedFamily.ownerId).toBe(newOwner.userId);

      // Verify in database
      const dbFamily = await prisma.family.findUnique({
        where: { id: family.id },
      });

      expect(dbFamily?.ownerId).toBe(newOwner.userId);
    });

    // Error Scenarios

    test('should fail with non-existent family ID', async () => {
      // Arrange
      const user = await createAuthenticatedUser(client);
      testUsers.push(user.email);

      const nonExistentId = '00000000-0000-0000-0000-000000000000';

      // Act
      const response = await client.families[':id'].ownership.$patch(
        {
          param: { id: nonExistentId },
          json: {
            newOwnerId: user.userId,
          },
        },
        {
          headers: {
            Authorization: `Bearer ${user.tokens.accessToken}`,
          },
        }
      );

      // Assert
      expect(response.status).toBe(404); // Not Found
    });

    test('should fail when user is not the current family owner', async () => {
      // Arrange - Create two users
      const actualOwner = await createAuthenticatedUser(client);
      testUsers.push(actualOwner.email);

      const nonOwner = await createAuthenticatedUser(client);
      testUsers.push(nonOwner.email);

      // Actual owner creates a family
      const family = await createTestFamily(client, actualOwner, 'Owner Family');
      testFamilies.push(family.id);

      // Act - Non-owner tries to transfer ownership
      const response = await client.families[':id'].ownership.$patch(
        {
          param: { id: family.id },
          json: {
            newOwnerId: nonOwner.userId,
          },
        },
        {
          headers: {
            Authorization: `Bearer ${nonOwner.tokens.accessToken}`,
          },
        }
      );

      // Assert
      expect(response.status).toBe(404); // Not Found (family doesn't belong to non-owner)
    });

    test('should fail when new owner is not a family member', async () => {
      // Arrange - Create two users
      const currentOwner = await createAuthenticatedUser(client);
      testUsers.push(currentOwner.email);

      const nonMember = await createAuthenticatedUser(client);
      testUsers.push(nonMember.email);

      // Current owner creates a family
      const family = await createTestFamily(client, currentOwner, 'Family');
      testFamilies.push(family.id);

      // Act - Try to transfer to non-member
      const response = await client.families[':id'].ownership.$patch(
        {
          param: { id: family.id },
          json: {
            newOwnerId: nonMember.userId,
          },
        },
        {
          headers: {
            Authorization: `Bearer ${currentOwner.tokens.accessToken}`,
          },
        }
      );

      // Assert
      expect(response.status).toBe(400); // Bad Request - Invalid owner
    });

    test('should fail when new owner already owns a different family', async () => {
      // Arrange - Create two users
      const user1 = await createAuthenticatedUser(client);
      testUsers.push(user1.email);

      const user2 = await createAuthenticatedUser(client);
      testUsers.push(user2.email);

      // User1 creates a family
      const family1 = await createTestFamily(client, user1, 'User1 Family');
      testFamilies.push(family1.id);

      // User2 creates their own family
      const family2 = await createTestFamily(client, user2, 'User2 Family');
      testFamilies.push(family2.id);

      // Add User2 as a member in User1's family
      await createFamilyMemberWithUser(prisma, family1.id, user2.userId, 'User2 Member');

      // Act - User1 tries to transfer ownership to User2 (who already owns family2)
      const response = await client.families[':id'].ownership.$patch(
        {
          param: { id: family1.id },
          json: {
            newOwnerId: user2.userId,
          },
        },
        {
          headers: {
            Authorization: `Bearer ${user1.tokens.accessToken}`,
          },
        }
      );

      // Assert
      expect(response.status).toBe(400); // Bad Request - User already owns a family
    });

    test('should fail with invalid new owner ID format', async () => {
      // Arrange
      const user = await createAuthenticatedUser(client);
      testUsers.push(user.email);

      const family = await createTestFamily(client, user);
      testFamilies.push(family.id);

      // Act
      const response = await client.families[':id'].ownership.$patch(
        {
          param: { id: family.id },
          json: {
            newOwnerId: 'not-a-uuid',
          },
        },
        {
          headers: {
            Authorization: `Bearer ${user.tokens.accessToken}`,
          },
        }
      );

      // Assert
      expect(response.status).toBe(400); // Bad Request
    });

    test('should fail with no authorization header', async () => {
      // Arrange
      const user = await createAuthenticatedUser(client);
      testUsers.push(user.email);

      const family = await createTestFamily(client, user);
      testFamilies.push(family.id);

      // Act
      const response = await client.families[':id'].ownership.$patch({
        param: { id: family.id },
        json: {
          newOwnerId: user.userId,
        },
      });

      // Assert
      expect(response.status).toBe(401); // Unauthorized
    });
  });
});
