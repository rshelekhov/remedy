import type { PrismaClient } from '@prisma/client';
import type { PinoLogger } from 'hono-pino';
import type { AuthorizationService } from '../../infrastructure/authorization';
import type { FileStorageService } from '../../infrastructure/storage';
import { deleteS3FilesGracefully, extractS3KeysFromVisit } from '../../infrastructure/storage';

export class DeleteVisitUsecase {
  constructor(
    readonly prisma: PrismaClient,
    readonly authorizationService: AuthorizationService,
    readonly fileStorageService: FileStorageService
  ) {}

  /**
   * Execute delete visit
   *
   * Flow:
   * 1. Fetch visit and verify it belongs to the requested family
   * 2. Verify that userId is family owner OR the specific member the visit belongs to
   * 3. Fetch visit with files to get S3 keys
   * 4. Delete visit from database (cascade deletes files and medications in DB)
   * 5. Delete S3 files
   * 6. Return success
   *
   * Note: Prisma's onDelete: Cascade automatically handles:
   * - Files (through Visit) - DB records only
   * - Medications that reference this visit (visitId is optional in Medication)
   */
  async execute(
    request: {
      userId: string;
      familyId: string;
      visitId: string;
    },
    context: { logger: PinoLogger }
  ): Promise<void> {
    const logger = context.logger.assign({ usecase: 'DeleteVisitUsecase.execute' });

    // Step 1: Fetch visit and verify it belongs to the requested family
    const visit = await this.authorizationService.fetchAndVerifyVisit(
      request.visitId,
      request.familyId,
      logger
    );

    // Step 2: Check authorization - user must be family owner OR the specific member
    await this.authorizationService.verifyOwnerOrSpecificMember(
      request.userId,
      visit.familyMember.family.ownerId,
      visit.familyMember.userId,
      'delete this visit',
      logger
    );

    // Step 3: Fetch visit with files to extract S3 keys
    const visitWithFiles = await this.prisma.visit.findUnique({
      where: { id: request.visitId },
      include: { files: true },
    });

    const s3Keys = visitWithFiles ? extractS3KeysFromVisit(visitWithFiles) : [];

    logger.info(
      {
        visitId: request.visitId,
        familyId: request.familyId,
        filesCount: s3Keys.length,
      },
      'Deleting visit and associated data'
    );

    // Step 4: Delete visit from database
    // Prisma cascade will automatically delete:
    // - Files (through visit) - DB records only
    // - Medications that reference this visit (if visitId is set)
    try {
      await this.prisma.visit.delete({
        where: { id: request.visitId },
      });

      logger.info({ visitId: request.visitId }, 'Visit deleted from database');
    } catch (error) {
      logger.error({ err: error, visitId: request.visitId }, 'Failed to delete visit');
      throw error;
    }

    // Step 5: Delete S3 files gracefully
    await deleteS3FilesGracefully(s3Keys, this.fileStorageService, logger, {
      entityType: 'visitId',
      entityId: request.visitId,
    });
  }
}
