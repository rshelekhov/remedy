import {
  DeleteObjectsCommand,
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import type { PinoLogger } from 'hono-pino';
import type { FileMetadata, FileStorageService } from './file-storage.interface';

/**
 * S3 File Storage Service Configuration
 */
export interface S3FileStorageConfig {
  endpoint: string;
  bucket: string;
  accessKey: string;
  secretKey: string;
}

/**
 * S3 File Storage Service Implementation
 * Handles file operations with AWS S3 or S3-compatible services (MinIO, etc.)
 */
export class S3FileStorageService implements FileStorageService {
  private readonly client: S3Client;
  private readonly bucket: string;

  constructor(
    config: S3FileStorageConfig,
    private readonly logger?: PinoLogger
  ) {
    this.bucket = config.bucket;
    this.client = new S3Client({
      endpoint: config.endpoint,
      credentials: {
        accessKeyId: config.accessKey,
        secretAccessKey: config.secretKey,
      },
      region: 'auto', // MinIO and some S3-compatible services use 'auto'
      forcePathStyle: true, // Required for MinIO and some S3-compatible services
    });
  }

  /**
   * Upload a file to S3
   * Generates a unique S3 key and uploads the file
   *
   * @param fileBuffer - File content as Buffer
   * @param metadata - File metadata for organizing storage
   * @returns S3 key (identifier) for the uploaded file
   * @throws Error if upload fails
   */
  async uploadFile(fileBuffer: Buffer, metadata: FileMetadata): Promise<string> {
    const s3Key = this.generateS3Key(metadata);

    this.logger?.info(
      { s3Key, fileName: metadata.fileName, fileType: metadata.fileType, bucket: this.bucket },
      'Uploading file to S3'
    );

    try {
      const command = new PutObjectCommand({
        Bucket: this.bucket,
        Key: s3Key,
        Body: fileBuffer,
        ContentType: metadata.fileType,
      });

      await this.client.send(command);

      this.logger?.info({ s3Key, bucket: this.bucket }, 'Successfully uploaded file to S3');

      return s3Key;
    } catch (error) {
      this.logger?.error({ err: error, s3Key, bucket: this.bucket }, 'Failed to upload file to S3');
      throw error;
    }
  }

  /**
   * Generate a signed URL for downloading a file from S3
   * The URL is time-limited and allows temporary access without credentials
   *
   * @param key - S3 object key
   * @param expiresIn - URL expiration time in seconds (default: 3600 = 1 hour)
   * @returns Signed download URL
   * @throws Error if URL generation fails
   */
  async getSignedDownloadUrl(key: string, expiresIn: number = 3600): Promise<string> {
    this.logger?.info({ key, expiresIn, bucket: this.bucket }, 'Generating signed download URL');

    try {
      const command = new GetObjectCommand({
        Bucket: this.bucket,
        Key: key,
      });

      const signedUrl = await getSignedUrl(this.client, command, { expiresIn });

      this.logger?.info({ key, bucket: this.bucket }, 'Successfully generated signed URL');

      return signedUrl;
    } catch (error) {
      this.logger?.error({ err: error, key, bucket: this.bucket }, 'Failed to generate signed URL');
      throw error;
    }
  }

  /**
   * Delete multiple files from S3
   * Handles batch deletion efficiently (up to 1000 objects per request)
   *
   * @param keys - Array of S3 object keys to delete
   * @throws Error if deletion fails
   */
  async deleteFiles(keys: string[]): Promise<void> {
    if (keys.length === 0) {
      this.logger?.debug('No files to delete from S3');
      return;
    }

    this.logger?.info({ count: keys.length, bucket: this.bucket }, 'Deleting files from S3');

    try {
      // S3 DeleteObjects supports up to 1000 objects per request
      // If you have more, you'd need to batch them
      const chunks = this.chunkArray(keys, 1000);

      for (const chunk of chunks) {
        const command = new DeleteObjectsCommand({
          Bucket: this.bucket,
          Delete: {
            Objects: chunk.map((key) => ({ Key: key })),
            Quiet: true, // Don't return info about each deleted object
          },
        });

        const response = await this.client.send(command);

        // Log any errors from the batch deletion
        if (response.Errors && response.Errors.length > 0) {
          this.logger?.error(
            { errors: response.Errors, bucket: this.bucket },
            'Some files failed to delete from S3'
          );
          throw new Error(`Failed to delete ${response.Errors.length} files from S3`);
        }
      }

      this.logger?.info(
        { count: keys.length, bucket: this.bucket },
        'Successfully deleted files from S3'
      );
    } catch (error) {
      this.logger?.error(
        { err: error, keys, bucket: this.bucket },
        'Failed to delete files from S3'
      );
      throw error;
    }
  }

  /**
   * Generate a unique S3 key for file storage
   * Pattern: families/{familyId}/visits/{visitId}/{uuid}-{sanitizedFileName}
   *
   * @param metadata - File metadata
   * @returns Unique S3 key
   */
  private generateS3Key(metadata: FileMetadata): string {
    const uuid = crypto.randomUUID();
    const sanitizedFileName = this.sanitizeFileName(metadata.fileName);
    return `families/${metadata.familyId}/visits/${metadata.visitId}/${uuid}-${sanitizedFileName}`;
  }

  /**
   * Sanitize filename to prevent path traversal and remove special characters
   * Replaces problematic characters with underscores
   *
   * @param fileName - Original filename
   * @returns Sanitized filename
   */
  private sanitizeFileName(fileName: string): string {
    // Remove path separators, special characters, and keep only alphanumeric, dots, dashes, and underscores
    return fileName.replace(/[^a-zA-Z0-9._-]/g, '_');
  }

  /**
   * Split an array into chunks of a specified size
   */
  private chunkArray<T>(array: T[], chunkSize: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += chunkSize) {
      chunks.push(array.slice(i, i + chunkSize));
    }
    return chunks;
  }
}
