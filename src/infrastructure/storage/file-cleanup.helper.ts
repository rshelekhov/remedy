import type { PinoLogger } from 'hono-pino';
import type { FileStorageService } from './file-storage.interface';

/**
 * Helper for cleaning up S3 files associated with entities
 */

/**
 * Extract S3 keys from a family entity with its nested members, visits, and files
 */
export function extractS3KeysFromFamily(family: {
  members: Array<{
    visits: Array<{
      files: Array<{ s3Key: string }>;
    }>;
  }>;
}): string[] {
  const s3Keys: string[] = [];
  for (const member of family.members) {
    for (const visit of member.visits) {
      for (const file of visit.files) {
        s3Keys.push(file.s3Key);
      }
    }
  }
  return s3Keys;
}

/**
 * Extract S3 keys from a family member entity with its nested visits and files
 */
export function extractS3KeysFromMember(member: {
  visits: Array<{
    files: Array<{ s3Key: string }>;
  }>;
}): string[] {
  const s3Keys: string[] = [];
  for (const visit of member.visits) {
    for (const file of visit.files) {
      s3Keys.push(file.s3Key);
    }
  }
  return s3Keys;
}

/**
 * Extract S3 keys from a visit entity with its files
 */
export function extractS3KeysFromVisit(visit: { files: Array<{ s3Key: string }> }): string[] {
  return visit.files.map((file) => file.s3Key);
}

/**
 * Delete S3 files gracefully
 *
 * This handles errors gracefully - if S3 deletion fails, it logs the error but doesn't throw.
 * The database is the source of truth, so if the DB records are already deleted,
 * orphaned S3 files can be cleaned up later with a maintenance job.
 *
 * @param s3Keys - Array of S3 keys to delete
 * @param fileStorageService - File storage service to use for deletion
 * @param logger - Logger instance
 * @param context - Context object with entityType and entityId for logging
 */
export async function deleteS3FilesGracefully(
  s3Keys: string[],
  fileStorageService: FileStorageService,
  logger: PinoLogger,
  context: { entityType: string; entityId: string }
): Promise<void> {
  if (s3Keys.length === 0) {
    logger.info({ [context.entityType]: context.entityId }, 'No files to delete from S3');
    return;
  }

  try {
    await fileStorageService.deleteFiles(s3Keys);
    logger.info(
      { [context.entityType]: context.entityId, filesDeleted: s3Keys.length },
      'S3 files deleted successfully'
    );
  } catch (error) {
    // Log error but don't fail the request
    // The entity is already deleted from DB (source of truth)
    logger.error(
      {
        err: error,
        [context.entityType]: context.entityId,
        s3Keys,
      },
      'Failed to delete S3 files - files may be orphaned. Consider running a cleanup job.'
    );
    // Don't throw - the operation is still considered successful
  }
}
