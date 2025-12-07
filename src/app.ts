import { swaggerUI } from '@hono/swagger-ui';
import { OpenAPIHono } from '@hono/zod-openapi';
import { requestId } from 'hono/request-id';
import { pinoLogger } from 'hono-pino';
import { config } from './config/config';
import { authMiddleware } from './infrastructure/middleware/auth.middleware';
import { logger } from './lib/logger';
import authRouter from './routes/auth';
import familyRouter from './routes/family';
import filesRouter from './routes/files';
import medicationsRouter from './routes/medications';
import membersRouter from './routes/members';
import userRouter from './routes/user';
import visitsRouter from './routes/visits';
import type { AppVariables } from './types/hono.types';

// Create separate route groups to handle auth middleware without breaking type inference

// Public routes (no authentication required)
const publicRoutes = new OpenAPIHono<{ Variables: AppVariables }>()
  .route('/auth', authRouter)
  .get('/hello', (c) => c.text(`Hello!`));

// Protected routes (require authentication)
// Apply middleware BEFORE routes to ensure it intercepts requests
const protectedRoutes = new OpenAPIHono<{ Variables: AppVariables }>()
  .use('*', authMiddleware) // Apply to all protected routes
  .route('/user', userRouter)
  .route('/families', familyRouter)
  .route('/families', membersRouter)
  .route('/families', visitsRouter)
  .route('/families', medicationsRouter)
  .route('/families', filesRouter);

// Merge route groups for type export
const apiRoutesBase = new OpenAPIHono<{ Variables: AppVariables }>()
  .route('/', publicRoutes)
  .route('/', protectedRoutes);

// Capture the type for export BEFORE adding doc
// .doc() changes the type and can break RPC client inference
type ApiRoutesType = typeof apiRoutesBase;

// Create a reference for runtime use
const apiRoutes = apiRoutesBase;

// OpenAPI documentation
apiRoutes.doc('/openapi.json', {
  openapi: '3.1.0',
  info: {
    version: '0.1.0',
    title: 'Remedy API',
    description: 'Family health records management API with SSO authentication',
  },
  servers: [
    {
      url: `http://localhost:${config.port}/api`,
      description: config.isProd ? 'Production server' : 'Development server',
    },
  ],
});

// Swagger UI
apiRoutes.get('/openapi', swaggerUI({ url: '/api/openapi.json' }));

// Create main app
const app = new OpenAPIHono<{ Variables: AppVariables }>()
  // Health check endpoint (no auth required)
  .get('/health', (c) => {
    return c.json({ status: 'ok', timestamp: new Date().toISOString() });
  })
  // Add global middleware for API routes
  .use('/api/*', requestId())
  .use('/api/*', pinoLogger({ pino: logger }))
  // Mount API routes
  .route('/api', apiRoutes);

export default app;
// Export the API routes type for RPC client (without the /api prefix nesting)
// This is needed because Hono's RPC client doesn't handle nested .route() well
// We use the captured type from before middleware was added
export type AppType = ApiRoutesType;
