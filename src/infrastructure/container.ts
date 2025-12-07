/**
 * Dependency Injection Container
 * Wires up all dependencies
 *
 * This creates instances of:
 * - Prisma Client (infrastructure)
 * - SSO Service (infrastructure)
 * - Use Cases (application logic)
 */

import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';
import { config } from '../config/config';
import { ChangePasswordUsecase } from '../usecases/auth/change-password.usecase';
import { LoginUserUsecase } from '../usecases/auth/login-user.usecase';
import { RefreshTokensUsecase } from '../usecases/auth/refresh-tokens.usecase';
import { RegisterUserUsecase } from '../usecases/auth/register-user.usecase';
import { RequestPasswordResetUsecase } from '../usecases/auth/request-password-reset.usecase';
import { VerifyEmailUsecase } from '../usecases/auth/verify-email.usecase';
import { CreateFamilyUsecase } from '../usecases/family/create-family.usecase';
import { DeleteFamilyUsecase } from '../usecases/family/delete-family.usecase';
import { GetFamilyUsecase } from '../usecases/family/get-family.usecase';
import { TransferOwnershipUsecase } from '../usecases/family/transfer-ownership.usecase';
import { UpdateFamilyUsecase } from '../usecases/family/update-family.usecase';
import { DeleteFileUsecase } from '../usecases/file/delete-file.usecase';
import { GetFileUsecase } from '../usecases/file/get-file.usecase';
import { ListVisitFilesUsecase } from '../usecases/file/list-visit-files.usecase';
import { UploadFileUsecase } from '../usecases/file/upload-file.usecase';
import { AddMedicationUsecase } from '../usecases/medication/add-medication.usecase';
import { DeleteMedicationUsecase } from '../usecases/medication/delete-medication.usecase';
import { GetAllMemberMedicationsUsecase } from '../usecases/medication/get-all-member-medications.usecase';
import { GetAllVisitMedicationsUsecase } from '../usecases/medication/get-all-visit-medications.usecase';
import { GetMedicationUsecase } from '../usecases/medication/get-medication.usecase';
import { UpdateMedicationUsecase } from '../usecases/medication/update-medication.usecase';
import { AddMemberUsecase } from '../usecases/member/add-member.usecase';
import { DeleteMemberUsecase } from '../usecases/member/delete-member.usecase';
import { GetAllMembersUsecase } from '../usecases/member/get-all-members.usecase';
import { GetMemberUsecase } from '../usecases/member/get-member.usecase';
import { UpdateMemberUsecase } from '../usecases/member/update-member.usecase';
import { DeleteUserUsecase } from '../usecases/user/delete-user.usecase';
import { ForceDeleteUserUsecase } from '../usecases/user/force-delete-user.usecase';
import { GetUserProfileUsecase } from '../usecases/user/get-user-profile.usecase';
import { LogoutUserUsecase } from '../usecases/user/logout-user.usecase';
import { AddVisitUsecase } from '../usecases/visit/add-visit.usecase';
import { DeleteVisitUsecase } from '../usecases/visit/delete-visit.usecase';
import { GetAllMemberVisitsUsecase } from '../usecases/visit/get-all-member-visits.usecase';
import { GetVisitUsecase } from '../usecases/visit/get-visit.usecase';
import { UpdateVisitUsecase } from '../usecases/visit/update-visit.usecase';
import { AuthorizationService } from './authorization';
import { getSSOService } from './sso';
import { S3FileStorageService } from './storage';

/**
 * Initialize Prisma Client with PostgreSQL adapter
 * Required for Prisma 7.0+ with Bun runtime
 */
const adapter = new PrismaPg({
  connectionString: config.database.url,
});

const prisma = new PrismaClient({ adapter });

/**
 * Get SSO Service (already initialized in sso/client.ts)
 */
const ssoService = getSSOService();

/**
 * Initialize S3 File Storage Service
 */
const s3FileStorageService = new S3FileStorageService(config.s3);

/**
 * Initialize Authorization Service
 */
const authorizationService = new AuthorizationService(prisma);

/**
 * Initialize and Export Use Cases
 */
export const registerUserUsecase = new RegisterUserUsecase(ssoService, prisma);
export const loginUserUseCase = new LoginUserUsecase(ssoService, prisma);
export const verifyEmailUsecase = new VerifyEmailUsecase(ssoService);
export const requestPasswordResetUsecase = new RequestPasswordResetUsecase(ssoService);
export const changePasswordUsecase = new ChangePasswordUsecase(ssoService);
export const refreshTokensUsecase = new RefreshTokensUsecase(ssoService);
export const logoutUserUsecase = new LogoutUserUsecase(ssoService);
export const getUserProfileUsecase = new GetUserProfileUsecase(ssoService);
export const deleteUserUsecase = new DeleteUserUsecase(ssoService, prisma);
export const forceDeleteUserUsecase = new ForceDeleteUserUsecase(
  ssoService,
  prisma,
  s3FileStorageService
);

export const createFamilyUsecase = new CreateFamilyUsecase(prisma);
export const getFamilyUsecase = new GetFamilyUsecase(prisma);
export const updateFamilyUsecase = new UpdateFamilyUsecase(prisma);
export const deleteFamilyUsecase = new DeleteFamilyUsecase(prisma, s3FileStorageService);
export const transferOwnershipUsecase = new TransferOwnershipUsecase(prisma);

export const addMemberUsecase = new AddMemberUsecase(prisma);
export const getMemberUsecase = new GetMemberUsecase(prisma, authorizationService);
export const getAllMembersUsecase = new GetAllMembersUsecase(prisma, authorizationService);
export const updateMemberUsecase = new UpdateMemberUsecase(prisma);
export const deleteMemberUsecase = new DeleteMemberUsecase(prisma, s3FileStorageService);

export const addVisitUsecase = new AddVisitUsecase(prisma);
export const getVisitUsecase = new GetVisitUsecase(prisma, authorizationService);
export const getAllMemberVisitsUsecase = new GetAllMemberVisitsUsecase(
  prisma,
  authorizationService
);
export const updateVisitUsecase = new UpdateVisitUsecase(prisma, authorizationService);
export const deleteVisitUsecase = new DeleteVisitUsecase(
  prisma,
  authorizationService,
  s3FileStorageService
);

export const addMedicationUsecase = new AddMedicationUsecase(prisma, authorizationService);
export const getMedicationUsecase = new GetMedicationUsecase(prisma, authorizationService);
export const getAllMemberMedicationsUsecase = new GetAllMemberMedicationsUsecase(
  prisma,
  authorizationService
);
export const getAllVisitMedicationsUsecase = new GetAllVisitMedicationsUsecase(
  prisma,
  authorizationService
);
export const updateMedicationUsecase = new UpdateMedicationUsecase(prisma, authorizationService);
export const deleteMedicationUsecase = new DeleteMedicationUsecase(prisma, authorizationService);

export const listVisitFilesUsecase = new ListVisitFilesUsecase(prisma, authorizationService);
export const uploadFileUsecase = new UploadFileUsecase(
  prisma,
  authorizationService,
  s3FileStorageService
);
export const getFileUsecase = new GetFileUsecase(
  prisma,
  authorizationService,
  s3FileStorageService
);
export const deleteFileUsecase = new DeleteFileUsecase(
  prisma,
  authorizationService,
  s3FileStorageService
);

/**
 * Export Prisma client for direct use if needed
 */
export { prisma };
