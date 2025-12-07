import { OpenAPIHono } from '@hono/zod-openapi';
import { ResourceAlreadyExistsError, ResourceNotFoundError } from '../errors/domain-errors';
import {
  addMemberUsecase,
  deleteMemberUsecase,
  getAllMembersUsecase,
  getMemberUsecase,
  updateMemberUsecase,
} from '../infrastructure/container';
import type { AppVariables } from '../types/hono.types';
import {
  addMemberRoute,
  deleteMemberRoute,
  getAllMembersRoute,
  getMemberRoute,
  updateMemberRoute,
} from './openapi/members.routes';

const router = new OpenAPIHono<{ Variables: AppVariables }>()
  /**
   * Add Family Member
   */
  .openapi(addMemberRoute, async (c) => {
    const logger = c.var.logger;
    const ownerId = c.get('ssoUser').user_id;
    const familyId = c.req.param('id');
    const { name, dateOfBirth, gender, relationship, userId: memberUserId } = c.req.valid('json');

    try {
      const result = await addMemberUsecase.execute(
        { familyId, ownerId, name, dateOfBirth, gender, relationship, memberUserId },
        { logger }
      );

      logger.info(
        { memberId: result.member.id, familyId, ownerId },
        'Family member added successfully'
      );

      return c.json(
        { message: 'Family member added successfully', data: { member: result.member } },
        201
      );
    } catch (error) {
      logger.error({ err: error }, 'Failed to add family member');

      if (error instanceof ResourceNotFoundError) {
        return c.json({ error: (error as Error).message }, 404);
      }

      if (error instanceof ResourceAlreadyExistsError) {
        return c.json({ error: (error as Error).message }, 409);
      }

      return c.json({ error: 'Failed to add family member' }, 500);
    }
  })
  /**
   * Get Family Member Details
   */
  .openapi(getMemberRoute, async (c) => {
    const logger = c.var.logger;
    const userId = c.get('ssoUser').user_id;
    const familyId = c.req.param('id');
    const memberId = c.req.param('memberId');

    try {
      const result = await getMemberUsecase.execute({ userId, familyId, memberId }, { logger });

      logger.info(
        { memberId: result.member.id, familyId, userId },
        'Family member details retrieved successfully'
      );

      return c.json(
        {
          message: 'Family member details retrieved successfully',
          data: { member: result.member },
        },
        200
      );
    } catch (error) {
      logger.error({ err: error }, 'Failed to get family member details');

      if (error instanceof ResourceNotFoundError) {
        return c.json({ error: (error as Error).message }, 404);
      }

      return c.json({ error: 'Failed to get family member details' }, 500);
    }
  })
  /**
   * Get All Family Members
   */
  .openapi(getAllMembersRoute, async (c) => {
    const logger = c.var.logger;
    const userId = c.get('ssoUser').user_id;
    const familyId = c.req.param('id');

    try {
      const result = await getAllMembersUsecase.execute({ userId, familyId }, { logger });

      logger.info({ familyId, userId }, 'All family members retrieved successfully');

      return c.json(
        {
          message: 'All family members retrieved successfully',
          data: { members: result.members },
        },
        200
      );
    } catch (error) {
      logger.error({ err: error }, 'Failed to get all family members');

      if (error instanceof ResourceNotFoundError) {
        return c.json({ error: (error as Error).message }, 404);
      }

      return c.json({ error: 'Failed to get all family members' }, 500);
    }
  })
  /**
   * Update Family Member
   */
  .openapi(updateMemberRoute, async (c) => {
    const logger = c.var.logger;
    const userId = c.get('ssoUser').user_id;
    const { id: familyId, memberId } = c.req.param();
    const body = c.req.valid('json');

    try {
      const result = await updateMemberUsecase.execute(
        {
          userId,
          familyId,
          memberId,
          name: body.name,
          dateOfBirth: body.dateOfBirth,
          gender: body.gender,
          relationship: body.relationship,
          memberUserId: body.userId,
        },
        { logger }
      );

      logger.info({ memberId, familyId }, 'Family member updated successfully');

      return c.json(
        { message: 'Family member updated successfully', data: { member: result.member } },
        200
      );
    } catch (error) {
      logger.error({ err: error }, 'Failed to update family member');

      if (error instanceof ResourceNotFoundError) {
        return c.json({ error: (error as Error).message }, 404);
      }

      if (error instanceof ResourceAlreadyExistsError) {
        return c.json({ error: (error as Error).message }, 409);
      }

      return c.json({ error: 'Failed to update family member' }, 500);
    }
  })
  /**
   * Delete Family Member
   */
  .openapi(deleteMemberRoute, async (c) => {
    const logger = c.var.logger;
    const userId = c.get('ssoUser').user_id;
    const familyId = c.req.param('id');
    const memberId = c.req.param('memberId');

    try {
      await deleteMemberUsecase.execute({ userId, familyId, memberId }, { logger });

      logger.info({ memberId, familyId }, 'Family member deleted successfully');

      return c.json(
        { message: 'Family member deleted successfully', data: { memberId: memberId } },
        200
      );
    } catch (error) {
      logger.error({ err: error }, 'Failed to delete family member');

      if (error instanceof ResourceNotFoundError) {
        return c.json({ error: (error as Error).message }, 404);
      }

      return c.json({ error: 'Failed to delete family member' }, 500);
    }
  });

export default router;
