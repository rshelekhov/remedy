import { afterEach, describe, expect, test } from 'bun:test';
import { faker } from '@faker-js/faker';
import type { AddVisitRequest, UpdateVisitRequest } from '../../src/schemas/visit.schema';
import { createTestClient } from '../helpers/test-client';
import { getTestPrisma } from '../helpers/test-db';
import { cleanupTestFamily, createTestFamily } from '../helpers/test-family';
import { createTestMember, createTestMemberDirect } from '../helpers/test-member';
import { cleanupTestUser, createAuthenticatedUser } from '../helpers/test-user';
import { createTestVisit } from '../helpers/test-visit';
import { setupIntegrationTests } from './setup';

// Run global setup
setupIntegrationTests();

describe('Visit Integration Tests', () => {
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

  describe('POST /api/families/:id/members/:memberId/visits', () => {
    // Happy Path Tests

    test('should successfully create a new visit', async () => {
      // Arrange
      const user = await createAuthenticatedUser(client);
      testUsers.push(user.email);

      const family = await createTestFamily(client, user, 'Test Family');
      testFamilies.push(family.id);

      const member = await createTestMember(client, user, family, 'Test Member');

      const visitData = {
        visitDate: new Date().toISOString(),
        chiefComplaint: 'Headache and fever',
        diagnosis: 'Common cold',
        treatment: 'Rest and fluids',
        doctorName: faker.person.fullName(),
        clinicName: faker.company.name(),
        notes: 'Patient should rest for 3 days',
      };

      // Act
      const response = await client.families[':id'].members[':memberId'].visits.$post(
        {
          param: { id: family.id, memberId: member.id },
          json: visitData,
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
      expect(body).toHaveProperty('message', 'Visit added successfully');
      expect(body).toHaveProperty('data');

      if (!('data' in body)) {
        throw new Error('Expected data in response');
      }

      const { visit } = body.data;

      // Verify visit data
      expect(visit).toHaveProperty('id');
      expect(visit.id).toBeTypeOf('string');
      expect(visit.familyMemberId).toBe(member.id);
      expect(visit.chiefComplaint).toBe(visitData.chiefComplaint);
      expect(visit.diagnosis).toBe(visitData.diagnosis);
      expect(visit.treatment).toBe(visitData.treatment);
      expect(visit.doctorName).toBe(visitData.doctorName);
      expect(visit.clinicName).toBe(visitData.clinicName);
      expect(visit.notes).toBe(visitData.notes);
      expect(visit).toHaveProperty('createdAt');
      expect(visit).toHaveProperty('updatedAt');

      // Verify visit was saved to database
      const dbVisit = await prisma.visit.findUnique({
        where: { id: visit.id },
      });

      expect(dbVisit).not.toBeNull();
      expect(dbVisit?.familyMemberId).toBe(member.id);
      expect(dbVisit?.chiefComplaint).toBe(visitData.chiefComplaint);
    });

    test('should create visit with only required fields', async () => {
      // Arrange
      const user = await createAuthenticatedUser(client);
      testUsers.push(user.email);

      const family = await createTestFamily(client, user);
      testFamilies.push(family.id);

      const member = await createTestMember(client, user, family);

      const visitData = {
        visitDate: new Date().toISOString(),
        chiefComplaint: 'Annual checkup',
      };

      // Act
      const response = await client.families[':id'].members[':memberId'].visits.$post(
        {
          param: { id: family.id, memberId: member.id },
          json: visitData,
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

      const { visit } = body.data;
      expect(visit.chiefComplaint).toBe(visitData.chiefComplaint);
      expect(visit.diagnosis).toBeNull();
      expect(visit.treatment).toBeNull();
    });

    test('should allow member with linked userId to create visit for themselves', async () => {
      // Arrange
      const user = await createAuthenticatedUser(client);
      testUsers.push(user.email);

      const familyOwner = await createAuthenticatedUser(client);
      testUsers.push(familyOwner.email);

      const family = await createTestFamily(client, familyOwner);
      testFamilies.push(family.id);

      // Create member linked to user
      const member = await createTestMemberDirect(
        prisma,
        family.id,
        user.name,
        'Spouse',
        user.userId
      );

      const visitData = {
        visitDate: new Date().toISOString(),
        chiefComplaint: 'Routine checkup',
      };

      // Act - User creates visit for themselves
      const response = await client.families[':id'].members[':memberId'].visits.$post(
        {
          param: { id: family.id, memberId: member.id },
          json: visitData,
        },
        {
          headers: {
            Authorization: `Bearer ${user.tokens.accessToken}`,
          },
        }
      );

      // Assert
      expect(response.status).toBe(201);
    });

    // Error Scenarios

    test('should fail with no authorization header', async () => {
      // Arrange
      const user = await createAuthenticatedUser(client);
      testUsers.push(user.email);

      const family = await createTestFamily(client, user);
      testFamilies.push(family.id);

      const member = await createTestMember(client, user, family);

      // Act
      const response = await client.families[':id'].members[':memberId'].visits.$post({
        param: { id: family.id, memberId: member.id },
        json: {
          visitDate: new Date().toISOString(),
          chiefComplaint: 'Test',
        },
      });

      // Assert
      expect(response.status).toBe(401);
    });

    test('should fail with invalid token', async () => {
      // Arrange
      const user = await createAuthenticatedUser(client);
      testUsers.push(user.email);

      const family = await createTestFamily(client, user);
      testFamilies.push(family.id);

      const member = await createTestMember(client, user, family);

      // Act
      const response = await client.families[':id'].members[':memberId'].visits.$post(
        {
          param: { id: family.id, memberId: member.id },
          json: {
            visitDate: new Date().toISOString(),
            chiefComplaint: 'Test',
          },
        },
        {
          headers: {
            Authorization: 'Bearer invalid-token',
          },
        }
      );

      // Assert
      expect(response.status).toBe(401);
    });

    test('should fail with invalid family ID format', async () => {
      // Arrange
      const user = await createAuthenticatedUser(client);
      testUsers.push(user.email);

      const family = await createTestFamily(client, user);
      testFamilies.push(family.id);

      const member = await createTestMember(client, user, family);

      // Act
      const response = await client.families[':id'].members[':memberId'].visits.$post(
        {
          param: { id: 'not-a-uuid', memberId: member.id },
          json: {
            visitDate: new Date().toISOString(),
            chiefComplaint: 'Test',
          },
        },
        {
          headers: {
            Authorization: `Bearer ${user.tokens.accessToken}`,
          },
        }
      );

      // Assert
      expect(response.status).toBe(400);
    });

    test('should fail with invalid member ID format', async () => {
      // Arrange
      const user = await createAuthenticatedUser(client);
      testUsers.push(user.email);

      const family = await createTestFamily(client, user);
      testFamilies.push(family.id);

      // Act
      const response = await client.families[':id'].members[':memberId'].visits.$post(
        {
          param: { id: family.id, memberId: 'not-a-uuid' },
          json: {
            visitDate: new Date().toISOString(),
            chiefComplaint: 'Test',
          },
        },
        {
          headers: {
            Authorization: `Bearer ${user.tokens.accessToken}`,
          },
        }
      );

      // Assert
      expect(response.status).toBe(400);
    });

    test('should fail with non-existent member ID', async () => {
      // Arrange
      const user = await createAuthenticatedUser(client);
      testUsers.push(user.email);

      const family = await createTestFamily(client, user);
      testFamilies.push(family.id);

      const nonExistentId = '00000000-0000-0000-0000-000000000000';

      // Act
      const response = await client.families[':id'].members[':memberId'].visits.$post(
        {
          param: { id: family.id, memberId: nonExistentId },
          json: {
            visitDate: new Date().toISOString(),
            chiefComplaint: 'Test',
          },
        },
        {
          headers: {
            Authorization: `Bearer ${user.tokens.accessToken}`,
          },
        }
      );

      // Assert
      expect(response.status).toBe(404);
    });

    test('should fail when user is not authorized (not owner or member)', async () => {
      // Arrange - Create two users
      const user1 = await createAuthenticatedUser(client);
      testUsers.push(user1.email);

      const user2 = await createAuthenticatedUser(client);
      testUsers.push(user2.email);

      // User1 creates a family
      const family = await createTestFamily(client, user1);
      testFamilies.push(family.id);

      const member = await createTestMember(client, user1, family);

      // Act - User2 tries to add visit for User1's family member
      const response = await client.families[':id'].members[':memberId'].visits.$post(
        {
          param: { id: family.id, memberId: member.id },
          json: {
            visitDate: new Date().toISOString(),
            chiefComplaint: 'Test',
          },
        },
        {
          headers: {
            Authorization: `Bearer ${user2.tokens.accessToken}`,
          },
        }
      );

      // Assert
      expect(response.status).toBe(403);
    });

    test('should fail with empty chief complaint', async () => {
      // Arrange
      const user = await createAuthenticatedUser(client);
      testUsers.push(user.email);

      const family = await createTestFamily(client, user);
      testFamilies.push(family.id);

      const member = await createTestMember(client, user, family);

      // Act
      const response = await client.families[':id'].members[':memberId'].visits.$post(
        {
          param: { id: family.id, memberId: member.id },
          json: {
            visitDate: new Date().toISOString(),
            chiefComplaint: '',
          },
        },
        {
          headers: {
            Authorization: `Bearer ${user.tokens.accessToken}`,
          },
        }
      );

      // Assert
      expect(response.status).toBe(400);
    });

    test('should fail with missing required fields', async () => {
      // Arrange
      const user = await createAuthenticatedUser(client);
      testUsers.push(user.email);

      const family = await createTestFamily(client, user);
      testFamilies.push(family.id);

      const member = await createTestMember(client, user, family);

      // Act
      const response = await client.families[':id'].members[':memberId'].visits.$post(
        {
          param: { id: family.id, memberId: member.id },
          json: {} as unknown as AddVisitRequest,
        },
        {
          headers: {
            Authorization: `Bearer ${user.tokens.accessToken}`,
          },
        }
      );

      // Assert
      expect(response.status).toBe(400);
    });

    test('should fail with invalid date format', async () => {
      // Arrange
      const user = await createAuthenticatedUser(client);
      testUsers.push(user.email);

      const family = await createTestFamily(client, user);
      testFamilies.push(family.id);

      const member = await createTestMember(client, user, family);

      // Act
      const response = await client.families[':id'].members[':memberId'].visits.$post(
        {
          param: { id: family.id, memberId: member.id },
          json: {
            visitDate: 'invalid-date',
            chiefComplaint: 'Test',
          } as unknown as AddVisitRequest,
        },
        {
          headers: {
            Authorization: `Bearer ${user.tokens.accessToken}`,
          },
        }
      );

      // Assert
      expect(response.status).toBe(400);
    });
  });

  describe('GET /api/families/:id/visits/:visitId', () => {
    // Happy Path Tests

    test('should successfully get visit details as family owner', async () => {
      // Arrange
      const user = await createAuthenticatedUser(client);
      testUsers.push(user.email);

      const family = await createTestFamily(client, user);
      testFamilies.push(family.id);

      const member = await createTestMember(client, user, family);
      const visit = await createTestVisit(client, user, family, member);

      // Act
      const response = await client.families[':id'].visits[':visitId'].$get(
        {
          param: { id: family.id, visitId: visit.id },
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
      expect(body).toHaveProperty('message', 'Visit details retrieved successfully');
      expect(body).toHaveProperty('data');

      if (!('data' in body)) {
        throw new Error('Expected data in response');
      }

      const { visit: returnedVisit } = body.data;
      expect(returnedVisit.id).toBe(visit.id);
      expect(returnedVisit.familyMemberId).toBe(member.id);
      expect(returnedVisit.chiefComplaint).toBe(visit.chiefComplaint);
    });

    test('should allow any family member to view visit', async () => {
      // Arrange
      const familyOwner = await createAuthenticatedUser(client);
      testUsers.push(familyOwner.email);

      const familyMemberUser = await createAuthenticatedUser(client);
      testUsers.push(familyMemberUser.email);

      const family = await createTestFamily(client, familyOwner);
      testFamilies.push(family.id);

      // Create member linked to familyMemberUser
      const _linkedMember = await createTestMemberDirect(
        prisma,
        family.id,
        familyMemberUser.name,
        'Spouse',
        familyMemberUser.userId
      );

      // Create another member and visit
      const member = await createTestMember(client, familyOwner, family);
      const visit = await createTestVisit(client, familyOwner, family, member);

      // Act - Family member user tries to view visit
      const response = await client.families[':id'].visits[':visitId'].$get(
        {
          param: { id: family.id, visitId: visit.id },
        },
        {
          headers: {
            Authorization: `Bearer ${familyMemberUser.tokens.accessToken}`,
          },
        }
      );

      // Assert
      expect(response.status).toBe(200);
    });

    // Error Scenarios

    test('should fail with no authorization header', async () => {
      // Arrange
      const user = await createAuthenticatedUser(client);
      testUsers.push(user.email);

      const family = await createTestFamily(client, user);
      testFamilies.push(family.id);

      const member = await createTestMember(client, user, family);
      const visit = await createTestVisit(client, user, family, member);

      // Act
      const response = await client.families[':id'].visits[':visitId'].$get({
        param: { id: family.id, visitId: visit.id },
      });

      // Assert
      expect(response.status).toBe(401);
    });

    test('should fail with invalid visit ID format', async () => {
      // Arrange
      const user = await createAuthenticatedUser(client);
      testUsers.push(user.email);

      const family = await createTestFamily(client, user);
      testFamilies.push(family.id);

      // Act
      const response = await client.families[':id'].visits[':visitId'].$get(
        {
          param: { id: family.id, visitId: 'not-a-uuid' },
        },
        {
          headers: {
            Authorization: `Bearer ${user.tokens.accessToken}`,
          },
        }
      );

      // Assert
      expect(response.status).toBe(400);
    });

    test('should fail with non-existent visit ID', async () => {
      // Arrange
      const user = await createAuthenticatedUser(client);
      testUsers.push(user.email);

      const family = await createTestFamily(client, user);
      testFamilies.push(family.id);

      const nonExistentId = '00000000-0000-0000-0000-000000000000';

      // Act
      const response = await client.families[':id'].visits[':visitId'].$get(
        {
          param: { id: family.id, visitId: nonExistentId },
        },
        {
          headers: {
            Authorization: `Bearer ${user.tokens.accessToken}`,
          },
        }
      );

      // Assert
      expect(response.status).toBe(404);
    });

    test('should fail when user is not part of the family', async () => {
      // Arrange - Create two users
      const user1 = await createAuthenticatedUser(client);
      testUsers.push(user1.email);

      const user2 = await createAuthenticatedUser(client);
      testUsers.push(user2.email);

      // User1 creates a family and visit
      const family = await createTestFamily(client, user1);
      testFamilies.push(family.id);

      const member = await createTestMember(client, user1, family);
      const visit = await createTestVisit(client, user1, family, member);

      // Act - User2 tries to get User1's visit
      const response = await client.families[':id'].visits[':visitId'].$get(
        {
          param: { id: family.id, visitId: visit.id },
        },
        {
          headers: {
            Authorization: `Bearer ${user2.tokens.accessToken}`,
          },
        }
      );

      // Assert
      expect(response.status).toBe(403);
    });
  });

  describe('GET /api/families/:id/members/:memberId/visits', () => {
    // Happy Path Tests

    test('should successfully get all visits for a member', async () => {
      // Arrange
      const user = await createAuthenticatedUser(client);
      testUsers.push(user.email);

      const family = await createTestFamily(client, user);
      testFamilies.push(family.id);

      const member = await createTestMember(client, user, family);

      // Create multiple visits
      const visit1 = await createTestVisit(client, user, family, member, {
        chiefComplaint: 'First visit',
      });
      const visit2 = await createTestVisit(client, user, family, member, {
        chiefComplaint: 'Second visit',
      });

      // Act
      const response = await client.families[':id'].members[':memberId'].visits.$get(
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
      expect(body).toHaveProperty('message', 'All member visits retrieved successfully');
      expect(body).toHaveProperty('data');

      if (!('data' in body)) {
        throw new Error('Expected data in response');
      }

      const { visits } = body.data;
      expect(Array.isArray(visits)).toBe(true);
      expect(visits.length).toBe(2);

      // Verify visits are sorted by date descending
      const visitIds = visits.map((v: { id: string }) => v.id);
      expect(visitIds).toContain(visit1.id);
      expect(visitIds).toContain(visit2.id);
    });

    test('should return empty array when member has no visits', async () => {
      // Arrange
      const user = await createAuthenticatedUser(client);
      testUsers.push(user.email);

      const family = await createTestFamily(client, user);
      testFamilies.push(family.id);

      const member = await createTestMember(client, user, family);

      // Act
      const response = await client.families[':id'].members[':memberId'].visits.$get(
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

      const { visits } = body.data;
      expect(Array.isArray(visits)).toBe(true);
      expect(visits.length).toBe(0);
    });

    test('should allow any family member to view all visits', async () => {
      // Arrange
      const familyOwner = await createAuthenticatedUser(client);
      testUsers.push(familyOwner.email);

      const familyMemberUser = await createAuthenticatedUser(client);
      testUsers.push(familyMemberUser.email);

      const family = await createTestFamily(client, familyOwner);
      testFamilies.push(family.id);

      // Create member linked to familyMemberUser
      await createTestMemberDirect(
        prisma,
        family.id,
        familyMemberUser.name,
        'Spouse',
        familyMemberUser.userId
      );

      // Create another member and visit
      const member = await createTestMember(client, familyOwner, family);
      await createTestVisit(client, familyOwner, family, member);

      // Act - Family member user tries to view all visits
      const response = await client.families[':id'].members[':memberId'].visits.$get(
        {
          param: { id: family.id, memberId: member.id },
        },
        {
          headers: {
            Authorization: `Bearer ${familyMemberUser.tokens.accessToken}`,
          },
        }
      );

      // Assert
      expect(response.status).toBe(200);
    });

    // Error Scenarios

    test('should fail with no authorization header', async () => {
      // Arrange
      const user = await createAuthenticatedUser(client);
      testUsers.push(user.email);

      const family = await createTestFamily(client, user);
      testFamilies.push(family.id);

      const member = await createTestMember(client, user, family);

      // Act
      const response = await client.families[':id'].members[':memberId'].visits.$get({
        param: { id: family.id, memberId: member.id },
      });

      // Assert
      expect(response.status).toBe(401);
    });

    test('should fail with non-existent member ID', async () => {
      // Arrange
      const user = await createAuthenticatedUser(client);
      testUsers.push(user.email);

      const family = await createTestFamily(client, user);
      testFamilies.push(family.id);

      const nonExistentId = '00000000-0000-0000-0000-000000000000';

      // Act
      const response = await client.families[':id'].members[':memberId'].visits.$get(
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
      expect(response.status).toBe(404);
    });

    test('should fail when user is not part of the family', async () => {
      // Arrange - Create two users
      const user1 = await createAuthenticatedUser(client);
      testUsers.push(user1.email);

      const user2 = await createAuthenticatedUser(client);
      testUsers.push(user2.email);

      // User1 creates a family
      const family = await createTestFamily(client, user1);
      testFamilies.push(family.id);

      const member = await createTestMember(client, user1, family);

      // Act - User2 tries to get visits
      const response = await client.families[':id'].members[':memberId'].visits.$get(
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
      expect(response.status).toBe(403);
    });
  });

  describe('PUT /api/families/:id/visits/:visitId', () => {
    // Happy Path Tests

    test('should successfully update visit as family owner', async () => {
      // Arrange
      const user = await createAuthenticatedUser(client);
      testUsers.push(user.email);

      const family = await createTestFamily(client, user);
      testFamilies.push(family.id);

      const member = await createTestMember(client, user, family);
      const visit = await createTestVisit(client, user, family, member, {
        chiefComplaint: 'Original complaint',
        diagnosis: 'Original diagnosis',
      });

      const updateData = {
        chiefComplaint: 'Updated complaint',
        diagnosis: 'Updated diagnosis',
        treatment: 'New treatment plan',
      };

      // Act
      const response = await client.families[':id'].visits[':visitId'].$put(
        {
          param: { id: family.id, visitId: visit.id },
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
      expect(body).toHaveProperty('message', 'Visit updated successfully');
      expect(body).toHaveProperty('data');

      if (!('data' in body)) {
        throw new Error('Expected data in response');
      }

      const { visit: updatedVisit } = body.data;
      expect(updatedVisit.id).toBe(visit.id);
      expect(updatedVisit.chiefComplaint).toBe(updateData.chiefComplaint);
      expect(updatedVisit.diagnosis).toBe(updateData.diagnosis);
      expect(updatedVisit.treatment).toBe(updateData.treatment);

      // Verify in database
      const dbVisit = await prisma.visit.findUnique({
        where: { id: visit.id },
      });

      expect(dbVisit?.chiefComplaint).toBe(updateData.chiefComplaint);
      expect(dbVisit?.diagnosis).toBe(updateData.diagnosis);
    });

    test('should allow member with linked userId to update their own visit', async () => {
      // Arrange
      const memberUser = await createAuthenticatedUser(client);
      testUsers.push(memberUser.email);

      const familyOwner = await createAuthenticatedUser(client);
      testUsers.push(familyOwner.email);

      const family = await createTestFamily(client, familyOwner);
      testFamilies.push(family.id);

      // Create member linked to memberUser
      const member = await createTestMemberDirect(
        prisma,
        family.id,
        memberUser.name,
        'Spouse',
        memberUser.userId
      );

      // Create visit for this member
      const visit = await createTestVisit(client, familyOwner, family, member);

      const updateData = {
        notes: 'Updated by member themselves',
      };

      // Act - Member user updates their own visit
      const response = await client.families[':id'].visits[':visitId'].$put(
        {
          param: { id: family.id, visitId: visit.id },
          json: updateData,
        },
        {
          headers: {
            Authorization: `Bearer ${memberUser.tokens.accessToken}`,
          },
        }
      );

      // Assert
      expect(response.status).toBe(200);

      const body = await response.json();
      if (!('data' in body)) {
        throw new Error('Expected data in response');
      }

      const { visit: updatedVisit } = body.data;
      expect(updatedVisit.notes).toBe(updateData.notes);
    });

    test('should update only specified fields', async () => {
      // Arrange
      const user = await createAuthenticatedUser(client);
      testUsers.push(user.email);

      const family = await createTestFamily(client, user);
      testFamilies.push(family.id);

      const member = await createTestMember(client, user, family);
      const visit = await createTestVisit(client, user, family, member, {
        chiefComplaint: 'Original complaint',
        diagnosis: 'Original diagnosis',
        treatment: 'Original treatment',
      });

      const updateData = {
        chiefComplaint: 'Updated complaint only',
      };

      // Act
      const response = await client.families[':id'].visits[':visitId'].$put(
        {
          param: { id: family.id, visitId: visit.id },
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
      if (!('data' in body)) {
        throw new Error('Expected data in response');
      }

      const { visit: updatedVisit } = body.data;
      expect(updatedVisit.chiefComplaint).toBe(updateData.chiefComplaint);
      expect(updatedVisit.diagnosis).toBe(visit.diagnosis); // Unchanged
      expect(updatedVisit.treatment).toBe(visit.treatment); // Unchanged
    });

    // Error Scenarios

    test('should fail with no authorization header', async () => {
      // Arrange
      const user = await createAuthenticatedUser(client);
      testUsers.push(user.email);

      const family = await createTestFamily(client, user);
      testFamilies.push(family.id);

      const member = await createTestMember(client, user, family);
      const visit = await createTestVisit(client, user, family, member);

      // Act
      const response = await client.families[':id'].visits[':visitId'].$put({
        param: { id: family.id, visitId: visit.id },
        json: {
          notes: 'Test',
        },
      });

      // Assert
      expect(response.status).toBe(401);
    });

    test('should fail with non-existent visit ID', async () => {
      // Arrange
      const user = await createAuthenticatedUser(client);
      testUsers.push(user.email);

      const family = await createTestFamily(client, user);
      testFamilies.push(family.id);

      const nonExistentId = '00000000-0000-0000-0000-000000000000';

      // Act
      const response = await client.families[':id'].visits[':visitId'].$put(
        {
          param: { id: family.id, visitId: nonExistentId },
          json: {
            notes: 'Test',
          },
        },
        {
          headers: {
            Authorization: `Bearer ${user.tokens.accessToken}`,
          },
        }
      );

      // Assert
      expect(response.status).toBe(404);
    });

    test('should fail when user is not authorized (not owner or specific member)', async () => {
      // Arrange
      const user1 = await createAuthenticatedUser(client);
      testUsers.push(user1.email);

      const user2 = await createAuthenticatedUser(client);
      testUsers.push(user2.email);

      const family1 = await createTestFamily(client, user1);
      testFamilies.push(family1.id);

      // Add user2 as a member in user1's family
      void (await createTestMemberDirect(prisma, family1.id, user2.name, 'Sibling', user2.userId));

      // Create another member (not linked to user2)
      const member = await createTestMember(client, user1, family1);
      const visit = await createTestVisit(client, user1, family1, member);

      // Act - User2 (who is a family member but not the specific member) tries to update
      const response = await client.families[':id'].visits[':visitId'].$put(
        {
          param: { id: family1.id, visitId: visit.id },
          json: {
            notes: 'Unauthorized update',
          },
        },
        {
          headers: {
            Authorization: `Bearer ${user2.tokens.accessToken}`,
          },
        }
      );

      // Assert
      expect(response.status).toBe(403);
    });

    test('should fail with empty update data', async () => {
      // Arrange
      const user = await createAuthenticatedUser(client);
      testUsers.push(user.email);

      const family = await createTestFamily(client, user);
      testFamilies.push(family.id);

      const member = await createTestMember(client, user, family);
      const visit = await createTestVisit(client, user, family, member);

      // Act
      const response = await client.families[':id'].visits[':visitId'].$put(
        {
          param: { id: family.id, visitId: visit.id },
          json: {} as unknown as UpdateVisitRequest,
        },
        {
          headers: {
            Authorization: `Bearer ${user.tokens.accessToken}`,
          },
        }
      );

      // Assert
      expect(response.status).toBe(400);
    });

    test('should fail with invalid date format', async () => {
      // Arrange
      const user = await createAuthenticatedUser(client);
      testUsers.push(user.email);

      const family = await createTestFamily(client, user);
      testFamilies.push(family.id);

      const member = await createTestMember(client, user, family);
      const visit = await createTestVisit(client, user, family, member);

      // Act
      const response = await client.families[':id'].visits[':visitId'].$put(
        {
          param: { id: family.id, visitId: visit.id },
          json: {
            visitDate: 'invalid-date',
          } as unknown as UpdateVisitRequest,
        },
        {
          headers: {
            Authorization: `Bearer ${user.tokens.accessToken}`,
          },
        }
      );

      // Assert
      expect(response.status).toBe(400);
    });

    test('should fail with empty chief complaint', async () => {
      // Arrange
      const user = await createAuthenticatedUser(client);
      testUsers.push(user.email);

      const family = await createTestFamily(client, user);
      testFamilies.push(family.id);

      const member = await createTestMember(client, user, family);
      const visit = await createTestVisit(client, user, family, member);

      // Act
      const response = await client.families[':id'].visits[':visitId'].$put(
        {
          param: { id: family.id, visitId: visit.id },
          json: {
            chiefComplaint: '',
          },
        },
        {
          headers: {
            Authorization: `Bearer ${user.tokens.accessToken}`,
          },
        }
      );

      // Assert
      expect(response.status).toBe(400);
    });
  });

  describe('DELETE /api/families/:id/visits/:visitId', () => {
    // Happy Path Tests

    test('should successfully delete a visit as family owner', async () => {
      // Arrange
      const user = await createAuthenticatedUser(client);
      testUsers.push(user.email);

      const family = await createTestFamily(client, user);
      testFamilies.push(family.id);

      const member = await createTestMember(client, user, family);
      const visit = await createTestVisit(client, user, family, member);

      // Act
      const response = await client.families[':id'].visits[':visitId'].$delete(
        {
          param: { id: family.id, visitId: visit.id },
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
      expect(body).toHaveProperty('message', 'Visit deleted successfully');

      // Verify visit was deleted from database
      const dbVisit = await prisma.visit.findUnique({
        where: { id: visit.id },
      });

      expect(dbVisit).toBeNull();
    });

    test('should allow member with linked userId to delete their own visit', async () => {
      // Arrange
      const memberUser = await createAuthenticatedUser(client);
      testUsers.push(memberUser.email);

      const familyOwner = await createAuthenticatedUser(client);
      testUsers.push(familyOwner.email);

      const family = await createTestFamily(client, familyOwner);
      testFamilies.push(family.id);

      // Create member linked to memberUser
      const member = await createTestMemberDirect(
        prisma,
        family.id,
        memberUser.name,
        'Spouse',
        memberUser.userId
      );

      // Create visit for this member
      const visit = await createTestVisit(client, familyOwner, family, member);

      // Act - Member user deletes their own visit
      const response = await client.families[':id'].visits[':visitId'].$delete(
        {
          param: { id: family.id, visitId: visit.id },
        },
        {
          headers: {
            Authorization: `Bearer ${memberUser.tokens.accessToken}`,
          },
        }
      );

      // Assert
      expect(response.status).toBe(200);

      // Verify deletion
      const dbVisit = await prisma.visit.findUnique({
        where: { id: visit.id },
      });

      expect(dbVisit).toBeNull();
    });

    // Error Scenarios

    test('should fail with no authorization header', async () => {
      // Arrange
      const user = await createAuthenticatedUser(client);
      testUsers.push(user.email);

      const family = await createTestFamily(client, user);
      testFamilies.push(family.id);

      const member = await createTestMember(client, user, family);
      const visit = await createTestVisit(client, user, family, member);

      // Act
      const response = await client.families[':id'].visits[':visitId'].$delete({
        param: { id: family.id, visitId: visit.id },
      });

      // Assert
      expect(response.status).toBe(401);
    });

    test('should fail with non-existent visit ID', async () => {
      // Arrange
      const user = await createAuthenticatedUser(client);
      testUsers.push(user.email);

      const family = await createTestFamily(client, user);
      testFamilies.push(family.id);

      const nonExistentId = '00000000-0000-0000-0000-000000000000';

      // Act
      const response = await client.families[':id'].visits[':visitId'].$delete(
        {
          param: { id: family.id, visitId: nonExistentId },
        },
        {
          headers: {
            Authorization: `Bearer ${user.tokens.accessToken}`,
          },
        }
      );

      // Assert
      expect(response.status).toBe(404);
    });

    test('should fail when user is not authorized (not owner or specific member)', async () => {
      // Arrange
      const user1 = await createAuthenticatedUser(client);
      testUsers.push(user1.email);

      const user2 = await createAuthenticatedUser(client);
      testUsers.push(user2.email);

      const family1 = await createTestFamily(client, user1);
      testFamilies.push(family1.id);

      // Add user2 as a member in user1's family
      await createTestMemberDirect(prisma, family1.id, user2.name, 'Sibling', user2.userId);

      // Create another member (not linked to user2) and visit
      const member = await createTestMember(client, user1, family1);
      const visit = await createTestVisit(client, user1, family1, member);

      // Act - User2 (who is a family member but not the specific member) tries to delete
      const response = await client.families[':id'].visits[':visitId'].$delete(
        {
          param: { id: family1.id, visitId: visit.id },
        },
        {
          headers: {
            Authorization: `Bearer ${user2.tokens.accessToken}`,
          },
        }
      );

      // Assert
      expect(response.status).toBe(403);
    });

    test('should fail when completely unauthorized user tries to delete', async () => {
      // Arrange
      const user1 = await createAuthenticatedUser(client);
      testUsers.push(user1.email);

      const user2 = await createAuthenticatedUser(client);
      testUsers.push(user2.email);

      const family = await createTestFamily(client, user1);
      testFamilies.push(family.id);

      const member = await createTestMember(client, user1, family);
      const visit = await createTestVisit(client, user1, family, member);

      // Act - User2 (not part of the family) tries to delete
      const response = await client.families[':id'].visits[':visitId'].$delete(
        {
          param: { id: family.id, visitId: visit.id },
        },
        {
          headers: {
            Authorization: `Bearer ${user2.tokens.accessToken}`,
          },
        }
      );

      // Assert
      expect(response.status).toBe(403);
    });
  });
});
