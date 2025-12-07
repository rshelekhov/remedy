import { afterEach, describe, expect, test } from 'bun:test';
import { createTestClient } from '../helpers/test-client';
import { getTestPrisma } from '../helpers/test-db';
import { cleanupTestFamily, createTestFamily } from '../helpers/test-family';
import {
  cleanupTestFile,
  cleanupTestFileFromDB,
  createTestFile,
  createTestFileBuffer,
  verifyFileInS3,
} from '../helpers/test-file';
import { createTestMember } from '../helpers/test-member';
import { cleanupTestUser, createAuthenticatedUser } from '../helpers/test-user';
import { createTestVisit } from '../helpers/test-visit';
import { setupIntegrationTests } from './setup';

// Run global setup
setupIntegrationTests();

/**
 * Get the base URL for API requests
 */
function getBaseUrl(): string {
  const host = process.env.REMEDY_HOST || 'localhost';
  const port = process.env.REMEDY_PORT || '3001';
  return `http://${host}:${port}/api`;
}

describe('File Integration Tests', () => {
  const client = createTestClient();
  const prisma = getTestPrisma();
  const testUsers: string[] = [];
  const testFamilies: string[] = [];
  const testFiles: string[] = [];

  afterEach(async () => {
    // Cleanup files first (DB only - S3 cleanup happens in tests via API)
    for (const fileId of testFiles) {
      await cleanupTestFileFromDB(prisma, fileId);
    }
    testFiles.length = 0;

    // Cleanup families (which cascades to members and visits)
    for (const familyId of testFamilies) {
      await cleanupTestFamily(prisma, familyId);
    }
    testFamilies.length = 0;

    // Cleanup users
    for (const email of testUsers) {
      await cleanupTestUser(prisma, email);
    }
    testUsers.length = 0;
  });

  describe('POST /api/families/:id/visits/:visitId/files', () => {
    // Happy Path Tests

    test('should successfully upload a file to a visit', async () => {
      // Arrange
      const user = await createAuthenticatedUser(client);
      testUsers.push(user.email);

      const family = await createTestFamily(client, user, 'Test Family');
      testFamilies.push(family.id);

      const member = await createTestMember(client, user, family);
      const visit = await createTestVisit(client, user, family, member);

      const fileName = 'test-report.pdf';
      const fileType = 'application/pdf';
      const fileSize = 2048;
      const category = 'Lab Result';
      const content = createTestFileBuffer(fileSize);

      // Create a File object
      const file = new File([content], fileName, { type: fileType });

      // Create FormData
      const formData = new FormData();
      formData.append('file', file);
      formData.append('category', category);

      // Act - Use direct fetch for multipart/form-data
      const url = `${getBaseUrl()}/families/${family.id}/visits/${visit.id}/files`;
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${user.tokens.accessToken}`,
        },
        body: formData,
      });

      // Assert
      expect(response.status).toBe(201);

      const body = (await response.json()) as {
        message: string;
        data: {
          file: {
            id: string;
            visitId: string;
            fileName: string;
            fileType: string;
            fileSize: number;
            category: string | null;
            s3Key: string;
            uploadedAt: string;
          };
        };
      };
      expect(body).toHaveProperty('message', 'File uploaded successfully');
      expect(body).toHaveProperty('data');

      if (!('data' in body)) {
        throw new Error('Expected data in response');
      }

      const uploadedFile = body.data.file;
      testFiles.push(uploadedFile.id);

      expect(uploadedFile).toHaveProperty('id');
      expect(uploadedFile.visitId).toBe(visit.id);
      expect(uploadedFile.fileName).toBe(fileName);
      expect(uploadedFile.fileType).toBe(fileType);
      expect(uploadedFile.fileSize).toBe(fileSize);
      expect(uploadedFile.category).toBe(category);
      expect(uploadedFile).toHaveProperty('s3Key');
      expect(uploadedFile).toHaveProperty('uploadedAt');

      // Verify file exists in database
      const dbFile = await prisma.file.findUnique({
        where: { id: uploadedFile.id },
      });

      expect(dbFile).not.toBeNull();
      expect(dbFile?.fileName).toBe(fileName);

      // Verify file was uploaded to S3 (MinIO)
      const existsInS3 = await verifyFileInS3(client, user, family, uploadedFile.id);
      expect(existsInS3).toBe(true);

      // Cleanup via API (deletes from both DB and S3)
      await cleanupTestFile(client, user, family, uploadedFile.id);
    });

    test('should successfully upload a file without category', async () => {
      // Arrange
      const user = await createAuthenticatedUser(client);
      testUsers.push(user.email);

      const family = await createTestFamily(client, user);
      testFamilies.push(family.id);

      const member = await createTestMember(client, user, family);
      const visit = await createTestVisit(client, user, family, member);

      const file = new File([createTestFileBuffer()], 'test.pdf', { type: 'application/pdf' });
      const formData = new FormData();
      formData.append('file', file);

      // Act - Use direct fetch
      const url = `${getBaseUrl()}/families/${family.id}/visits/${visit.id}/files`;
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${user.tokens.accessToken}`,
        },
        body: formData,
      });

      // Assert
      expect(response.status).toBe(201);

      const body = (await response.json()) as {
        data: {
          file: {
            id: string;
            category: string | null;
          };
        };
      };
      if (!('data' in body)) {
        throw new Error('Expected data in response');
      }

      testFiles.push(body.data.file.id);
      expect(body.data.file.category).toBeNull();

      await cleanupTestFile(client, user, family, body.data.file.id);
    });

    test('should successfully upload different file types', async () => {
      // Arrange
      const user = await createAuthenticatedUser(client);
      testUsers.push(user.email);

      const family = await createTestFamily(client, user);
      testFamilies.push(family.id);

      const member = await createTestMember(client, user, family);
      const visit = await createTestVisit(client, user, family, member);

      const fileTypes = [
        { fileName: 'test.jpg', mimeType: 'image/jpeg' },
        { fileName: 'test.png', mimeType: 'image/png' },
        {
          fileName: 'test.docx',
          mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        },
      ];

      for (const { fileName, mimeType } of fileTypes) {
        const file = new File([createTestFileBuffer()], fileName, { type: mimeType });
        const formData = new FormData();
        formData.append('file', file);

        // Act - Use direct fetch
        const url = `${getBaseUrl()}/families/${family.id}/visits/${visit.id}/files`;
        const response = await fetch(url, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${user.tokens.accessToken}`,
          },
          body: formData,
        });

        // Assert
        expect(response.status).toBe(201);

        const body = (await response.json()) as {
          data: {
            file: {
              id: string;
              fileType: string;
            };
          };
        };
        if (!('data' in body)) {
          throw new Error('Expected data in response');
        }

        testFiles.push(body.data.file.id);
        expect(body.data.file.fileType).toBe(mimeType);

        await cleanupTestFile(client, user, family, body.data.file.id);
      }
    });

    // Error Scenarios

    test('should fail with no file provided', async () => {
      // Arrange
      const user = await createAuthenticatedUser(client);
      testUsers.push(user.email);

      const family = await createTestFamily(client, user);
      testFamilies.push(family.id);

      const member = await createTestMember(client, user, family);
      const visit = await createTestVisit(client, user, family, member);

      const formData = new FormData();
      // Not adding any file

      // Act
      const url = `${getBaseUrl()}/families/${family.id}/visits/${visit.id}/files`;
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${user.tokens.accessToken}`,
        },
        body: formData,
      });

      // Assert
      expect(response.status).toBe(400);

      const body = (await response.json()) as { error: string };
      expect(body).toHaveProperty('error');
    });

    test('should fail with file size exceeding limit', async () => {
      // Arrange
      const user = await createAuthenticatedUser(client);
      testUsers.push(user.email);

      const family = await createTestFamily(client, user);
      testFamilies.push(family.id);

      const member = await createTestMember(client, user, family);
      const visit = await createTestVisit(client, user, family, member);

      // Create a file larger than 10MB
      const largeFileSize = 11 * 1024 * 1024; // 11MB
      const largeContent = createTestFileBuffer(largeFileSize);
      const file = new File([largeContent], 'large-file.pdf', { type: 'application/pdf' });

      const formData = new FormData();
      formData.append('file', file);

      // Act
      const url = `${getBaseUrl()}/families/${family.id}/visits/${visit.id}/files`;
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${user.tokens.accessToken}`,
        },
        body: formData,
      });

      // Assert
      expect(response.status).toBe(400);

      const body = (await response.json()) as { error: string };
      expect(body).toHaveProperty('error');
      expect(body.error).toContain('size');
    });

    test('should fail with invalid file type', async () => {
      // Arrange
      const user = await createAuthenticatedUser(client);
      testUsers.push(user.email);

      const family = await createTestFamily(client, user);
      testFamilies.push(family.id);

      const member = await createTestMember(client, user, family);
      const visit = await createTestVisit(client, user, family, member);

      const file = new File([createTestFileBuffer()], 'test.exe', {
        type: 'application/x-msdownload',
      });
      const formData = new FormData();
      formData.append('file', file);

      // Act
      const url = `${getBaseUrl()}/families/${family.id}/visits/${visit.id}/files`;
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${user.tokens.accessToken}`,
        },
        body: formData,
      });

      // Assert
      expect(response.status).toBe(400);

      const body = (await response.json()) as { error: string };
      expect(body).toHaveProperty('error');
      expect(body.error).toContain('type');
    });

    test('should fail with invalid category', async () => {
      // Arrange
      const user = await createAuthenticatedUser(client);
      testUsers.push(user.email);

      const family = await createTestFamily(client, user);
      testFamilies.push(family.id);

      const member = await createTestMember(client, user, family);
      const visit = await createTestVisit(client, user, family, member);

      const file = new File([createTestFileBuffer()], 'test.pdf', { type: 'application/pdf' });
      const formData = new FormData();
      formData.append('file', file);
      formData.append('category', 'Invalid Category');

      // Act
      const url = `${getBaseUrl()}/families/${family.id}/visits/${visit.id}/files`;
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${user.tokens.accessToken}`,
        },
        body: formData,
      });

      // Assert
      expect(response.status).toBe(400);

      const body = (await response.json()) as { error: string };
      expect(body).toHaveProperty('error');
      expect(body.error).toContain('category');
    });

    test('should fail with non-existent visit ID', async () => {
      // Arrange
      const user = await createAuthenticatedUser(client);
      testUsers.push(user.email);

      const family = await createTestFamily(client, user);
      testFamilies.push(family.id);

      const nonExistentVisitId = '00000000-0000-0000-0000-000000000000';

      const file = new File([createTestFileBuffer()], 'test.pdf', { type: 'application/pdf' });
      const formData = new FormData();
      formData.append('file', file);

      // Act - Use direct fetch
      const url = `${getBaseUrl()}/families/${family.id}/visits/${nonExistentVisitId}/files`;
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${user.tokens.accessToken}`,
        },
        body: formData,
      });

      // Assert
      expect(response.status).toBe(404);
    });

    test('should fail when user is not authorized to upload to visit', async () => {
      // Arrange - Create two users
      const user1 = await createAuthenticatedUser(client);
      testUsers.push(user1.email);

      const user2 = await createAuthenticatedUser(client);
      testUsers.push(user2.email);

      // User1 creates family, member, and visit
      const family = await createTestFamily(client, user1);
      testFamilies.push(family.id);

      const member = await createTestMember(client, user1, family);
      const visit = await createTestVisit(client, user1, family, member);

      const file = new File([createTestFileBuffer()], 'test.pdf', { type: 'application/pdf' });
      const formData = new FormData();
      formData.append('file', file);

      // Act - User2 tries to upload file to User1's visit (use direct fetch)
      const url = `${getBaseUrl()}/families/${family.id}/visits/${visit.id}/files`;
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${user2.tokens.accessToken}`,
        },
        body: formData,
      });

      // Assert
      expect(response.status).toBe(403);
    });

    test('should fail with no authorization header', async () => {
      // Arrange
      const user = await createAuthenticatedUser(client);
      testUsers.push(user.email);

      const family = await createTestFamily(client, user);
      testFamilies.push(family.id);

      const member = await createTestMember(client, user, family);
      const visit = await createTestVisit(client, user, family, member);

      const file = new File([createTestFileBuffer()], 'test.pdf', { type: 'application/pdf' });
      const formData = new FormData();
      formData.append('file', file);

      // Act - Use direct fetch without authorization
      const url = `${getBaseUrl()}/families/${family.id}/visits/${visit.id}/files`;
      const response = await fetch(url, {
        method: 'POST',
        body: formData,
      });

      // Assert
      expect(response.status).toBe(401);
    });

    test('should fail with invalid family ID format', async () => {
      // Arrange
      const user = await createAuthenticatedUser(client);
      testUsers.push(user.email);

      const family = await createTestFamily(client, user);
      testFamilies.push(family.id);

      const member = await createTestMember(client, user, family);
      const visit = await createTestVisit(client, user, family, member);

      const file = new File([createTestFileBuffer()], 'test.pdf', { type: 'application/pdf' });
      const formData = new FormData();
      formData.append('file', file);

      // Act - Use direct fetch with invalid family ID
      const url = `${getBaseUrl()}/families/not-a-uuid/visits/${visit.id}/files`;
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${user.tokens.accessToken}`,
        },
        body: formData,
      });

      // Assert
      expect(response.status).toBe(400);
    });
  });

  describe('GET /api/families/:id/visits/:visitId/files', () => {
    // Happy Path Tests

    test('should successfully list files for a visit', async () => {
      // Arrange
      const user = await createAuthenticatedUser(client);
      testUsers.push(user.email);

      const family = await createTestFamily(client, user);
      testFamilies.push(family.id);

      const member = await createTestMember(client, user, family);
      const visit = await createTestVisit(client, user, family, member);

      // Create multiple files
      const file1 = await createTestFile(client, user, family, visit, {
        fileName: 'report1.pdf',
        category: 'Lab Result',
      });
      testFiles.push(file1.id);

      const file2 = await createTestFile(client, user, family, visit, {
        fileName: 'report2.pdf',
        category: 'Prescription',
      });
      testFiles.push(file2.id);

      // Act
      const response = await client.families[':id'].visits[':visitId'].files.$get(
        {
          param: { id: family.id, visitId: visit.id },
        },
        {
          headers: {
            Authorization: `Bearer ${user.tokens.accessToken}`,
          },
        }
      );

      // Assert
      expect(response.status).toBe(200);

      const body = (await response.json()) as {
        message: string;
        data: {
          files: Array<{ id: string }>;
        };
      };
      expect(body).toHaveProperty('message', 'Visit files retrieved successfully');
      expect(body).toHaveProperty('data');

      if (!('data' in body)) {
        throw new Error('Expected data in response');
      }

      const files = body.data.files;
      expect(files).toBeArrayOfSize(2);

      const fileIds = files.map((f) => f.id);
      expect(fileIds).toContain(file1.id);
      expect(fileIds).toContain(file2.id);

      // Cleanup
      await cleanupTestFile(client, user, family, file1.id);
      await cleanupTestFile(client, user, family, file2.id);
    });

    test('should return empty array for visit with no files', async () => {
      // Arrange
      const user = await createAuthenticatedUser(client);
      testUsers.push(user.email);

      const family = await createTestFamily(client, user);
      testFamilies.push(family.id);

      const member = await createTestMember(client, user, family);
      const visit = await createTestVisit(client, user, family, member);

      // Act
      const response = await client.families[':id'].visits[':visitId'].files.$get(
        {
          param: { id: family.id, visitId: visit.id },
        },
        {
          headers: {
            Authorization: `Bearer ${user.tokens.accessToken}`,
          },
        }
      );

      // Assert
      expect(response.status).toBe(200);

      const body = (await response.json()) as {
        data: {
          files: unknown[];
        };
      };
      if (!('data' in body)) {
        throw new Error('Expected data in response');
      }

      expect(body.data.files).toBeArrayOfSize(0);
    });

    // Error Scenarios

    test('should fail with non-existent visit ID', async () => {
      // Arrange
      const user = await createAuthenticatedUser(client);
      testUsers.push(user.email);

      const family = await createTestFamily(client, user);
      testFamilies.push(family.id);

      const nonExistentVisitId = '00000000-0000-0000-0000-000000000000';

      // Act
      const response = await client.families[':id'].visits[':visitId'].files.$get(
        {
          param: { id: family.id, visitId: nonExistentVisitId },
        },
        {
          headers: {
            Authorization: `Bearer ${user.tokens.accessToken}`,
          },
        }
      );

      // Assert
      expect(response.status).toBe(404);
    });

    test('should fail when user is not authorized to view visit files', async () => {
      // Arrange - Create two users
      const user1 = await createAuthenticatedUser(client);
      testUsers.push(user1.email);

      const user2 = await createAuthenticatedUser(client);
      testUsers.push(user2.email);

      // User1 creates family, member, and visit
      const family = await createTestFamily(client, user1);
      testFamilies.push(family.id);

      const member = await createTestMember(client, user1, family);
      const visit = await createTestVisit(client, user1, family, member);

      // Act - User2 tries to view User1's visit files
      const response = await client.families[':id'].visits[':visitId'].files.$get(
        {
          param: { id: family.id, visitId: visit.id },
        },
        {
          headers: {
            Authorization: `Bearer ${user2.tokens.accessToken}`,
          },
        }
      );

      // Assert
      expect(response.status).toBe(403);
    });

    test('should fail with no authorization header', async () => {
      // Arrange
      const user = await createAuthenticatedUser(client);
      testUsers.push(user.email);

      const family = await createTestFamily(client, user);
      testFamilies.push(family.id);

      const member = await createTestMember(client, user, family);
      const visit = await createTestVisit(client, user, family, member);

      // Act
      const response = await client.families[':id'].visits[':visitId'].files.$get({
        param: { id: family.id, visitId: visit.id },
      });

      // Assert
      expect(response.status).toBe(401);
    });

    test('should fail with invalid family ID format', async () => {
      // Arrange
      const user = await createAuthenticatedUser(client);
      testUsers.push(user.email);

      const family = await createTestFamily(client, user);
      testFamilies.push(family.id);

      const member = await createTestMember(client, user, family);
      const visit = await createTestVisit(client, user, family, member);

      // Act
      const response = await client.families[':id'].visits[':visitId'].files.$get(
        {
          param: { id: 'not-a-uuid', visitId: visit.id },
        },
        {
          headers: {
            Authorization: `Bearer ${user.tokens.accessToken}`,
          },
        }
      );

      // Assert
      expect(response.status).toBe(400);
    });
  });

  describe('GET /api/families/:id/files/:fileId', () => {
    // Happy Path Tests

    test('should successfully get file details and download URL', async () => {
      // Arrange
      const user = await createAuthenticatedUser(client);
      testUsers.push(user.email);

      const family = await createTestFamily(client, user);
      testFamilies.push(family.id);

      const member = await createTestMember(client, user, family);
      const visit = await createTestVisit(client, user, family, member);

      const testFile = await createTestFile(client, user, family, visit, {
        fileName: 'test-report.pdf',
        category: 'Lab Result',
      });
      testFiles.push(testFile.id);

      // Act
      const response = await client.families[':id'].files[':fileId'].$get(
        {
          param: { id: family.id, fileId: testFile.id },
        },
        {
          headers: {
            Authorization: `Bearer ${user.tokens.accessToken}`,
          },
        }
      );

      // Assert
      expect(response.status).toBe(200);

      const body = (await response.json()) as {
        message: string;
        data: {
          file: {
            id: string;
            fileName: string;
            category: string | null;
          };
          downloadUrl: string;
        };
      };
      expect(body).toHaveProperty('message', 'File details retrieved successfully');
      expect(body).toHaveProperty('data');

      if (!('data' in body)) {
        throw new Error('Expected data in response');
      }

      const { file, downloadUrl } = body.data;

      expect(file.id).toBe(testFile.id);
      expect(file.fileName).toBe('test-report.pdf');
      expect(file.category).toBe('Lab Result');
      expect(downloadUrl).toBeTypeOf('string');
      expect(downloadUrl).toContain('http'); // Should be a valid URL

      // Cleanup
      await cleanupTestFile(client, user, family, testFile.id);
    });

    // Error Scenarios

    test('should fail with non-existent file ID', async () => {
      // Arrange
      const user = await createAuthenticatedUser(client);
      testUsers.push(user.email);

      const family = await createTestFamily(client, user);
      testFamilies.push(family.id);

      const nonExistentFileId = '00000000-0000-0000-0000-000000000000';

      // Act
      const response = await client.families[':id'].files[':fileId'].$get(
        {
          param: { id: family.id, fileId: nonExistentFileId },
        },
        {
          headers: {
            Authorization: `Bearer ${user.tokens.accessToken}`,
          },
        }
      );

      // Assert
      expect(response.status).toBe(404);
    });

    test('should fail when user is not authorized to access file', async () => {
      // Arrange - Create two users
      const user1 = await createAuthenticatedUser(client);
      testUsers.push(user1.email);

      const user2 = await createAuthenticatedUser(client);
      testUsers.push(user2.email);

      // User1 creates family, member, visit, and file
      const family = await createTestFamily(client, user1);
      testFamilies.push(family.id);

      const member = await createTestMember(client, user1, family);
      const visit = await createTestVisit(client, user1, family, member);
      const testFile = await createTestFile(client, user1, family, visit);
      testFiles.push(testFile.id);

      // Act - User2 tries to access User1's file
      const response = await client.families[':id'].files[':fileId'].$get(
        {
          param: { id: family.id, fileId: testFile.id },
        },
        {
          headers: {
            Authorization: `Bearer ${user2.tokens.accessToken}`,
          },
        }
      );

      // Assert
      expect(response.status).toBe(403);

      // Cleanup
      await cleanupTestFile(client, user1, family, testFile.id);
    });

    test('should fail with no authorization header', async () => {
      // Arrange
      const user = await createAuthenticatedUser(client);
      testUsers.push(user.email);

      const family = await createTestFamily(client, user);
      testFamilies.push(family.id);

      const member = await createTestMember(client, user, family);
      const visit = await createTestVisit(client, user, family, member);
      const testFile = await createTestFile(client, user, family, visit);
      testFiles.push(testFile.id);

      // Act
      const response = await client.families[':id'].files[':fileId'].$get({
        param: { id: family.id, fileId: testFile.id },
      });

      // Assert
      expect(response.status).toBe(401);

      // Cleanup
      await cleanupTestFile(client, user, family, testFile.id);
    });

    test('should fail with invalid file ID format', async () => {
      // Arrange
      const user = await createAuthenticatedUser(client);
      testUsers.push(user.email);

      const family = await createTestFamily(client, user);
      testFamilies.push(family.id);

      // Act
      const response = await client.families[':id'].files[':fileId'].$get(
        {
          param: { id: family.id, fileId: 'not-a-uuid' },
        },
        {
          headers: {
            Authorization: `Bearer ${user.tokens.accessToken}`,
          },
        }
      );

      // Assert
      expect(response.status).toBe(400);
    });
  });

  describe('DELETE /api/families/:id/files/:fileId', () => {
    // Happy Path Tests

    test('should successfully delete a file from both database and S3', async () => {
      // Arrange
      const user = await createAuthenticatedUser(client);
      testUsers.push(user.email);

      const family = await createTestFamily(client, user);
      testFamilies.push(family.id);

      const member = await createTestMember(client, user, family);
      const visit = await createTestVisit(client, user, family, member);

      const testFile = await createTestFile(client, user, family, visit);

      // Verify file exists before deletion
      const fileBeforeDelete = await prisma.file.findUnique({
        where: { id: testFile.id },
      });
      expect(fileBeforeDelete).not.toBeNull();

      // Act
      const response = await client.families[':id'].files[':fileId'].$delete(
        {
          param: { id: family.id, fileId: testFile.id },
        },
        {
          headers: {
            Authorization: `Bearer ${user.tokens.accessToken}`,
          },
        }
      );

      // Assert
      expect(response.status).toBe(200);

      const body = (await response.json()) as { message: string };
      expect(body).toHaveProperty('message', 'File deleted successfully');

      // Verify file was deleted from database
      const fileAfterDelete = await prisma.file.findUnique({
        where: { id: testFile.id },
      });
      expect(fileAfterDelete).toBeNull();

      // Verify file was deleted from S3 (should not be able to get download URL)
      const existsInS3 = await verifyFileInS3(client, user, family, testFile.id);
      expect(existsInS3).toBe(false);
    });

    // Error Scenarios

    test('should fail with non-existent file ID', async () => {
      // Arrange
      const user = await createAuthenticatedUser(client);
      testUsers.push(user.email);

      const family = await createTestFamily(client, user);
      testFamilies.push(family.id);

      const nonExistentFileId = '00000000-0000-0000-0000-000000000000';

      // Act
      const response = await client.families[':id'].files[':fileId'].$delete(
        {
          param: { id: family.id, fileId: nonExistentFileId },
        },
        {
          headers: {
            Authorization: `Bearer ${user.tokens.accessToken}`,
          },
        }
      );

      // Assert
      expect(response.status).toBe(404);
    });

    test('should fail when user is not authorized to delete file', async () => {
      // Arrange - Create two users
      const user1 = await createAuthenticatedUser(client);
      testUsers.push(user1.email);

      const user2 = await createAuthenticatedUser(client);
      testUsers.push(user2.email);

      // User1 creates family, member, visit, and file
      const family = await createTestFamily(client, user1);
      testFamilies.push(family.id);

      const member = await createTestMember(client, user1, family);
      const visit = await createTestVisit(client, user1, family, member);
      const testFile = await createTestFile(client, user1, family, visit);
      testFiles.push(testFile.id);

      // Act - User2 tries to delete User1's file
      const response = await client.families[':id'].files[':fileId'].$delete(
        {
          param: { id: family.id, fileId: testFile.id },
        },
        {
          headers: {
            Authorization: `Bearer ${user2.tokens.accessToken}`,
          },
        }
      );

      // Assert
      expect(response.status).toBe(403);

      // Verify file was not deleted
      const fileStillExists = await prisma.file.findUnique({
        where: { id: testFile.id },
      });
      expect(fileStillExists).not.toBeNull();

      // Cleanup
      await cleanupTestFile(client, user1, family, testFile.id);
    });

    test('should fail with no authorization header', async () => {
      // Arrange
      const user = await createAuthenticatedUser(client);
      testUsers.push(user.email);

      const family = await createTestFamily(client, user);
      testFamilies.push(family.id);

      const member = await createTestMember(client, user, family);
      const visit = await createTestVisit(client, user, family, member);
      const testFile = await createTestFile(client, user, family, visit);
      testFiles.push(testFile.id);

      // Act
      const response = await client.families[':id'].files[':fileId'].$delete({
        param: { id: family.id, fileId: testFile.id },
      });

      // Assert
      expect(response.status).toBe(401);

      // Cleanup
      await cleanupTestFile(client, user, family, testFile.id);
    });

    test('should fail with invalid file ID format', async () => {
      // Arrange
      const user = await createAuthenticatedUser(client);
      testUsers.push(user.email);

      const family = await createTestFamily(client, user);
      testFamilies.push(family.id);

      // Act
      const response = await client.families[':id'].files[':fileId'].$delete(
        {
          param: { id: family.id, fileId: 'not-a-uuid' },
        },
        {
          headers: {
            Authorization: `Bearer ${user.tokens.accessToken}`,
          },
        }
      );

      // Assert
      expect(response.status).toBe(400);
    });
  });
});
