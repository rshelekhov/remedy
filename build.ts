/**
 * Bun Build Configuration
 *
 * This file configures the build process for the application, including:
 * - Bundling with bun-plugin-pino for proper Pino logger support
 * - TypeScript compilation
 * - Production optimizations (minification based on environment)
 */

import pinoPlugin from 'bun-plugin-pino';
import { config } from './src/config/config';

await Bun.build({
  entrypoints: ['./src/index.ts'],
  outdir: './dist',
  target: 'bun',
  format: 'esm',
  sourcemap: 'external',
  minify: config.isProd, // Minify in production, keep readable in dev
  plugins: [
    pinoPlugin({
      transports: [], // Let hono-pino handle transports
    }),
  ],
  external: [
    // External dependencies that shouldn't be bundled
    '@prisma/client',
    '.prisma/client',
  ],
});

console.log('✔ Build completed successfully');
