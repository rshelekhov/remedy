import { OpenAPIHono } from '@hono/zod-openapi';
import {
  ResourceNotFoundError,
  UnauthorizedOperationError,
  ValidationError,
} from '../errors/domain-errors';
import {
  deleteFileUsecase,
  getFileUsecase,
  listVisitFilesUsecase,
  uploadFileUsecase,
} from '../infrastructure/container';
import type { AppVariables } from '../types/hono.types';
import {
  deleteFileRoute,
  getFileRoute,
  listVisitFilesRoute,
  uploadFileRoute,
} from './openapi/files.routes';

const router = new OpenAPIHono<{ Variables: AppVariables }>()
  /**
   * List Files for Visit
   */
  .openapi(listVisitFilesRoute, async (c) => {
    const logger = c.var.logger;
    const userId = c.get('ssoUser').user_id;
    const familyId = c.req.param('id');
    const visitId = c.req.param('visitId');

    try {
      const result = await listVisitFilesUsecase.execute({ userId, familyId, visitId }, { logger });

      logger.info(
        { visitId, familyId, filesCount: result.files.length },
        'Visit files retrieved successfully'
      );

      return c.json(
        { message: 'Visit files retrieved successfully', data: { files: result.files } },
        200
      );
    } catch (error) {
      logger.error({ err: error }, 'Failed to retrieve visit files');

      if (error instanceof UnauthorizedOperationError) {
        return c.json({ error: (error as Error).message }, 403);
      }

      if (error instanceof ResourceNotFoundError) {
        return c.json({ error: (error as Error).message }, 404);
      }

      return c.json({ error: 'Failed to retrieve visit files' }, 500);
    }
  })
  /**
   * Upload File for Visit
   */
  .openapi(uploadFileRoute, async (c) => {
    const logger = c.var.logger;
    const userId = c.get('ssoUser').user_id;
    const familyId = c.req.param('id');
    const visitId = c.req.param('visitId');

    try {
      // Parse multipart form data
      const body = await c.req.parseBody();
      const file = body.file;
      const category = body.category as string | undefined;

      // Validate file exists
      if (!file || !(file instanceof File)) {
        return c.json({ error: 'No file provided or invalid file' }, 400);
      }

      // Convert File to Buffer
      const arrayBuffer = await file.arrayBuffer();
      const fileBuffer = Buffer.from(arrayBuffer);

      const result = await uploadFileUsecase.execute(
        {
          userId,
          familyId,
          visitId,
          fileBuffer,
          fileName: file.name,
          fileType: file.type,
          fileSize: file.size,
          category: category || null,
        },
        { logger }
      );

      logger.info(
        { fileId: result.file.id, visitId, familyId, fileName: file.name },
        'File uploaded successfully'
      );

      return c.json({ message: 'File uploaded successfully', data: { file: result.file } }, 201);
    } catch (error) {
      logger.error({ err: error }, 'Failed to upload file');

      if (error instanceof ValidationError) {
        return c.json({ error: (error as Error).message }, 400);
      }

      if (error instanceof UnauthorizedOperationError) {
        return c.json({ error: (error as Error).message }, 403);
      }

      if (error instanceof ResourceNotFoundError) {
        return c.json({ error: (error as Error).message }, 404);
      }

      return c.json({ error: 'Failed to upload file' }, 500);
    }
  })
  /**
   * Get File Details and Download URL
   */
  .openapi(getFileRoute, async (c) => {
    const logger = c.var.logger;
    const userId = c.get('ssoUser').user_id;
    const familyId = c.req.param('id');
    const fileId = c.req.param('fileId');

    try {
      const result = await getFileUsecase.execute({ userId, familyId, fileId }, { logger });

      logger.info({ fileId, familyId, fileName: result.file.fileName }, 'File details retrieved');

      return c.json(
        {
          message: 'File details retrieved successfully',
          data: { file: result.file, downloadUrl: result.downloadUrl },
        },
        200
      );
    } catch (error) {
      logger.error({ err: error }, 'Failed to get file details');

      if (error instanceof UnauthorizedOperationError) {
        return c.json({ error: (error as Error).message }, 403);
      }

      if (error instanceof ResourceNotFoundError) {
        return c.json({ error: (error as Error).message }, 404);
      }

      return c.json({ error: 'Failed to get file details' }, 500);
    }
  })
  /**
   * Delete File
   */
  .openapi(deleteFileRoute, async (c) => {
    const logger = c.var.logger;
    const userId = c.get('ssoUser').user_id;
    const familyId = c.req.param('id');
    const fileId = c.req.param('fileId');

    try {
      await deleteFileUsecase.execute({ userId, familyId, fileId }, { logger });

      logger.info({ fileId, familyId }, 'File deleted successfully');

      return c.json({ message: 'File deleted successfully' }, 200);
    } catch (error) {
      logger.error({ err: error }, 'Failed to delete file');

      if (error instanceof UnauthorizedOperationError) {
        return c.json({ error: (error as Error).message }, 403);
      }

      if (error instanceof ResourceNotFoundError) {
        return c.json({ error: (error as Error).message }, 404);
      }

      return c.json({ error: 'Failed to delete file' }, 500);
    }
  });

export default router;
