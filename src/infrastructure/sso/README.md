# SSO Service

Clean architecture implementation of SSO integration using `@rshelekhov/sso-sdk`.

## Architecture

```
src/
├── domain/
│   ├── ports/
│   │   └── sso.port.ts          # Interface (contract)
│   └── entities/
│       └── user.entity.ts        # Domain entity
└── infrastructure/
    └── sso/
        ├── sso.service.ts        # Implementation (adapter)
        ├── client.ts             # Configuration & initialization
        └── index.ts              # Public API
```

## Usage

### 1. Initialization (done in `client.ts`)

The SSO service is initialized at application startup:

```typescript
import { initializeSSOService } from '@/infrastructure/sso';

const ssoService = initializeSSOService({
  baseUrl: 'http://localhost:8080',
  clientId: 'remedy-backend',
  publicUrls: {
    emailVerification: 'http://localhost:3000/verify-email',
    passwordReset: 'http://localhost:3000/reset-password',
  },
});
```

### 2. Using in your application code

```typescript
import { getSSOService } from '@/infrastructure/sso';
import type { DeviceContext } from '@/infrastructure/sso';

// Extract device context from HTTP request
const deviceContext: DeviceContext = {
  platform: 'WEB',
  clientIP: req.ip || '0.0.0.0',
  userAgent: req.headers['user-agent'] || 'unknown',
};

const ssoService = getSSOService();

// Register a new user
const { userId, tokens } = await ssoService.register(
  'user@example.com',
  'password123',
  'John Doe',
  deviceContext
);

// Login
const tokens = await ssoService.login(
  'user@example.com',
  'password123',
  deviceContext
);

// Get user profile
const user = await ssoService.getProfile(tokens.accessToken);

// Refresh tokens
const newTokens = await ssoService.refreshTokens(
  tokens.refreshToken,
  deviceContext
);

// Logout
await ssoService.logout(tokens.accessToken, deviceContext);
```

### 3. Available Operations

#### Authentication
- `register(email, password, name, deviceContext)` - Register new user
- `login(email, password, deviceContext)` - Login user
- `logout(accessToken, deviceContext)` - Logout user
- `refreshTokens(refreshToken, deviceContext)` - Refresh access token
- `isTokenExpired(expiresAt)` - Check if token is expired

#### Email & Password
- `verifyEmail(token)` - Verify email using token from email link
- `requestPasswordReset(email)` - Send password reset email
- `changePassword(token, newPassword)` - Change password using reset token

#### User Profile
- `getProfile(accessToken)` - Get authenticated user profile
- `updateProfile(accessToken, updates)` - Update user profile
- `deleteAccount(accessToken)` - Delete user account

## Benefits of this architecture

1. **Dependency Inversion**: Domain layer depends on interface, not implementation
2. **Testability**: Easy to mock `ISSOService` for testing
3. **Flexibility**: Can swap SSO providers without changing domain logic
4. **Type Safety**: Full TypeScript support with proper types
5. **Clean Separation**: Infrastructure concerns isolated from business logic

## Testing

To test your code that uses SSO, create a mock implementation:

```typescript
class MockSSOService implements ISSOService {
  async register() {
    return {
      userId: 'test-user-id',
      tokens: {
        accessToken: 'mock-token',
        refreshToken: 'mock-refresh',
        expiresAt: new Date().toISOString()
      }
    };
  }

  async login() {
    return {
      accessToken: 'mock-token',
      refreshToken: 'mock-refresh',
      expiresAt: new Date().toISOString()
    };
  }

  // ... implement other methods
}
```
