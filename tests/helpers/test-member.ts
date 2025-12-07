import { faker } from '@faker-js/faker';
import type { PrismaClient } from '@prisma/client';
import type { TestClient } from './test-client';
import type { TestFamily } from './test-family';
import type { AuthenticatedTestUser } from './test-user';

/**
 * Family member test data structure
 */
export interface TestMember {
  id: string;
  familyId: string;
  name: string;
  relationship: string | null;
}

/**
 * Create a family member for testing
 */
export async function createTestMember(
  client: TestClient,
  user: AuthenticatedTestUser,
  family: TestFamily,
  name: string = faker.person.fullName(),
  relationship: string = 'Child'
): Promise<TestMember> {
  const response = await client.families[':id'].members.$post(
    {
      param: { id: family.id },
      json: {
        name,
        relationship,
      },
    },
    {
      headers: {
        Authorization: `Bearer ${user.tokens.accessToken}`,
      },
    }
  );

  if (!response.ok) {
    throw new Error(`Failed to create test member: ${response.status}`);
  }

  const body = await response.json();

  if (!('data' in body)) {
    throw new Error('Expected data in response');
  }

  return {
    id: body.data.member.id,
    familyId: body.data.member.familyId,
    name: body.data.member.name,
    relationship: body.data.member.relationship,
  };
}

/**
 * Create a family member directly in the database (useful for complex test scenarios)
 */
export async function createTestMemberDirect(
  prisma: PrismaClient,
  familyId: string,
  name: string = faker.person.fullName(),
  relationship: string = 'Child',
  userId?: string
): Promise<TestMember> {
  const member = await prisma.familyMember.create({
    data: {
      familyId,
      name,
      relationship,
      userId,
    },
  });

  return {
    id: member.id,
    familyId: member.familyId,
    name: member.name,
    relationship: member.relationship,
  };
}

/**
 * Cleanup member and related data
 */
export async function cleanupTestMember(prisma: PrismaClient, memberId: string): Promise<void> {
  try {
    // Delete related data first (files are cascade deleted with visits)
    await prisma.medication.deleteMany({ where: { familyMemberId: memberId } });
    await prisma.allergy.deleteMany({ where: { familyMemberId: memberId } });
    await prisma.visit.deleteMany({ where: { familyMemberId: memberId } });
    await prisma.familyMember.delete({ where: { id: memberId } });
  } catch (_error) {
    // Member might not exist, ignore
  }
}
