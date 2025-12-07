import type { PrismaClient } from '@prisma/client';
import type { TestClient } from './test-client';
import type { AuthenticatedTestUser } from './test-user';

/**
 * Family test data structure
 */
export interface TestFamily {
  id: string;
  name: string;
  ownerId: string;
}

/**
 * Create a family for a test user
 */
export async function createTestFamily(
  client: TestClient,
  user: AuthenticatedTestUser,
  name: string = 'Test Family'
): Promise<TestFamily> {
  const response = await client.families.$post(
    {
      json: { name },
    },
    {
      headers: {
        Authorization: `Bearer ${user.tokens.accessToken}`,
      },
    }
  );

  if (!response.ok) {
    throw new Error(`Failed to create test family: ${response.status}`);
  }

  const body = await response.json();

  if (!('data' in body)) {
    throw new Error('Expected data in response');
  }

  return {
    id: body.data.family.id,
    name: body.data.family.name,
    ownerId: body.data.family.ownerId,
  };
}

/**
 * Create a family member with a linked user account
 * This is useful for testing transfer ownership
 */
export async function createFamilyMemberWithUser(
  prisma: PrismaClient,
  familyId: string,
  userId: string,
  memberName: string = 'Test Member'
) {
  return await prisma.familyMember.create({
    data: {
      name: memberName,
      relationship: 'Child',
      familyId,
      userId,
    },
  });
}

/**
 * Cleanup family and related data
 */
export async function cleanupTestFamily(prisma: PrismaClient, familyId: string): Promise<void> {
  try {
    // Delete in order of dependencies (files are cascade deleted with visits)
    const memberIds = await getFamilyMemberIds(prisma, familyId);
    await prisma.medication.deleteMany({
      where: { familyMemberId: { in: memberIds } },
    });
    await prisma.allergy.deleteMany({
      where: { familyMemberId: { in: memberIds } },
    });
    await prisma.visit.deleteMany({
      where: { familyMemberId: { in: memberIds } },
    });
    await prisma.familyMember.deleteMany({ where: { familyId } });
    await prisma.family.delete({ where: { id: familyId } });
  } catch (_error) {
    // Family might not exist, ignore
  }
}

/**
 * Helper to get all family member IDs for a family
 */
async function getFamilyMemberIds(prisma: PrismaClient, familyId: string): Promise<string[]> {
  const members = await prisma.familyMember.findMany({
    where: { familyId },
    select: { id: true },
  });
  return members.map((m) => m.id);
}
