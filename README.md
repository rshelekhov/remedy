# Remedy

Family health records management API with SSO authentication.

## Tech Stack

- **Runtime:** [Bun](https://bun.sh)
- **Framework:** [Hono](https://hono.dev) with OpenAPI/Swagger
- **Database:** PostgreSQL with [Prisma ORM](https://prisma.io)
- **Authentication:** SSO via [@rshelekhov/sso-sdk](https://github.com/rshelekhov/sso-sdk)
- **Storage:** AWS S3 for file uploads
- **Validation:** Zod schemas
- **Logging:** Pino
- **Code Quality:** Biome (linting & formatting)

## Features

- **Family Management** - Create and manage family health records
- **Member Profiles** - Track family members with demographics and relationships
- **Medical Visits** - Record doctor visits with diagnoses and treatments
- **Medications** - Manage prescriptions and medication history
- **Allergies** - Track allergies with severity levels
- **File Uploads** - Store medical documents (lab results, prescriptions, imaging) in S3
- **SSO Authentication** - Secure authentication with external SSO service
- **OpenAPI Documentation** - Auto-generated API docs with Swagger UI

## Quick Start

```bash
# Install dependencies
bun install

# Run database migrations
bun run db:migrate

# Start development server
bun run dev

# View API documentation
open http://localhost:3000/api/openapi
```

## License

MIT
