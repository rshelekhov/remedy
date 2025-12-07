import type { PrismaClient } from '@prisma/client';
import type { PinoLogger } from 'hono-pino';
import { ResourceNotFoundError } from '../../errors/domain-errors';
import type { FileStorageService } from '../../infrastructure/storage';
import { deleteS3FilesGracefully, extractS3KeysFromFamily } from '../../infrastructure/storage';

export class DeleteFamilyUsecase {
  constructor(
    readonly prisma: PrismaClient,
    readonly fileStorageService: FileStorageService
  ) {}

  /**
   * Execute delete family
   *
   * Flow:
   * 1. Verify family exists and belongs to user
   * 2. Fetch all S3 keys from associated File records
   * 3. Delete family from database (cascade deletes members, visits, files, medications, allergies)
   * 4. Delete S3 files (graceful error handling - log but don't fail request)
   *
   * Note: Prisma's onDelete: Cascade automatically handles:
   * - FamilyMembers
   * - Visits (through FamilyMembers)
   * - Files (through Visits)
   * - Medications (through FamilyMembers)
   * - Allergies (through FamilyMembers)
   */
  async execute(
    request: { userId: string; familyId: string },
    context: { logger: PinoLogger }
  ): Promise<void> {
    const logger = context.logger.assign({ usecase: 'DeleteFamilyUsecase.execute' });

    // Step 1: Verify family exists and belongs to the user
    // We need to include members -> visits -> files to get all S3 keys
    const family = await this.prisma.family.findFirst({
      where: {
        id: request.familyId,
        ownerId: request.userId,
      },
      include: {
        members: {
          include: {
            visits: {
              include: {
                files: true,
              },
            },
          },
        },
      },
    });

    if (!family) {
      logger.error({ familyId: request.familyId, userId: request.userId }, 'Family not found');
      throw new ResourceNotFoundError('Family', request.familyId);
    }

    // Step 2: Extract all S3 keys from File records
    const s3Keys = extractS3KeysFromFamily(family);

    logger.info(
      {
        familyId: request.familyId,
        membersCount: family.members.length,
        filesCount: s3Keys.length,
      },
      'Deleting family and associated data'
    );

    // Step 3: Delete family from database
    // Prisma cascade will automatically delete:
    // - FamilyMembers
    // - Visits (through members)
    // - Files (through visits) - DB records only
    // - Medications (through members)
    // - Allergies (through members)
    try {
      await this.prisma.family.delete({
        where: { id: request.familyId },
      });

      logger.info({ familyId: request.familyId }, 'Family deleted from database');
    } catch (error) {
      logger.error({ err: error, familyId: request.familyId }, 'Failed to delete family');
      throw error;
    }

    // Step 4: Delete S3 files gracefully
    await deleteS3FilesGracefully(s3Keys, this.fileStorageService, logger, {
      entityType: 'familyId',
      entityId: request.familyId,
    });
  }
}
