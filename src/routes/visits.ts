import { OpenAPIHono } from '@hono/zod-openapi';
import { ResourceNotFoundError, UnauthorizedOperationError } from '../errors/domain-errors';
import {
  addVisitUsecase,
  deleteVisitUsecase,
  getAllMemberVisitsUsecase,
  getVisitUsecase,
  updateVisitUsecase,
} from '../infrastructure/container';
import type { AppVariables } from '../types/hono.types';
import {
  addVisitRoute,
  deleteVisitRoute,
  getAllMemberVisitsRoute,
  getVisitRoute,
  updateVisitRoute,
} from './openapi/visits.routes';

const router = new OpenAPIHono<{ Variables: AppVariables }>()
  /**
   * Add Visit for Family Member
   */
  .openapi(addVisitRoute, async (c) => {
    const logger = c.var.logger;
    const userId = c.get('ssoUser').user_id;
    const familyId = c.req.param('id');
    const memberId = c.req.param('memberId');
    const { visitDate, chiefComplaint, diagnosis, treatment, doctorName, clinicName, notes } =
      c.req.valid('json');

    try {
      const result = await addVisitUsecase.execute(
        {
          userId,
          familyId,
          memberId,
          visitDate,
          chiefComplaint,
          diagnosis,
          treatment,
          doctorName,
          clinicName,
          notes,
        },
        { logger }
      );

      logger.info(
        { visitId: result.visit.id, memberId, familyId, userId },
        'Visit added successfully'
      );

      return c.json({ message: 'Visit added successfully', data: { visit: result.visit } }, 201);
    } catch (error) {
      logger.error({ err: error }, 'Failed to add visit');

      if (error instanceof UnauthorizedOperationError) {
        return c.json({ error: (error as Error).message }, 403);
      }

      if (error instanceof ResourceNotFoundError) {
        return c.json({ error: (error as Error).message }, 404);
      }

      return c.json({ error: 'Failed to add visit' }, 500);
    }
  })
  /**
   * Get Visit Details
   */
  .openapi(getVisitRoute, async (c) => {
    const logger = c.var.logger;
    const userId = c.get('ssoUser').user_id;
    const familyId = c.req.param('id');
    const visitId = c.req.param('visitId');

    try {
      const result = await getVisitUsecase.execute({ userId, familyId, visitId }, { logger });

      logger.info(
        { visitId: result.visit.id, familyId, userId },
        'Visit details retrieved successfully'
      );

      return c.json(
        { message: 'Visit details retrieved successfully', data: { visit: result.visit } },
        200
      );
    } catch (error) {
      logger.error({ err: error }, 'Failed to get visit details');

      if (error instanceof UnauthorizedOperationError) {
        return c.json({ error: (error as Error).message }, 403);
      }

      if (error instanceof ResourceNotFoundError) {
        return c.json({ error: (error as Error).message }, 404);
      }

      return c.json({ error: 'Failed to get visit details' }, 500);
    }
  })
  /**
   * Get All Visits for Family Member
   */
  .openapi(getAllMemberVisitsRoute, async (c) => {
    const logger = c.var.logger;
    const userId = c.get('ssoUser').user_id;
    const familyId = c.req.param('id');
    const memberId = c.req.param('memberId');

    try {
      const result = await getAllMemberVisitsUsecase.execute(
        { userId, familyId, memberId },
        { logger }
      );

      logger.info(
        { memberId, familyId, userId, count: result.visits.length },
        'All member visits retrieved successfully'
      );

      return c.json(
        { message: 'All member visits retrieved successfully', data: { visits: result.visits } },
        200
      );
    } catch (error) {
      logger.error({ err: error }, 'Failed to get all member visits');

      if (error instanceof UnauthorizedOperationError) {
        return c.json({ error: (error as Error).message }, 403);
      }

      if (error instanceof ResourceNotFoundError) {
        return c.json({ error: (error as Error).message }, 404);
      }

      return c.json({ error: 'Failed to get all member visits' }, 500);
    }
  })
  /**
   * Update Visit for Family Member
   */
  .openapi(updateVisitRoute, async (c) => {
    const logger = c.var.logger;
    const userId = c.get('ssoUser').user_id;
    const familyId = c.req.param('id');
    const visitId = c.req.param('visitId');
    const { visitDate, chiefComplaint, diagnosis, treatment, doctorName, clinicName, notes } =
      c.req.valid('json');

    try {
      const result = await updateVisitUsecase.execute(
        {
          userId,
          familyId,
          visitId,
          visitDate,
          chiefComplaint,
          diagnosis,
          treatment,
          doctorName,
          clinicName,
          notes,
        },
        { logger }
      );

      logger.info({ visitId: result.visit.id, familyId, userId }, 'Visit updated successfully');

      return c.json({ message: 'Visit updated successfully', data: { visit: result.visit } }, 200);
    } catch (error) {
      logger.error({ err: error }, 'Failed to update visit');

      if (error instanceof UnauthorizedOperationError) {
        return c.json({ error: (error as Error).message }, 403);
      }

      if (error instanceof ResourceNotFoundError) {
        return c.json({ error: (error as Error).message }, 404);
      }

      return c.json({ error: 'Failed to update visit' }, 500);
    }
  })
  /**
   * Delete Visit for Family Member
   */
  .openapi(deleteVisitRoute, async (c) => {
    const logger = c.var.logger;
    const userId = c.get('ssoUser').user_id;
    const familyId = c.req.param('id');
    const visitId = c.req.param('visitId');

    try {
      await deleteVisitUsecase.execute({ userId, familyId, visitId }, { logger });

      logger.info({ visitId, familyId, userId }, 'Visit deleted successfully');

      return c.json({ message: 'Visit deleted successfully' }, 200);
    } catch (error) {
      logger.error({ err: error }, 'Failed to delete visit');

      if (error instanceof UnauthorizedOperationError) {
        return c.json({ error: (error as Error).message }, 403);
      }

      if (error instanceof ResourceNotFoundError) {
        return c.json({ error: (error as Error).message }, 404);
      }

      return c.json({ error: 'Failed to delete visit' }, 500);
    }
  });

export default router;
