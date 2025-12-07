import { faker } from '@faker-js/faker';
import type { PrismaClient } from '@prisma/client';
import type { TestClient } from './test-client';
import type { TestFamily } from './test-family';
import type { TestMember } from './test-member';
import type { AuthenticatedTestUser } from './test-user';

/**
 * Medication test data structure
 */
export interface TestMedication {
  id: string;
  familyMemberId: string;
  name: string;
  dosage: string | null;
  frequency: string | null;
  isActive: boolean;
}

/**
 * Create a test medication for a family member
 */
export async function createTestMedication(
  client: TestClient,
  user: AuthenticatedTestUser,
  family: TestFamily,
  member: TestMember,
  options?: {
    name?: string;
    dosage?: string;
    frequency?: string;
    startDate?: string;
    endDate?: string;
    prescribingDoctor?: string;
    notes?: string;
    isActive?: boolean;
    visitId?: string;
  }
): Promise<TestMedication> {
  const medicationData = {
    name: options?.name ?? `${faker.word.adjective()} ${faker.word.noun()}`,
    dosage: options?.dosage ?? '100mg',
    frequency: options?.frequency ?? 'Twice daily',
    startDate: options?.startDate,
    endDate: options?.endDate,
    prescribingDoctor: options?.prescribingDoctor,
    notes: options?.notes,
    isActive: options?.isActive ?? true,
    visitId: options?.visitId,
  };

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

  if (!response.ok) {
    throw new Error(`Failed to create test medication: ${response.status}`);
  }

  const body = await response.json();

  if (!('data' in body)) {
    throw new Error('Expected data in response');
  }

  return {
    id: body.data.medication.id,
    familyMemberId: body.data.medication.familyMemberId,
    name: body.data.medication.name,
    dosage: body.data.medication.dosage,
    frequency: body.data.medication.frequency,
    isActive: body.data.medication.isActive,
  };
}

/**
 * Create a medication directly in the database (useful for complex test scenarios)
 */
export async function createTestMedicationDirect(
  prisma: PrismaClient,
  memberId: string,
  options?: {
    name?: string;
    dosage?: string;
    frequency?: string;
    startDate?: Date;
    endDate?: Date;
    prescribingDoctor?: string;
    notes?: string;
    isActive?: boolean;
    visitId?: string;
  }
): Promise<TestMedication> {
  const medication = await prisma.medication.create({
    data: {
      familyMemberId: memberId,
      name: options?.name ?? `${faker.word.adjective()} ${faker.word.noun()}`,
      dosage: options?.dosage ?? '100mg',
      frequency: options?.frequency ?? 'Twice daily',
      startDate: options?.startDate,
      endDate: options?.endDate,
      prescribingDoctor: options?.prescribingDoctor,
      notes: options?.notes,
      isActive: options?.isActive ?? true,
      visitId: options?.visitId,
    },
  });

  return {
    id: medication.id,
    familyMemberId: medication.familyMemberId,
    name: medication.name,
    dosage: medication.dosage,
    frequency: medication.frequency,
    isActive: medication.isActive,
  };
}

/**
 * Cleanup medication data
 */
export async function cleanupTestMedication(
  prisma: PrismaClient,
  medicationId: string
): Promise<void> {
  try {
    await prisma.medication.delete({ where: { id: medicationId } });
  } catch (_error) {
    // Medication might not exist, ignore
  }
}

/**
 * Cleanup multiple medications
 */
export async function cleanupTestMedications(
  prisma: PrismaClient,
  medicationIds: string[]
): Promise<void> {
  for (const medicationId of medicationIds) {
    await cleanupTestMedication(prisma, medicationId);
  }
}
