import { faker } from '@faker-js/faker';
import type { PrismaClient } from '@prisma/client';
import type { TestClient } from './test-client';
import type { TestFamily } from './test-family';
import type { TestMember } from './test-member';
import type { AuthenticatedTestUser } from './test-user';

/**
 * Visit test data structure
 */
export interface TestVisit {
  id: string;
  familyMemberId: string;
  visitDate: string;
  chiefComplaint: string;
  diagnosis: string | null;
  treatment: string | null;
  doctorName: string | null;
  clinicName: string | null;
  notes: string | null;
}

/**
 * Create a visit for a family member
 */
export async function createTestVisit(
  client: TestClient,
  user: AuthenticatedTestUser,
  family: TestFamily,
  member: TestMember,
  visitData?: Partial<{
    visitDate: string;
    chiefComplaint: string;
    diagnosis: string;
    treatment: string;
    doctorName: string;
    clinicName: string;
    notes: string;
  }>
): Promise<TestVisit> {
  const defaultData = {
    visitDate: new Date().toISOString(),
    chiefComplaint: faker.lorem.sentence(),
    diagnosis: faker.lorem.sentence(),
    treatment: faker.lorem.sentence(),
    doctorName: faker.person.fullName(),
    clinicName: faker.company.name(),
    notes: faker.lorem.paragraph(),
  };

  const data = { ...defaultData, ...visitData };

  const response = await client.families[':id'].members[':memberId'].visits.$post(
    {
      param: { id: family.id, memberId: member.id },
      json: {
        visitDate: data.visitDate,
        chiefComplaint: data.chiefComplaint,
        diagnosis: data.diagnosis,
        treatment: data.treatment,
        doctorName: data.doctorName,
        clinicName: data.clinicName,
        notes: data.notes,
      },
    },
    {
      headers: {
        Authorization: `Bearer ${user.tokens.accessToken}`,
      },
    }
  );

  if (!response.ok) {
    throw new Error(`Failed to create test visit: ${response.status}`);
  }

  const body = await response.json();

  if (!('data' in body)) {
    throw new Error('Expected data in response');
  }

  return {
    id: body.data.visit.id,
    familyMemberId: body.data.visit.familyMemberId,
    visitDate: body.data.visit.visitDate,
    chiefComplaint: body.data.visit.chiefComplaint,
    diagnosis: body.data.visit.diagnosis,
    treatment: body.data.visit.treatment,
    doctorName: body.data.visit.doctorName,
    clinicName: body.data.visit.clinicName,
    notes: body.data.visit.notes,
  };
}

/**
 * Create a visit directly in the database (useful for complex test scenarios)
 */
export async function createTestVisitDirect(
  prisma: PrismaClient,
  memberId: string,
  visitData?: Partial<{
    visitDate: Date;
    chiefComplaint: string;
    diagnosis: string;
    treatment: string;
    doctorName: string;
    clinicName: string;
    notes: string;
  }>
): Promise<TestVisit> {
  const defaultData = {
    visitDate: new Date(),
    chiefComplaint: faker.lorem.sentence(),
    diagnosis: faker.lorem.sentence(),
    treatment: faker.lorem.sentence(),
    doctorName: faker.person.fullName(),
    clinicName: faker.company.name(),
    notes: faker.lorem.paragraph(),
  };

  const data = { ...defaultData, ...visitData };

  const visit = await prisma.visit.create({
    data: {
      familyMemberId: memberId,
      visitDate: data.visitDate,
      chiefComplaint: data.chiefComplaint,
      diagnosis: data.diagnosis,
      treatment: data.treatment,
      doctorName: data.doctorName,
      clinicName: data.clinicName,
      notes: data.notes,
    },
  });

  return {
    id: visit.id,
    familyMemberId: visit.familyMemberId,
    visitDate: visit.visitDate.toISOString(),
    chiefComplaint: visit.chiefComplaint,
    diagnosis: visit.diagnosis,
    treatment: visit.treatment,
    doctorName: visit.doctorName,
    clinicName: visit.clinicName,
    notes: visit.notes,
  };
}

/**
 * Cleanup visit data
 */
export async function cleanupTestVisit(prisma: PrismaClient, visitId: string): Promise<void> {
  try {
    // Delete related data first
    await prisma.file.deleteMany({ where: { visitId } });
    await prisma.visit.delete({ where: { id: visitId } });
  } catch (_error) {
    // Visit might not exist, ignore
  }
}
