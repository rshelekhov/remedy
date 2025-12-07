import type { PrismaClient } from '@prisma/client';
import type { TestClient } from './test-client';
import type { TestFamily } from './test-family';
import type { AuthenticatedTestUser } from './test-user';
import type { TestVisit } from './test-visit';

/**
 * File test data structure
 */
export interface TestFile {
  id: string;
  visitId: string;
  fileName: string;
  fileType: string;
  fileSize: number;
  category: string | null;
  s3Key: string;
}

/**
 * Get the base URL for API requests
 */
function getBaseUrl(): string {
  const host = process.env.REMEDY_HOST || 'localhost';
  const port = process.env.REMEDY_PORT || '3001';
  return `http://${host}:${port}/api`;
}

/**
 * Create a test file buffer with the specified size
 */
export function createTestFileBuffer(sizeInBytes: number = 1024): Buffer {
  return Buffer.alloc(sizeInBytes, 'test-content');
}

/**
 * Create a test file for a visit via API (using direct fetch for multipart/form-data)
 * This will upload the file to MinIO (S3) and create a database record
 */
export async function createTestFile(
  _client: TestClient,
  user: AuthenticatedTestUser,
  family: TestFamily,
  visit: TestVisit,
  fileData?: {
    fileName?: string;
    fileType?: string;
    fileSize?: number;
    category?: string;
    content?: Buffer;
  }
): Promise<TestFile> {
  const fileName = fileData?.fileName || 'test-document.pdf';
  const fileType = fileData?.fileType || 'application/pdf';
  const fileSize = fileData?.fileSize || 1024;
  const category = fileData?.category || 'Lab Result';
  const content = fileData?.content || createTestFileBuffer(fileSize);

  // Create a File object from the buffer
  const file = new File([content], fileName, { type: fileType });

  // Create FormData
  const formData = new FormData();
  formData.append('file', file);
  if (category) {
    formData.append('category', category);
  }

  // Use direct fetch for multipart/form-data (Hono RPC client doesn't handle this well)
  const url = `${getBaseUrl()}/families/${family.id}/visits/${visit.id}/files`;
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${user.tokens.accessToken}`,
    },
    body: formData,
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`Failed to create test file: ${response.status} - ${errorBody}`);
  }

  const body = (await response.json()) as {
    data?: {
      file: {
        id: string;
        visitId: string;
        fileName: string;
        fileType: string;
        fileSize: number;
        category: string | null;
        s3Key: string;
      };
    };
  };

  if (!body.data) {
    throw new Error('Expected data in response');
  }

  return {
    id: body.data.file.id,
    visitId: body.data.file.visitId,
    fileName: body.data.file.fileName,
    fileType: body.data.file.fileType,
    fileSize: body.data.file.fileSize,
    category: body.data.file.category,
    s3Key: body.data.file.s3Key,
  };
}

/**
 * Cleanup file via API (preferred method)
 * This deletes from both database and MinIO S3 storage
 */
export async function cleanupTestFile(
  client: TestClient,
  user: AuthenticatedTestUser,
  family: TestFamily,
  fileId: string
): Promise<void> {
  try {
    await client.families[':id'].files[':fileId'].$delete(
      {
        param: { id: family.id, fileId },
      },
      {
        headers: {
          Authorization: `Bearer ${user.tokens.accessToken}`,
        },
      }
    );
  } catch (_error) {
    // File might not exist or already deleted, ignore
  }
}

/**
 * Cleanup file from database only (fallback cleanup)
 * Use this for cleanup in afterEach when you don't have access to the API client
 * Note: This only removes DB records - S3 files will become orphaned
 * The API cleanup (via DELETE endpoint) is preferred as it cleans both DB and S3
 */
export async function cleanupTestFileFromDB(prisma: PrismaClient, fileId: string): Promise<void> {
  try {
    await prisma.file.delete({ where: { id: fileId } });
  } catch (_error) {
    // File might not exist, ignore
  }
}

/**
 * Helper to verify file was uploaded to S3 by checking download URL
 */
export async function verifyFileInS3(
  client: TestClient,
  user: AuthenticatedTestUser,
  family: TestFamily,
  fileId: string
): Promise<boolean> {
  try {
    const response = await client.families[':id'].files[':fileId'].$get(
      {
        param: { id: family.id, fileId },
      },
      {
        headers: {
          Authorization: `Bearer ${user.tokens.accessToken}`,
        },
      }
    );

    if (!response.ok) {
      return false;
    }

    const body = (await response.json()) as {
      data?: {
        file?: unknown;
        downloadUrl?: string;
      };
    };

    if (!body.data) {
      return false;
    }

    // If we got a download URL, the file exists in S3
    return !!body.data.downloadUrl;
  } catch (_error) {
    return false;
  }
}
