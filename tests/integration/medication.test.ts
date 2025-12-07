import { afterEach, describe, expect, test } from 'bun:test';
import type {
  AddMedicationRequest,
  UpdateMedicationRequest,
} from '../../src/schemas/medication.schema';
import { createTestClient } from '../helpers/test-client';
import { getTestPrisma } from '../helpers/test-db';
import { cleanupTestFamily, createTestFamily } from '../helpers/test-family';
import {
  cleanupTestMedication,
  createTestMedication,
} from '../helpers/test-medication';
import { createTestMember } from '../helpers/test-member';

import { cleanupTestUser, createAuthenticatedUser } from '../helpers/test-user';
import { setupIntegrationTests } from './setup';

// Run global setup
setupIntegrationTests();

describe('Medication Integration Tests', () => {
  const client = createTestClient();
  const prisma = getTestPrisma();
  const testUsers: string[] = [];
  const testFamilies: string[] = [];
  const testMedications: string[] = [];

  afterEach(async () => {
    // Cleanup medications first
    for (const medicationId of testMedications) {
      await cleanupTestMedication(prisma, medicationId);
    }
    testMedications.length = 0;

    // Cleanup families (which also cleans up members)
    for (const familyId of testFamilies) {
      await cleanupTestFamily(prisma, familyId);
    }
    testFamilies.length = 0;

    // Cleanup users
    for (const email of testUsers) {
      await cleanupTestUser(prisma, email);
    }
    testUsers.length = 0;
  });

  describe('POST /api/families/:id/members/:memberId/medications', () => {
    // Happy Path Tests

    test('should successfully add a medication to a family member', async () => {
      // Arrange
      const user = await createAuthenticatedUser(client);
      testUsers.push(user.email);

      const family = await createTestFamily(client, user, 'Test Family');
      testFamilies.push(family.id);

      const member = await createTestMember(client, user, family);

      const medicationData = {
        name: 'Ibuprofen',
        dosage: '200mg',
        frequency: 'Three times daily',
        prescribingDoctor: 'Dr. Smith',
        notes: 'Take with food',
        isActive: true,
      };

      // Act
      const response = await client.families[':id'].members[':memberId'].medications.$post(
        {
          param: { id: family.id, memberId: member.id },
          json: medicationData,
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
      expect(body).toHaveProperty('message', 'Medication added successfully');
      expect(body).toHaveProperty('data');

      if (!('data' in body)) {
        throw new Error('Expected data in response');
      }

      const { medication } = body.data;
      testMedications.push(medication.id);

      // Verify medication data
      expect(medication).toHaveProperty('id');
      expect(medication.id).toBeTypeOf('string');
      expect(medication.familyMemberId).toBe(member.id);
      expect(medication.name).toBe(medicationData.name);
      expect(medication.dosage).toBe(medicationData.dosage);
      expect(medication.frequency).toBe(medicationData.frequency);
      expect(medication.prescribingDoctor).toBe(medicationData.prescribingDoctor);
      expect(medication.notes).toBe(medicationData.notes);
      expect(medication.isActive).toBe(medicationData.isActive);
      expect(medication).toHaveProperty('createdAt');
      expect(medication).toHaveProperty('updatedAt');

      // Verify medication was saved to database
      const dbMedication = await prisma.medication.findUnique({
        where: { id: medication.id },
      });

      expect(dbMedication).not.toBeNull();
      expect(dbMedication?.name).toBe(medicationData.name);
      expect(dbMedication?.familyMemberId).toBe(member.id);
    });

    test('should successfully add a medication with minimal data', async () => {
      // Arrange
      const user = await createAuthenticatedUser(client);
      testUsers.push(user.email);

      const family = await createTestFamily(client, user);
      testFamilies.push(family.id);

      const member = await createTestMember(client, user, family);

      // Act
      const response = await client.families[':id'].members[':memberId'].medications.$post(
        {
          param: { id: family.id, memberId: member.id },
          json: {
            name: 'Aspirin',
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

      if (!('data' in body)) {
        throw new Error('Expected data in response');
      }

      const { medication } = body.data;
      testMedications.push(medication.id);

      expect(medication.name).toBe('Aspirin');
      expect(medication.isActive).toBe(true); // Default value
    });

    test('should successfully add a medication with date fields', async () => {
      // Arrange
      const user = await createAuthenticatedUser(client);
      testUsers.push(user.email);

      const family = await createTestFamily(client, user);
      testFamilies.push(family.id);

      const member = await createTestMember(client, user, family);

      const startDate = new Date().toISOString();
      const endDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(); // 30 days from now

      // Act
      const response = await client.families[':id'].members[':memberId'].medications.$post(
        {
          param: { id: family.id, memberId: member.id },
          json: {
            name: 'Antibiotics',
            dosage: '500mg',
            startDate,
            endDate,
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

      if (!('data' in body)) {
        throw new Error('Expected data in response');
      }

      const { medication } = body.data;
      testMedications.push(medication.id);

      expect(medication.startDate).toBeTruthy();
      expect(medication.endDate).toBeTruthy();
    });

    // Error Scenarios

    test('should fail when member does not exist', async () => {
      // Arrange
      const user = await createAuthenticatedUser(client);
      testUsers.push(user.email);

      const family = await createTestFamily(client, user);
      testFamilies.push(family.id);

      const nonExistentMemberId = '00000000-0000-0000-0000-000000000000';

      // Act
      const response = await client.families[':id'].members[':memberId'].medications.$post(
        {
          param: { id: family.id, memberId: nonExistentMemberId },
          json: {
            name: 'Test Medication',
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

      const body = await response.json();
      expect(body).toHaveProperty('error');
    });

    test('should fail when family does not exist', async () => {
      // Arrange
      const user = await createAuthenticatedUser(client);
      testUsers.push(user.email);

      const family = await createTestFamily(client, user);
      testFamilies.push(family.id);

      const member = await createTestMember(client, user, family);

      const nonExistentFamilyId = '00000000-0000-0000-0000-000000000000';

      // Act
      const response = await client.families[':id'].members[':memberId'].medications.$post(
        {
          param: { id: nonExistentFamilyId, memberId: member.id },
          json: {
            name: 'Test Medication',
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

    test('should fail when user is not authorized', async () => {
      // Arrange - Create two users
      const user1 = await createAuthenticatedUser(client);
      testUsers.push(user1.email);

      const user2 = await createAuthenticatedUser(client);
      testUsers.push(user2.email);

      // User1 creates a family and member
      const family = await createTestFamily(client, user1);
      testFamilies.push(family.id);

      const member = await createTestMember(client, user1, family);

      // Act - User2 tries to add medication to User1's family member
      const response = await client.families[':id'].members[':memberId'].medications.$post(
        {
          param: { id: family.id, memberId: member.id },
          json: {
            name: 'Test Medication',
          },
        },
        {
          headers: {
            Authorization: `Bearer ${user2.tokens.accessToken}`,
          },
        }
      );

      // Assert
      expect(response.status).toBe(403); // Forbidden (user not authorized)
    });

    test('should fail with no authorization header', async () => {
      // Arrange
      const user = await createAuthenticatedUser(client);
      testUsers.push(user.email);

      const family = await createTestFamily(client, user);
      testFamilies.push(family.id);

      const member = await createTestMember(client, user, family);

      // Act
      const response = await client.families[':id'].members[':memberId'].medications.$post({
        param: { id: family.id, memberId: member.id },
        json: {
          name: 'Test Medication',
        },
      });

      // Assert
      expect(response.status).toBe(401); // Unauthorized
    });

    test('should fail with empty medication name', async () => {
      // Arrange
      const user = await createAuthenticatedUser(client);
      testUsers.push(user.email);

      const family = await createTestFamily(client, user);
      testFamilies.push(family.id);

      const member = await createTestMember(client, user, family);

      // Act
      const response = await client.families[':id'].members[':memberId'].medications.$post(
        {
          param: { id: family.id, memberId: member.id },
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

      const family = await createTestFamily(client, user);
      testFamilies.push(family.id);

      const member = await createTestMember(client, user, family);

      // Act
      const response = await client.families[':id'].members[':memberId'].medications.$post(
        {
          param: { id: family.id, memberId: member.id },
          json: {} as unknown as AddMedicationRequest,
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

    test('should fail with invalid family ID format', async () => {
      // Arrange
      const user = await createAuthenticatedUser(client);
      testUsers.push(user.email);

      const family = await createTestFamily(client, user);
      testFamilies.push(family.id);

      const member = await createTestMember(client, user, family);

      // Act
      const response = await client.families[':id'].members[':memberId'].medications.$post(
        {
          param: { id: 'not-a-uuid', memberId: member.id },
          json: {
            name: 'Test Medication',
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

    test('should fail with invalid member ID format', async () => {
      // Arrange
      const user = await createAuthenticatedUser(client);
      testUsers.push(user.email);

      const family = await createTestFamily(client, user);
      testFamilies.push(family.id);

      // Act
      const response = await client.families[':id'].members[':memberId'].medications.$post(
        {
          param: { id: family.id, memberId: 'not-a-uuid' },
          json: {
            name: 'Test Medication',
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
  });

  describe('GET /api/families/:id/medications/:medicationId', () => {
    // Happy Path Tests

    test('should successfully get medication details', async () => {
      // Arrange
      const user = await createAuthenticatedUser(client);
      testUsers.push(user.email);

      const family = await createTestFamily(client, user);
      testFamilies.push(family.id);

      const member = await createTestMember(client, user, family);

      const medication = await createTestMedication(client, user, family, member, {
        name: 'Test Medication',
        dosage: '100mg',
        frequency: 'Daily',
      });
      testMedications.push(medication.id);

      // Act
      const response = await client.families[':id'].medications[':medicationId'].$get(
        {
          param: { id: family.id, medicationId: medication.id },
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
      expect(body).toHaveProperty('message', 'Medication details retrieved successfully');
      expect(body).toHaveProperty('data');

      if (!('data' in body)) {
        throw new Error('Expected data in response');
      }

      const { medication: returnedMedication } = body.data;
      expect(returnedMedication.id).toBe(medication.id);
      expect(returnedMedication.name).toBe('Test Medication');
      expect(returnedMedication.dosage).toBe('100mg');
      expect(returnedMedication.frequency).toBe('Daily');
    });

    // Error Scenarios

    test('should fail with non-existent medication ID', async () => {
      // Arrange
      const user = await createAuthenticatedUser(client);
      testUsers.push(user.email);

      const family = await createTestFamily(client, user);
      testFamilies.push(family.id);

      const nonExistentId = '00000000-0000-0000-0000-000000000000';

      // Act
      const response = await client.families[':id'].medications[':medicationId'].$get(
        {
          param: { id: family.id, medicationId: nonExistentId },
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

    test('should fail when user is not authorized', async () => {
      // Arrange - Create two users
      const user1 = await createAuthenticatedUser(client);
      testUsers.push(user1.email);

      const user2 = await createAuthenticatedUser(client);
      testUsers.push(user2.email);

      // User1 creates a family, member, and medication
      const family = await createTestFamily(client, user1);
      testFamilies.push(family.id);

      const member = await createTestMember(client, user1, family);

      const medication = await createTestMedication(client, user1, family, member);
      testMedications.push(medication.id);

      // Act - User2 tries to get User1's medication
      const response = await client.families[':id'].medications[':medicationId'].$get(
        {
          param: { id: family.id, medicationId: medication.id },
        },
        {
          headers: {
            Authorization: `Bearer ${user2.tokens.accessToken}`,
          },
        }
      );

      // Assert
      expect(response.status).toBe(403); // Forbidden (user not authorized)
    });

    test('should fail with no authorization header', async () => {
      // Arrange
      const user = await createAuthenticatedUser(client);
      testUsers.push(user.email);

      const family = await createTestFamily(client, user);
      testFamilies.push(family.id);

      const member = await createTestMember(client, user, family);

      const medication = await createTestMedication(client, user, family, member);
      testMedications.push(medication.id);

      // Act
      const response = await client.families[':id'].medications[':medicationId'].$get({
        param: { id: family.id, medicationId: medication.id },
      });

      // Assert
      expect(response.status).toBe(401); // Unauthorized
    });

    test('should fail with invalid medication ID format', async () => {
      // Arrange
      const user = await createAuthenticatedUser(client);
      testUsers.push(user.email);

      const family = await createTestFamily(client, user);
      testFamilies.push(family.id);

      // Act
      const response = await client.families[':id'].medications[':medicationId'].$get(
        {
          param: { id: family.id, medicationId: 'not-a-uuid' },
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

  describe('GET /api/families/:id/members/:memberId/medications', () => {
    // Happy Path Tests

    test('should successfully get all medications for a family member', async () => {
      // Arrange
      const user = await createAuthenticatedUser(client);
      testUsers.push(user.email);

      const family = await createTestFamily(client, user);
      testFamilies.push(family.id);

      const member = await createTestMember(client, user, family);

      // Create multiple medications
      const med1 = await createTestMedication(client, user, family, member, {
        name: 'Medication 1',
      });
      testMedications.push(med1.id);

      const med2 = await createTestMedication(client, user, family, member, {
        name: 'Medication 2',
      });
      testMedications.push(med2.id);

      const med3 = await createTestMedication(client, user, family, member, {
        name: 'Medication 3',
      });
      testMedications.push(med3.id);

      // Act
      const response = await client.families[':id'].members[':memberId'].medications.$get(
        {
          param: { id: family.id, memberId: member.id },
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
      expect(body).toHaveProperty('message', 'All member medications retrieved successfully');
      expect(body).toHaveProperty('data');

      if (!('data' in body)) {
        throw new Error('Expected data in response');
      }

      const { medications } = body.data;
      expect(medications).toBeArray();
      expect(medications).toHaveLength(3);

      // Verify all medications are present
      const medicationIds = medications.map((m: { id: string }) => m.id);
      expect(medicationIds).toContain(med1.id);
      expect(medicationIds).toContain(med2.id);
      expect(medicationIds).toContain(med3.id);
    });

    test('should return empty array when member has no medications', async () => {
      // Arrange
      const user = await createAuthenticatedUser(client);
      testUsers.push(user.email);

      const family = await createTestFamily(client, user);
      testFamilies.push(family.id);

      const member = await createTestMember(client, user, family);

      // Act
      const response = await client.families[':id'].members[':memberId'].medications.$get(
        {
          param: { id: family.id, memberId: member.id },
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

      if (!('data' in body)) {
        throw new Error('Expected data in response');
      }

      const { medications } = body.data;
      expect(medications).toBeArray();
      expect(medications).toHaveLength(0);
    });

    // Error Scenarios

    test('should fail with non-existent member ID', async () => {
      // Arrange
      const user = await createAuthenticatedUser(client);
      testUsers.push(user.email);

      const family = await createTestFamily(client, user);
      testFamilies.push(family.id);

      const nonExistentId = '00000000-0000-0000-0000-000000000000';

      // Act
      const response = await client.families[':id'].members[':memberId'].medications.$get(
        {
          param: { id: family.id, memberId: nonExistentId },
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

    test('should fail when user is not authorized', async () => {
      // Arrange - Create two users
      const user1 = await createAuthenticatedUser(client);
      testUsers.push(user1.email);

      const user2 = await createAuthenticatedUser(client);
      testUsers.push(user2.email);

      // User1 creates a family and member
      const family = await createTestFamily(client, user1);
      testFamilies.push(family.id);

      const member = await createTestMember(client, user1, family);

      // Act - User2 tries to get User1's member medications
      const response = await client.families[':id'].members[':memberId'].medications.$get(
        {
          param: { id: family.id, memberId: member.id },
        },
        {
          headers: {
            Authorization: `Bearer ${user2.tokens.accessToken}`,
          },
        }
      );

      // Assert
      expect(response.status).toBe(403); // Forbidden (user not authorized)
    });

    test('should fail with no authorization header', async () => {
      // Arrange
      const user = await createAuthenticatedUser(client);
      testUsers.push(user.email);

      const family = await createTestFamily(client, user);
      testFamilies.push(family.id);

      const member = await createTestMember(client, user, family);

      // Act
      const response = await client.families[':id'].members[':memberId'].medications.$get({
        param: { id: family.id, memberId: member.id },
      });

      // Assert
      expect(response.status).toBe(401); // Unauthorized
    });
  });

  describe('PUT /api/families/:id/medications/:medicationId', () => {
    // Happy Path Tests

    test('should successfully update medication', async () => {
      // Arrange
      const user = await createAuthenticatedUser(client);
      testUsers.push(user.email);

      const family = await createTestFamily(client, user);
      testFamilies.push(family.id);

      const member = await createTestMember(client, user, family);

      const medication = await createTestMedication(client, user, family, member, {
        name: 'Original Name',
        dosage: '100mg',
      });
      testMedications.push(medication.id);

      const updateData = {
        name: 'Updated Name',
        dosage: '200mg',
        frequency: 'Twice daily',
      };

      // Act
      const response = await client.families[':id'].medications[':medicationId'].$put(
        {
          param: { id: family.id, medicationId: medication.id },
          json: updateData,
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
      expect(body).toHaveProperty('message', 'Medication updated successfully');
      expect(body).toHaveProperty('data');

      if (!('data' in body)) {
        throw new Error('Expected data in response');
      }

      const { medication: updatedMedication } = body.data;
      expect(updatedMedication.id).toBe(medication.id);
      expect(updatedMedication.name).toBe(updateData.name);
      expect(updatedMedication.dosage).toBe(updateData.dosage);
      expect(updatedMedication.frequency).toBe(updateData.frequency);

      // Verify in database
      const dbMedication = await prisma.medication.findUnique({
        where: { id: medication.id },
      });

      expect(dbMedication?.name).toBe(updateData.name);
      expect(dbMedication?.dosage).toBe(updateData.dosage);
      expect(dbMedication?.frequency).toBe(updateData.frequency);
    });

    test('should successfully update medication isActive status', async () => {
      // Arrange
      const user = await createAuthenticatedUser(client);
      testUsers.push(user.email);

      const family = await createTestFamily(client, user);
      testFamilies.push(family.id);

      const member = await createTestMember(client, user, family);

      const medication = await createTestMedication(client, user, family, member, {
        name: 'Test Med',
        isActive: true,
      });
      testMedications.push(medication.id);

      // Act
      const response = await client.families[':id'].medications[':medicationId'].$put(
        {
          param: { id: family.id, medicationId: medication.id },
          json: {
            isActive: false,
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

      if (!('data' in body)) {
        throw new Error('Expected data in response');
      }

      const { medication: updatedMedication } = body.data;
      expect(updatedMedication.isActive).toBe(false);
    });

    // Error Scenarios

    test('should fail with non-existent medication ID', async () => {
      // Arrange
      const user = await createAuthenticatedUser(client);
      testUsers.push(user.email);

      const family = await createTestFamily(client, user);
      testFamilies.push(family.id);

      const nonExistentId = '00000000-0000-0000-0000-000000000000';

      // Act
      const response = await client.families[':id'].medications[':medicationId'].$put(
        {
          param: { id: family.id, medicationId: nonExistentId },
          json: {
            name: 'Updated Name',
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

    test('should fail when user is not authorized', async () => {
      // Arrange - Create two users
      const user1 = await createAuthenticatedUser(client);
      testUsers.push(user1.email);

      const user2 = await createAuthenticatedUser(client);
      testUsers.push(user2.email);

      // User1 creates a family, member, and medication
      const family = await createTestFamily(client, user1);
      testFamilies.push(family.id);

      const member = await createTestMember(client, user1, family);

      const medication = await createTestMedication(client, user1, family, member);
      testMedications.push(medication.id);

      // Act - User2 tries to update User1's medication
      const response = await client.families[':id'].medications[':medicationId'].$put(
        {
          param: { id: family.id, medicationId: medication.id },
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
      expect(response.status).toBe(403); // Forbidden (user not authorized)
    });

    test('should fail with empty medication name', async () => {
      // Arrange
      const user = await createAuthenticatedUser(client);
      testUsers.push(user.email);

      const family = await createTestFamily(client, user);
      testFamilies.push(family.id);

      const member = await createTestMember(client, user, family);

      const medication = await createTestMedication(client, user, family, member);
      testMedications.push(medication.id);

      // Act
      const response = await client.families[':id'].medications[':medicationId'].$put(
        {
          param: { id: family.id, medicationId: medication.id },
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

    test('should fail with empty update object', async () => {
      // Arrange
      const user = await createAuthenticatedUser(client);
      testUsers.push(user.email);

      const family = await createTestFamily(client, user);
      testFamilies.push(family.id);

      const member = await createTestMember(client, user, family);

      const medication = await createTestMedication(client, user, family, member);
      testMedications.push(medication.id);

      // Act
      const response = await client.families[':id'].medications[':medicationId'].$put(
        {
          param: { id: family.id, medicationId: medication.id },
          json: {} as unknown as UpdateMedicationRequest,
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

      const member = await createTestMember(client, user, family);

      const medication = await createTestMedication(client, user, family, member);
      testMedications.push(medication.id);

      // Act
      const response = await client.families[':id'].medications[':medicationId'].$put({
        param: { id: family.id, medicationId: medication.id },
        json: {
          name: 'Updated Name',
        },
      });

      // Assert
      expect(response.status).toBe(401); // Unauthorized
    });
  });

  describe('DELETE /api/families/:id/medications/:medicationId', () => {
    // Happy Path Tests

    test('should successfully delete a medication', async () => {
      // Arrange
      const user = await createAuthenticatedUser(client);
      testUsers.push(user.email);

      const family = await createTestFamily(client, user);
      testFamilies.push(family.id);

      const member = await createTestMember(client, user, family);

      const medication = await createTestMedication(client, user, family, member);
      // Don't add to testMedications since we're testing deletion

      // Act
      const response = await client.families[':id'].medications[':medicationId'].$delete(
        {
          param: { id: family.id, medicationId: medication.id },
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
      expect(body).toHaveProperty('message', 'Medication deleted successfully');

      // Verify medication was deleted from database
      const dbMedication = await prisma.medication.findUnique({
        where: { id: medication.id },
      });

      expect(dbMedication).toBeNull();
    });

    // Error Scenarios

    test('should fail with non-existent medication ID', async () => {
      // Arrange
      const user = await createAuthenticatedUser(client);
      testUsers.push(user.email);

      const family = await createTestFamily(client, user);
      testFamilies.push(family.id);

      const nonExistentId = '00000000-0000-0000-0000-000000000000';

      // Act
      const response = await client.families[':id'].medications[':medicationId'].$delete(
        {
          param: { id: family.id, medicationId: nonExistentId },
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

    test('should fail when user is not authorized', async () => {
      // Arrange - Create two users
      const user1 = await createAuthenticatedUser(client);
      testUsers.push(user1.email);

      const user2 = await createAuthenticatedUser(client);
      testUsers.push(user2.email);

      // User1 creates a family, member, and medication
      const family = await createTestFamily(client, user1);
      testFamilies.push(family.id);

      const member = await createTestMember(client, user1, family);

      const medication = await createTestMedication(client, user1, family, member);
      testMedications.push(medication.id);

      // Act - User2 tries to delete User1's medication
      const response = await client.families[':id'].medications[':medicationId'].$delete(
        {
          param: { id: family.id, medicationId: medication.id },
        },
        {
          headers: {
            Authorization: `Bearer ${user2.tokens.accessToken}`,
          },
        }
      );

      // Assert
      expect(response.status).toBe(403); // Forbidden (user not authorized)
    });

    test('should fail with no authorization header', async () => {
      // Arrange
      const user = await createAuthenticatedUser(client);
      testUsers.push(user.email);

      const family = await createTestFamily(client, user);
      testFamilies.push(family.id);

      const member = await createTestMember(client, user, family);

      const medication = await createTestMedication(client, user, family, member);
      testMedications.push(medication.id);

      // Act
      const response = await client.families[':id'].medications[':medicationId'].$delete({
        param: { id: family.id, medicationId: medication.id },
      });

      // Assert
      expect(response.status).toBe(401); // Unauthorized
    });
  });
});
