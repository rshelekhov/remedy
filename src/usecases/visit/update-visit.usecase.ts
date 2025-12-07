import type { PrismaClient, Visit } from '@prisma/client';
import type { PinoLogger } from 'hono-pino';
import type { AuthorizationService } from '../../infrastructure/authorization';

export class UpdateVisitUsecase {
  constructor(
    readonly prisma: PrismaClient,
    readonly authorizationService: AuthorizationService
  ) {}

  /**
   * Execute update visit
   *
   * Flow:
   * 1. Fetch visit and verify it belongs to the requested family
   * 2. Verify that userId is family owner OR the specific member the visit belongs to
   * 3. Update visit with provided fields
   * 4. Return updated visit data
   */
  async execute(
    request: {
      userId: string;
      familyId: string;
      visitId: string;
      visitDate?: string;
      chiefComplaint?: string;
      diagnosis?: string | null;
      treatment?: string | null;
      doctorName?: string | null;
      clinicName?: string | null;
      notes?: string | null;
    },
    context: { logger: PinoLogger }
  ): Promise<{ visit: Visit }> {
    const logger = context.logger.assign({ usecase: 'UpdateVisitUsecase.execute' });

    // Step 1: Fetch visit and verify it belongs to the requested family
    const visit = await this.authorizationService.fetchAndVerifyVisit(
      request.visitId,
      request.familyId,
      logger
    );

    // Step 2: Check authorization - user must be family owner OR the specific member
    await this.authorizationService.verifyOwnerOrSpecificMember(
      request.userId,
      visit.familyMember.family.ownerId,
      visit.familyMember.userId,
      'update this visit',
      logger
    );

    logger.info({ visitId: request.visitId, familyId: request.familyId }, 'Updating visit');

    // Step 4: Build update data with only provided fields
    const updateData: {
      visitDate?: Date;
      chiefComplaint?: string;
      diagnosis?: string | null;
      treatment?: string | null;
      doctorName?: string | null;
      clinicName?: string | null;
      notes?: string | null;
    } = {};

    if (request.visitDate !== undefined) {
      updateData.visitDate = new Date(request.visitDate);
    }
    if (request.chiefComplaint !== undefined) {
      updateData.chiefComplaint = request.chiefComplaint;
    }
    if (request.diagnosis !== undefined) {
      updateData.diagnosis = request.diagnosis;
    }
    if (request.treatment !== undefined) {
      updateData.treatment = request.treatment;
    }
    if (request.doctorName !== undefined) {
      updateData.doctorName = request.doctorName;
    }
    if (request.clinicName !== undefined) {
      updateData.clinicName = request.clinicName;
    }
    if (request.notes !== undefined) {
      updateData.notes = request.notes;
    }

    // Step 5: Update visit in database
    const updatedVisit = await this.prisma.visit.update({
      where: { id: request.visitId },
      data: updateData,
    });

    logger.info({ visitId: updatedVisit.id }, 'Visit updated successfully');

    return { visit: updatedVisit };
  }
}
