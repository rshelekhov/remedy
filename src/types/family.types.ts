import type { Prisma } from '@prisma/client';

/**
 * Family with members relationship included
 * Matches the Prisma query with include: { members: true }
 */
export type FamilyWithMembers = Prisma.FamilyGetPayload<{
  include: { members: true };
}>;
