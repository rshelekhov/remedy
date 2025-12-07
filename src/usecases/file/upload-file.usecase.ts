import type { File, PrismaClient } from '@prisma/client';
import type { PinoLogger } from 'hono-pino';
import { ValidationError } from '../../errors/domain-errors';
import type { AuthorizationService } from '../../infrastructure/authorization';
import type { FileStorageService } from '../../infrastructure/storage';
import { FILE_UPLOAD_CONSTRAINTS } from '../../schemas/file.schema';

/**
 * Upload File Use Case
 * Uploads a file to S3 and creates a database record
 */
export class UploadFileUsecase {
  constructor(
    readonly prisma: PrismaClient,
    readonly authorizationService: AuthorizationService,
    readonly fileStorageService: FileStorageService
  ) {}

  /**
   * Execute file upload
   *
   * Flow:
   * 1. Fetch visit and verify it belongs to the requested family
   * 2. Verify that userId is family owner OR the specific member (STRICT)
   * 3. Validate file (size, type, category)
   * 4. Upload file to S3
   * 5. Create file record in database
   * 6. If DB insert fails, cleanup S3 file
   * 7. Return created file data
   */
  async execute(
    request: {
      userId: string;
      familyId: string;
      visitId: string;
      fileBuffer: Buffer;
      fileName: string;
      fileType: string;
      fileSize: number;
      category?: string | null;
    },
    context: { logger: PinoLogger }
  ): Promise<{ file: File }> {
    const logger = context.logger.assign({ usecase: 'UploadFileUsecase.execute' });

    // Step 1: Fetch visit and verify it belongs to the requested family
    const visit = await this.authorizationService.fetchAndVerifyVisit(
      request.visitId,
      request.familyId,
      logger
    );

    // Step 2: Check authorization - STRICT (only owner or specific member can upload)
    await this.authorizationService.verifyOwnerOrSpecificMember(
      request.userId,
      visit.familyMember.family.ownerId,
      visit.familyMember.userId,
      'upload files for this visit',
      logger
    );

    // Step 3: Validate file
    this.validateFile(request.fileName, request.fileType, request.fileSize, request.category);

    // Step 4: Upload file to S3
    let s3Key: string;
    try {
      s3Key = await this.fileStorageService.uploadFile(request.fileBuffer, {
        familyId: request.familyId,
        visitId: request.visitId,
        fileName: request.fileName,
        fileType: request.fileType,
      });
    } catch (error) {
      logger.error({ err: error, fileName: request.fileName }, 'Failed to upload file to S3');
      throw error;
    }

    // Step 5: Create file record in database
    let file: File;
    try {
      file = await this.prisma.file.create({
        data: {
          visitId: request.visitId,
          s3Key,
          fileName: request.fileName,
          fileType: request.fileType,
          fileSize: request.fileSize,
          category: request.category,
        },
      });

      logger.info({ fileId: file.id, s3Key }, 'File uploaded successfully');
    } catch (error) {
      // If DB insert fails, attempt to delete S3 file (best effort)
      logger.error({ err: error, s3Key }, 'Failed to create file record, attempting S3 cleanup');
      try {
        await this.fileStorageService.deleteFiles([s3Key]);
      } catch (cleanupError) {
        logger.error({ err: cleanupError, s3Key }, 'Failed to cleanup orphaned S3 file');
      }
      throw error;
    }

    return { file };
  }

  /**
   * Validate file before upload
   * @throws ValidationError if validation fails
   */
  private validateFile(
    fileName: string,
    fileType: string,
    fileSize: number,
    category?: string | null
  ): void {
    // Validate file name is not empty
    if (!fileName || fileName.trim().length === 0) {
      throw new ValidationError('File name cannot be empty');
    }

    // Validate file size
    if (fileSize > FILE_UPLOAD_CONSTRAINTS.MAX_FILE_SIZE) {
      throw new ValidationError(
        `File size exceeds maximum allowed size of ${FILE_UPLOAD_CONSTRAINTS.MAX_FILE_SIZE / 1024 / 1024}MB`
      );
    }

    // Validate file type
    if (!(FILE_UPLOAD_CONSTRAINTS.ALLOWED_MIME_TYPES as readonly string[]).includes(fileType)) {
      throw new ValidationError(
        `File type ${fileType} is not allowed. Allowed types: ${FILE_UPLOAD_CONSTRAINTS.ALLOWED_MIME_TYPES.join(', ')}`
      );
    }

    // Validate category if provided
    if (
      category &&
      !(FILE_UPLOAD_CONSTRAINTS.ALLOWED_CATEGORIES as readonly string[]).includes(category)
    ) {
      throw new ValidationError(
        `Invalid category. Allowed categories: ${FILE_UPLOAD_CONSTRAINTS.ALLOWED_CATEGORIES.join(', ')}`
      );
    }
  }
}
