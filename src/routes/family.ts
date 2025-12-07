import { OpenAPIHono } from '@hono/zod-openapi';
import {
  InvalidOwnerError,
  ResourceAlreadyExistsError,
  ResourceNotFoundError,
  UnauthorizedOperationError,
} from '../errors/domain-errors';
import {
  createFamilyUsecase,
  deleteFamilyUsecase,
  getFamilyUsecase,
  transferOwnershipUsecase,
  updateFamilyUsecase,
} from '../infrastructure/container';
import type { AppVariables } from '../types/hono.types';
import {
  createFamilyRoute,
  deleteFamilyRoute,
  getFamilyRoute,
  transferOwnershipRoute,
  updateFamilyRoute,
} from './openapi/family.routes';

const router = new OpenAPIHono<{ Variables: AppVariables }>()
  /**
   * Create Family
   */
  .openapi(createFamilyRoute, async (c) => {
    const logger = c.var.logger;
    const ownerId = c.get('ssoUser').user_id;
    const { name } = c.req.valid('json');

    try {
      const result = await createFamilyUsecase.execute({ name, ownerId }, { logger });

      logger.info({ familyId: result.family.id, ownerId }, 'Family created successfully');

      return c.json(
        { message: 'Family created successfully', data: { family: result.family } },
        201
      );
    } catch (error) {
      logger.error({ err: error }, 'Failed to create family');

      if (error instanceof ResourceAlreadyExistsError) {
        return c.json({ error: (error as Error).message }, 409);
      }

      return c.json({ error: 'Failed to create family' }, 500);
    }
  })
  /**
   * Get Family Details
   */
  .openapi(getFamilyRoute, async (c) => {
    const logger = c.var.logger;
    const userId = c.get('ssoUser').user_id;
    const { id } = c.req.param();

    try {
      const result = await getFamilyUsecase.execute({ userId, familyId: id }, { logger });

      logger.info({ familyId: id, userId }, 'Family details retrieved successfully');

      return c.json(
        { message: 'Family details retrieved successfully', data: { family: result.family } },
        200
      );
    } catch (error) {
      logger.error({ err: error }, 'Failed to get family details');

      if (error instanceof ResourceNotFoundError) {
        return c.json({ error: (error as Error).message }, 404);
      }

      return c.json({ error: 'Failed to get family details' }, 500);
    }
  })
  /**
   * Update Family
   */
  .openapi(updateFamilyRoute, async (c) => {
    const logger = c.var.logger;
    const userId = c.get('ssoUser').user_id;
    const { id } = c.req.param();
    const { name } = c.req.valid('json');

    try {
      const result = await updateFamilyUsecase.execute({ userId, familyId: id, name }, { logger });

      logger.info({ familyId: id, userId }, 'Family updated successfully');

      return c.json(
        { message: 'Family updated successfully', data: { family: result.family } },
        200
      );
    } catch (error) {
      logger.error({ err: error }, 'Failed to update family');

      if (error instanceof ResourceNotFoundError) {
        return c.json({ error: (error as Error).message }, 404);
      }

      return c.json({ error: 'Failed to update family' }, 500);
    }
  })
  /**
   * Transfer Family Ownership
   */
  .openapi(transferOwnershipRoute, async (c) => {
    const logger = c.var.logger;
    const currentOwnerId = c.get('ssoUser').user_id;
    const { id } = c.req.param();
    const { newOwnerId } = c.req.valid('json');

    try {
      const result = await transferOwnershipUsecase.execute(
        { currentOwnerId, familyId: id, newOwnerId },
        { logger }
      );

      logger.info(
        { familyId: id, currentOwnerId, newOwnerId },
        'Family ownership transferred successfully'
      );

      return c.json(
        { message: 'Family ownership transferred successfully', data: { family: result.family } },
        200
      );
    } catch (error) {
      logger.error({ err: error }, 'Failed to transfer family ownership');

      if (error instanceof ResourceNotFoundError) {
        return c.json({ error: (error as Error).message }, 404);
      }

      if (error instanceof UnauthorizedOperationError) {
        return c.json({ error: (error as Error).message }, 403);
      }

      if (error instanceof InvalidOwnerError) {
        return c.json({ error: (error as Error).message }, 400);
      }

      return c.json({ error: 'Failed to transfer family ownership' }, 500);
    }
  })
  /**
   * Delete Family
   */
  .openapi(deleteFamilyRoute, async (c) => {
    const logger = c.var.logger;
    const userId = c.get('ssoUser').user_id;
    const { id } = c.req.param();

    try {
      await deleteFamilyUsecase.execute({ userId, familyId: id }, { logger });

      logger.info({ familyId: id, userId }, 'Family deleted successfully');

      return c.json({ message: 'Family deleted successfully', data: { familyId: id } }, 200);
    } catch (error) {
      logger.error({ err: error }, 'Failed to delete family');

      if (error instanceof ResourceNotFoundError) {
        return c.json({ error: (error as Error).message }, 404);
      }

      return c.json({ error: 'Failed to delete family' }, 500);
    }
  });

export default router;
