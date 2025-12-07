/**
 * File Storage Service Interface
 * Abstraction for file storage operations
 * Allows for easy testing and swapping of storage providers (S3, MinIO, GCS, etc.)
 */

/**
 * Metadata required for file upload
 */
export interface FileMetadata {
  familyId: string;
  visitId: string;
  fileName: string;
  fileType: string;
}

export interface FileStorageService {
  /**
   * Upload a file to storage
   * @param fileBuffer - File content as Buffer
   * @param metadata - File metadata for organizing storage
   * @returns Promise that resolves with the storage key (identifier)
   * @throws Error if upload fails
   */
  uploadFile(fileBuffer: Buffer, metadata: FileMetadata): Promise<string>;

  /**
   * Generate a signed URL for downloading a file
   * @param key - Storage key (file identifier)
   * @param expiresIn - URL expiration time in seconds (default: 3600)
   * @returns Promise that resolves with the signed download URL
   * @throws Error if URL generation fails
   */
  getSignedDownloadUrl(key: string, expiresIn?: number): Promise<string>;

  /**
   * Delete multiple files from storage
   * @param keys - Array of storage keys (file identifiers) to delete
   * @returns Promise that resolves when deletion is complete
   * @throws Error if deletion fails
   */
  deleteFiles(keys: string[]): Promise<void>;
}
