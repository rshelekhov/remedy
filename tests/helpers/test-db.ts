import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';
import { testConfig } from './test-config';

let prismaInstance: PrismaClient | null = null;

/**
 * Get or create Prisma client for tests
 * Uses singleton pattern to reuse connection across tests
 */
export function getTestPrisma(): PrismaClient {
  if (!prismaInstance) {
    const adapter = new PrismaPg({
      connectionString: testConfig.database.url,
    });

    prismaInstance = new PrismaClient({ adapter });
  }

  return prismaInstance;
}

/**
 * Clean up test database - remove all test data
 * Deletes in reverse order of dependencies to avoid foreign key violations
 */
export async function cleanupDatabase(prisma: PrismaClient): Promise<void> {
  // Clean up in reverse order of dependencies
  await prisma.file.deleteMany({});
  await prisma.medication.deleteMany({});
  await prisma.allergy.deleteMany({});
  await prisma.visit.deleteMany({});
  await prisma.familyMember.deleteMany({});
  await prisma.family.deleteMany({});

  // Only delete test users (identified by email domain)
  await prisma.user.deleteMany({
    where: {
      email: {
        endsWith: '@test.remedy.local',
      },
    },
  });
}

/**
 * Disconnect Prisma client and cleanup
 */
export async function disconnectTestDb(): Promise<void> {
  if (prismaInstance) {
    await prismaInstance.$disconnect();
    prismaInstance = null;
  }
}
