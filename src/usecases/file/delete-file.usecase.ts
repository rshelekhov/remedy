import type { PrismaClient } from '@prisma/client';
import type { PinoLogger } from 'hono-pino';
import { ResourceNotFoundError } from '../../errors/domain-errors';
import type { AuthorizationService } from '../../infrastructure/authorization';
import type { FileStorageService } from '../../infrastructure/storage';

/**
 * Delete File Use Case
 * Deletes a file from both database and S3 storage
 */
export class DeleteFileUsecase {
  constructor(
    readonly prisma: PrismaClient,
    readonly authorizationService: AuthorizationService,
    readonly fileStorageService: FileStorageService
  ) {}

  /**
   * Execute delete file
   *
   * Flow:
   * 1. Fetch file with visit and verify file exists
   * 2. Verify visit belongs to the requested family
   * 3. Verify that userId is family owner OR the specific member (STRICT)
   * 4. Delete file from database
   * 5. Delete file from S3 (gracefully)
   */
  async execute(
    request: { userId: string; familyId: string; fileId: string },
    context: { logger: PinoLogger }
  ): Promise<void> {
    const logger = context.logger.assign({ usecase: 'DeleteFileUsecase.execute' });

    // Step 1: Fetch file with visit relations
    const file = await this.prisma.file.findFirst({
      where: { id: request.fileId },
      include: {
        visit: {
          include: {
            familyMember: {
              include: {
                family: true,
              },
            },
          },
        },
      },
    });

    if (!file) {
      logger.error({ fileId: request.fileId }, 'File not found');
      throw new ResourceNotFoundError('File', request.fileId);
    }

    // Step 2: Verify visit belongs to the requested family
    this.authorizationService.verifyResourceBelongsToFamily(
      file.visit.familyMember.familyId,
      request.familyId,
      'File',
      request.fileId,
      logger
    );

    // Step 3: Check authorization - STRICT (only owner or specific member can delete)
    await this.authorizationService.verifyOwnerOrSpecificMember(
      request.userId,
      file.visit.familyMember.family.ownerId,
      file.visit.familyMember.userId,
      'delete files for this visit',
      logger
    );

    const s3Key = file.s3Key;

    // Step 4: Delete file from database
    try {
      await this.prisma.file.delete({
        where: { id: request.fileId },
      });

      logger.info({ fileId: request.fileId }, 'File deleted from database');
    } catch (error) {
      logger.error({ err: error, fileId: request.fileId }, 'Failed to delete file from database');
      throw error;
    }

    // Step 5: Delete file from S3 (gracefully - don't fail if S3 deletion fails)
    try {
      await this.fileStorageService.deleteFiles([s3Key]);
    } catch (error) {
      // Log error but don't fail the request (file is already deleted from DB)
      logger.error(
        { err: error, fileId: request.fileId, s3Key },
        'Failed to delete file from S3 - file may be orphaned'
      );
    }
  }
}
