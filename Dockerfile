# Dockerfile for Remedy Application

FROM oven/bun:1 AS base
WORKDIR /app

# Install dependencies
FROM base AS install
RUN mkdir -p /temp/prod
COPY package.json bun.lock /temp/prod/
COPY prisma.config.ts /temp/prod/
COPY src/infrastructure/prisma/schema.prisma /temp/prod/src/infrastructure/prisma/schema.prisma
# Set placeholder DATABASE_URL for Prisma generation during install
ENV DATABASE_URL="postgresql://placeholder:placeholder@localhost:5432/placeholder"
RUN cd /temp/prod && bun install --frozen-lockfile --production

# Copy source code (Prisma client already generated during install)
FROM base AS prerelease
COPY --from=install /temp/prod/node_modules node_modules
COPY . .

# Production image
FROM base AS release
COPY --from=install /temp/prod/node_modules node_modules
COPY --from=prerelease /app/src /app/src
COPY --from=prerelease /app/node_modules/.prisma /app/node_modules/.prisma
COPY --from=prerelease /app/package.json /app/package.json

# Expose port
EXPOSE 3001

# Health check
HEALTHCHECK --interval=10s --timeout=3s --start-period=10s --retries=3 \
  CMD bun -e "fetch('http://localhost:3001/health').then(r => r.ok ? process.exit(0) : process.exit(1))" || exit 1

# Start the application
ENTRYPOINT ["bun", "run", "src/index.ts"]
