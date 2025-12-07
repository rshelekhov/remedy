import type { File, PrismaClient } from '@prisma/client';
import type { PinoLogger } from 'hono-pino';
import { ResourceNotFoundError } from '../../errors/domain-errors';
import type { AuthorizationService } from '../../infrastructure/authorization';
import type { FileStorageService } from '../../infrastructure/storage';

/**
 * Get File Use Case
 * Retrieves file metadata and generates a signed download URL
 */
export class GetFileUsecase {
  constructor(
    readonly prisma: PrismaClient,
    readonly authorizationService: AuthorizationService,
    readonly fileStorageService: FileStorageService
  ) {}

  /**
   * Execute get file details and download URL
   *
   * Flow:
   * 1. Fetch file with visit and verify file exists
   * 2. Verify visit belongs to the requested family
   * 3. Verify that userId is family owner or any member of the family (PERMISSIVE)
   * 4. Generate signed download URL
   * 5. Return file metadata and download URL
   */
  async execute(
    request: { userId: string; familyId: string; fileId: string },
    context: { logger: PinoLogger }
  ): Promise<{ file: File; downloadUrl: string }> {
    const logger = context.logger.assign({ usecase: 'GetFileUsecase.execute' });

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

    // Step 3: Check authorization - PERMISSIVE (any family member can download)
    await this.authorizationService.verifyOwnerOrAnyFamilyMember(
      request.userId,
      request.familyId,
      file.visit.familyMember.family.ownerId,
      'download files from this family',
      logger
    );

    // Step 4: Generate signed download URL
    const downloadUrl = await this.fileStorageService.getSignedDownloadUrl(file.s3Key);

    logger.info({ fileId: file.id, fileName: file.fileName }, 'File details retrieved');

    // Return file without nested relations
    const { visit: _, ...fileWithoutVisit } = file;

    return { file: fileWithoutVisit, downloadUrl };
  }
}
