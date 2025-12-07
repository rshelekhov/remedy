import { OpenAPIHono } from '@hono/zod-openapi';
import { ResourceNotFoundError, UnauthorizedOperationError } from '../errors/domain-errors';
import {
  addMedicationUsecase,
  deleteMedicationUsecase,
  getAllMemberMedicationsUsecase,
  getAllVisitMedicationsUsecase,
  getMedicationUsecase,
  updateMedicationUsecase,
} from '../infrastructure/container';
import type { AppVariables } from '../types/hono.types';
import {
  addMedicationRoute,
  deleteMedicationRoute,
  getAllMemberMedicationsRoute,
  getAllVisitMedicationsRoute,
  getMedicationRoute,
  updateMedicationRoute,
} from './openapi/medications.routes';

const router = new OpenAPIHono<{ Variables: AppVariables }>()
  /**
   * Add Medication for Family Member
   */
  .openapi(addMedicationRoute, async (c) => {
    const logger = c.var.logger;
    const userId = c.get('ssoUser').user_id;
    const familyId = c.req.param('id');
    const memberId = c.req.param('memberId');
    const {
      visitId,
      name,
      dosage,
      frequency,
      startDate,
      endDate,
      prescribingDoctor,
      notes,
      isActive,
    } = c.req.valid('json');

    try {
      const result = await addMedicationUsecase.execute(
        {
          userId,
          familyId,
          memberId,
          visitId,
          name,
          dosage,
          frequency,
          startDate,
          endDate,
          prescribingDoctor,
          notes,
          isActive,
        },
        { logger }
      );

      logger.info(
        { medicationId: result.medication.id, memberId, familyId, userId },
        'Medication added successfully'
      );

      return c.json(
        { message: 'Medication added successfully', data: { medication: result.medication } },
        201
      );
    } catch (error) {
      logger.error({ err: error }, 'Failed to add medication');

      if (error instanceof UnauthorizedOperationError) {
        return c.json({ error: (error as Error).message }, 403);
      }

      if (error instanceof ResourceNotFoundError) {
        return c.json({ error: (error as Error).message }, 404);
      }

      return c.json({ error: 'Failed to add medication' }, 500);
    }
  })
  /**
   * Get Medication Details
   */
  .openapi(getMedicationRoute, async (c) => {
    const logger = c.var.logger;
    const userId = c.get('ssoUser').user_id;
    const familyId = c.req.param('id');
    const medicationId = c.req.param('medicationId');

    try {
      const result = await getMedicationUsecase.execute(
        { userId, familyId, medicationId },
        { logger }
      );

      logger.info(
        { medicationId: result.medication.id, familyId, userId },
        'Medication details retrieved successfully'
      );

      return c.json(
        {
          message: 'Medication details retrieved successfully',
          data: { medication: result.medication },
        },
        200
      );
    } catch (error) {
      logger.error({ err: error }, 'Failed to get medication details');

      if (error instanceof UnauthorizedOperationError) {
        return c.json({ error: (error as Error).message }, 403);
      }

      if (error instanceof ResourceNotFoundError) {
        return c.json({ error: (error as Error).message }, 404);
      }

      return c.json({ error: 'Failed to get medication details' }, 500);
    }
  })
  /**
   * Get All Medications for Family Member
   */
  .openapi(getAllMemberMedicationsRoute, async (c) => {
    const logger = c.var.logger;
    const userId = c.get('ssoUser').user_id;
    const familyId = c.req.param('id');
    const memberId = c.req.param('memberId');

    try {
      const result = await getAllMemberMedicationsUsecase.execute(
        { userId, familyId, memberId },
        { logger }
      );

      logger.info(
        { memberId, familyId, userId, count: result.medications.length },
        'All member medications retrieved successfully'
      );

      return c.json(
        {
          message: 'All member medications retrieved successfully',
          data: { medications: result.medications },
        },
        200
      );
    } catch (error) {
      logger.error({ err: error }, 'Failed to get all member medications');

      if (error instanceof UnauthorizedOperationError) {
        return c.json({ error: (error as Error).message }, 403);
      }

      if (error instanceof ResourceNotFoundError) {
        return c.json({ error: (error as Error).message }, 404);
      }

      return c.json({ error: 'Failed to get all member medications' }, 500);
    }
  })
  /**
   * Get All Medications for Visit
   */
  .openapi(getAllVisitMedicationsRoute, async (c) => {
    const logger = c.var.logger;
    const userId = c.get('ssoUser').user_id;
    const familyId = c.req.param('id');
    const visitId = c.req.param('visitId');

    try {
      const result = await getAllVisitMedicationsUsecase.execute(
        { userId, familyId, visitId },
        { logger }
      );

      logger.info(
        { visitId, familyId, userId, count: result.medications.length },
        'All visit medications retrieved successfully'
      );

      return c.json(
        {
          message: 'All visit medications retrieved successfully',
          data: { medications: result.medications },
        },
        200
      );
    } catch (error) {
      logger.error({ err: error }, 'Failed to get all visit medications');

      if (error instanceof UnauthorizedOperationError) {
        return c.json({ error: (error as Error).message }, 403);
      }

      if (error instanceof ResourceNotFoundError) {
        return c.json({ error: (error as Error).message }, 404);
      }

      return c.json({ error: 'Failed to get all visit medications' }, 500);
    }
  })
  /**
   * Update Medication
   */
  .openapi(updateMedicationRoute, async (c) => {
    const logger = c.var.logger;
    const userId = c.get('ssoUser').user_id;
    const familyId = c.req.param('id');
    const medicationId = c.req.param('medicationId');
    const { name, dosage, frequency, startDate, endDate, prescribingDoctor, notes, isActive } =
      c.req.valid('json');

    try {
      const result = await updateMedicationUsecase.execute(
        {
          userId,
          familyId,
          medicationId,
          name,
          dosage,
          frequency,
          startDate,
          endDate,
          prescribingDoctor,
          notes,
          isActive,
        },
        { logger }
      );

      logger.info(
        { medicationId: result.medication.id, familyId, userId },
        'Medication updated successfully'
      );

      return c.json(
        { message: 'Medication updated successfully', data: { medication: result.medication } },
        200
      );
    } catch (error) {
      logger.error({ err: error }, 'Failed to update medication');

      if (error instanceof UnauthorizedOperationError) {
        return c.json({ error: (error as Error).message }, 403);
      }

      if (error instanceof ResourceNotFoundError) {
        return c.json({ error: (error as Error).message }, 404);
      }

      return c.json({ error: 'Failed to update medication' }, 500);
    }
  })
  /**
   * Delete Medication
   */
  .openapi(deleteMedicationRoute, async (c) => {
    const logger = c.var.logger;
    const userId = c.get('ssoUser').user_id;
    const familyId = c.req.param('id');
    const medicationId = c.req.param('medicationId');

    try {
      await deleteMedicationUsecase.execute({ userId, familyId, medicationId }, { logger });

      logger.info({ medicationId, familyId, userId }, 'Medication deleted successfully');

      return c.json({ message: 'Medication deleted successfully' }, 200);
    } catch (error) {
      logger.error({ err: error }, 'Failed to delete medication');

      if (error instanceof UnauthorizedOperationError) {
        return c.json({ error: (error as Error).message }, 403);
      }

      if (error instanceof ResourceNotFoundError) {
        return c.json({ error: (error as Error).message }, 404);
      }

      return c.json({ error: 'Failed to delete medication' }, 500);
    }
  });

export default router;
